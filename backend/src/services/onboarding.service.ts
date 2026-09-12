import { Prisma } from "@prisma/client";
import {
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  ONBOARDING_BUDGETS,
  ONBOARDING_CLIMATES,
  ONBOARDING_COMPANIONS,
  ONBOARDING_COUNTRIES,
  ONBOARDING_INTEREST_ALIASES,
  ONBOARDING_INTEREST_MAX,
  ONBOARDING_INTEREST_MIN,
  ONBOARDING_INTERESTS,
  ONBOARDING_MUSIC,
  ONBOARDING_PLACES,
} from "../config/onboarding.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { clearAuthUserCache } from "../utils/auth-cache.js";
import type { OnboardingSaveInput } from "../validators/onboarding.validator.js";
import { destroyStoredImage, persistProfileImage } from "./upload.service.js";

const profileSelect = {
  country: true,
  department: true,
  city: true,
  neighborhood: true,
  addressReference: true,
  latitude: true,
  longitude: true,
  profileImageUrl: true,
  profileImagePublicId: true,
  profileImageType: true,
  avatarConfig: true,
  interests: true,
  companions: true,
  places: true,
  music: true,
  budget: true,
  climate: true,
  onboardingCompleted: true,
  onboardingCompletedAt: true,
  updatedAt: true,
} as const;

const completingUsers = new Set<string>();

function asNumber(value: Prisma.Decimal | null) {
  if (value == null) {
    return null;
  }
  return Number(value);
}

function normalizeList(values: string[] | undefined, allowed: readonly string[], aliases: Record<string, string> = {}) {
  if (!values) {
    return undefined;
  }
  const allowedSet = new Set(allowed);
  const next: string[] = [];
  for (const raw of values) {
    const mapped = aliases[raw] ?? raw;
    if (allowedSet.has(mapped) && !next.includes(mapped)) {
      next.push(mapped);
    }
  }
  return next;
}

export function serializeProfile(
  profile: Prisma.UserProfileGetPayload<{ select: typeof profileSelect }> | null,
) {
  if (!profile) {
    return null;
  }
  return {
    country: profile.country,
    department: profile.department,
    city: profile.city,
    neighborhood: profile.neighborhood,
    addressReference: profile.addressReference,
    latitude: asNumber(profile.latitude),
    longitude: asNumber(profile.longitude),
    profileImageUrl: profile.profileImageUrl,
    profileImagePublicId: profile.profileImagePublicId,
    profileImageType: profile.profileImageType,
    avatarConfig: normalizeAvatarConfig(profile.avatarConfig),
    interests: normalizeList(profile.interests, ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES) ?? [],
    companions: normalizeList(profile.companions, ONBOARDING_COMPANIONS) ?? [],
    places: normalizeList(profile.places, ONBOARDING_PLACES) ?? [],
    music: normalizeList(profile.music, ONBOARDING_MUSIC) ?? [],
    budget: normalizeList(profile.budget, ONBOARDING_BUDGETS) ?? [],
    climate: normalizeList(profile.climate, ONBOARDING_CLIMATES) ?? [],
    onboardingCompleted: profile.onboardingCompleted,
    onboardingCompletedAt: profile.onboardingCompletedAt,
    updatedAt: profile.updatedAt,
  };
}

export type SerializedOnboardingProfile = NonNullable<ReturnType<typeof serializeProfile>>;

export async function getOnboardingProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: profileSelect,
  });
  return serializeProfile(profile);
}

function requireComplete(
  input: OnboardingSaveInput,
  current: { profileImageUrl: string | null; profileImageType: string } | null,
) {
  if (!input.country || !ONBOARDING_COUNTRIES.includes(input.country as (typeof ONBOARDING_COUNTRIES)[number])) {
    throw ApiError.unprocessable("El país es obligatorio.");
  }
  if (!input.department?.trim() || !input.city?.trim()) {
    throw ApiError.unprocessable("El departamento y la ciudad son obligatorios.");
  }
  const interests = normalizeList(input.interests ?? [], ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES) ?? [];
  if (interests.length < ONBOARDING_INTEREST_MIN || interests.length > ONBOARDING_INTEREST_MAX) {
    throw ApiError.unprocessable(`Elige entre ${ONBOARDING_INTEREST_MIN} y ${ONBOARDING_INTEREST_MAX} intereses.`);
  }
  const companions = normalizeList(input.companions ?? [], ONBOARDING_COMPANIONS) ?? [];
  if (companions.length < 1) {
    throw ApiError.unprocessable("Elige al menos una compañía.");
  }
  const imageType = input.profileImageType ?? current?.profileImageType ?? "AVATAR";
  if (imageType === "PHOTO" && !current?.profileImageUrl) {
    throw ApiError.unprocessable("Sube una foto para continuar.");
  }
}

export async function saveOnboarding(userId: string, input: OnboardingSaveInput) {
  if (input.completed && completingUsers.has(userId)) {
    throw ApiError.conflict("Ya estamos guardando tu perfil.");
  }
  if (input.completed) {
    completingUsers.add(userId);
  }

  try {
    const interests = normalizeList(input.interests, ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES);
    if (interests && interests.length > ONBOARDING_INTEREST_MAX) {
      throw ApiError.unprocessable(`Puedes elegir hasta ${ONBOARDING_INTEREST_MAX} intereses.`);
    }

    const current = await prisma.userProfile.findUnique({ where: { userId } });
    if (input.completed) {
      requireComplete(
        {
          country: (input.country ?? current?.country ?? undefined) as OnboardingSaveInput["country"],
          department: input.department ?? current?.department ?? undefined,
          city: input.city ?? current?.city ?? undefined,
          interests: interests ?? current?.interests,
          companions: input.companions ?? current?.companions,
          profileImageType: input.profileImageType ?? current?.profileImageType,
        },
        current,
      );
    }

    const nextLatitude = input.latitude === undefined ? current?.latitude : input.latitude;
    const nextLongitude = input.longitude === undefined ? current?.longitude : input.longitude;
    const avatarConfig = normalizeAvatarConfig(input.avatarConfig ?? current?.avatarConfig);

    const keepText = (incoming: string | null | undefined, previous: string | null | undefined) => {
      if (incoming === undefined) {
        return previous;
      }
      if (incoming === null) {
        return null;
      }
      const trimmed = incoming.trim();
      return trimmed || null;
    };

    const data = {
      country: input.country ?? current?.country,
      department: keepText(input.department, current?.department),
      city: keepText(input.city, current?.city),
      neighborhood: keepText(input.neighborhood, current?.neighborhood),
      addressReference: keepText(input.addressReference, current?.addressReference),
      latitude: nextLatitude ?? null,
      longitude: nextLongitude ?? null,
      profileImageType: input.profileImageType ?? current?.profileImageType ?? "AVATAR",
      avatarConfig: avatarConfig as Prisma.InputJsonValue,
      interests: interests ?? current?.interests ?? [],
      companions: normalizeList(input.companions, ONBOARDING_COMPANIONS) ?? current?.companions ?? [],
      places: normalizeList(input.places, ONBOARDING_PLACES) ?? current?.places ?? [],
      music: normalizeList(input.music, ONBOARDING_MUSIC) ?? current?.music ?? [],
      budget: normalizeList(input.budget, ONBOARDING_BUDGETS) ?? current?.budget ?? [],
      climate: normalizeList(input.climate, ONBOARDING_CLIMATES) ?? current?.climate ?? [],
      onboardingCompleted: input.completed ? true : current?.onboardingCompleted ?? false,
      onboardingCompletedAt: input.completed ? new Date() : current?.onboardingCompletedAt,
    };

    const profile = await prisma.$transaction(async (tx) => {
      return tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
          profileImageUrl: current?.profileImageUrl,
          profileImagePublicId: current?.profileImagePublicId,
        },
        update: data,
        select: profileSelect,
      });
    });

    clearAuthUserCache(userId);
    return serializeProfile(profile);
  } finally {
    if (input.completed) {
      completingUsers.delete(userId);
    }
  }
}

export async function uploadOnboardingPhoto(userId: string, file: Express.Multer.File) {
  const stored = await persistProfileImage(file);
  const current = await prisma.userProfile.findUnique({ where: { userId } });
  const previousId = current?.profileImagePublicId;

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      profileImageUrl: stored.url,
      profileImagePublicId: stored.publicId,
      profileImageType: "PHOTO",
      avatarConfig: DEFAULT_AVATAR_CONFIG,
    },
    update: {
      profileImageUrl: stored.url,
      profileImagePublicId: stored.publicId,
      profileImageType: "PHOTO",
    },
    select: profileSelect,
  });

  if (previousId && previousId !== stored.publicId) {
    await destroyStoredImage(previousId);
  }
  clearAuthUserCache(userId);
  return serializeProfile(profile);
}

export async function deleteOnboardingPhoto(userId: string) {
  const current = await prisma.userProfile.findUnique({ where: { userId } });
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      profileImageType: "AVATAR",
      avatarConfig: DEFAULT_AVATAR_CONFIG,
    },
    update: {
      profileImageUrl: null,
      profileImagePublicId: null,
      profileImageType: "AVATAR",
    },
    select: profileSelect,
  });
  await destroyStoredImage(current?.profileImagePublicId);
  clearAuthUserCache(userId);
  return serializeProfile(profile);
}
