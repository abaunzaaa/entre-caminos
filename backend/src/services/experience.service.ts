import { Prisma, type DurationUnit, type ExperienceStatus } from "@prisma/client";
import { MIN_EXPERIENCE_IMAGES, MIN_EXPERIENCE_IMAGES_MESSAGE } from "../config/constants.js";
import { ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES } from "../config/onboarding.js";
import { prisma } from "../database/prisma.js";
import type { AuthUser } from "../models/auth-user.js";
import { ApiError } from "../utils/api-error.js";
import { resolveExperienceDuration } from "../utils/experience-duration.js";
import {
  canMutateApprovedCatalog,
  canReviewExperiences,
  publishesExperiencesDirectly,
} from "../utils/permissions.js";
import { recordAudit } from "./audit.service.js";
import {
  notifyExperienceApproved,
  notifyExperienceRejected,
  notifyExperienceSubmitted,
} from "./notification.service.js";
import {
  assertAdminCanSubmitExperiences,
  toExperienceDetailOrganization,
  toPublicOrganizationProfile,
} from "./organization-profile.service.js";

const experienceCategoryInclude = {
  orderBy: { position: "asc" as const },
  include: { category: true },
} as const;

const creatorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  organizationProfile: true,
} as const;

const experienceInterestInclude = {
  orderBy: { position: "asc" as const },
  include: { interest: true },
} as const;

const experienceInclude = {
  category: true,
  experienceCategories: experienceCategoryInclude,
  experienceInterests: experienceInterestInclude,
  locations: { orderBy: { position: "asc" as const } },
  creator: { select: creatorSelect },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

const experienceListSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  price: true,
  currency: true,
  location: true,
  latitude: true,
  longitude: true,
  externalUrl: true,
  duration: true,
  durationValue: true,
  durationUnit: true,
  availability: true,
  howToGetThere: true,
  companyContact: true,
  imageUrl: true,
  imageUrls: true,
  stampImageUrl: true,
  status: true,
  createdBy: true,
  submittedAt: true,
  rejectionReason: true,
  reviewedAt: true,
  reviewedById: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, icon: true, status: true } },
  experienceCategories: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      categoryId: true,
      category: { select: { id: true, name: true, icon: true, status: true } },
    },
  },
  creator: { select: creatorSelect },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

const publicCatalogWhere = { status: "PUBLISHED" as const };

export function toPublicExperiencePayload<T>(
  experience: T & {
    creator?: {
      id: string;
      name: string;
      email?: string | null;
      avatarUrl?: string | null;
      organizationProfile?: Parameters<typeof toPublicOrganizationProfile>[0];
    } | null;
  },
  options?: { detailOrganization?: boolean },
) {
  const organization = options?.detailOrganization
    ? toExperienceDetailOrganization(experience.creator?.organizationProfile)
    : toPublicOrganizationProfile(experience.creator?.organizationProfile);
  const { creator, ...rest } = experience;
  return {
    ...rest,
    creator: creator
      ? {
          id: creator.id,
          name: organization?.tradeName || creator.name,
          avatarUrl: organization?.logoUrl ?? creator.avatarUrl ?? null,
          organization,
        }
        : undefined,
  };
}

export async function withOrganizationPublishedCount<
  T extends {
    createdBy: string;
    creator?: { organization?: object | null } | null;
  },
>(experience: T) {
  if (!experience.creator?.organization) {
    return experience;
  }
  const publishedCount = await prisma.experience.count({
    where: { createdBy: experience.createdBy, status: "PUBLISHED" },
  });
  return {
    ...experience,
    creator: {
      ...experience.creator,
      organization: { ...experience.creator.organization, publishedCount },
    },
  };
}

function assertCanAccess(experience: { createdBy: string }, actor: AuthUser) {
  if (!canReviewExperiences(actor) && experience.createdBy !== actor.id) {
    throw ApiError.forbidden("Solo puedes consultar tus propias experiencias");
  }
}

function canManageAvailability(actor: AuthUser, experience: { createdBy: string }) {
  return canReviewExperiences(actor) || experience.createdBy === actor.id;
}

const publicCardCategorySelect = { id: true, name: true, icon: true } as const;

const publicListInclude = {
  category: { select: publicCardCategorySelect },
  experienceCategories: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      categoryId: true,
      category: { select: publicCardCategorySelect },
    },
  },
  creator: { select: creatorSelect },
} as const;

const publicPlaceSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  price: true,
  currency: true,
  location: true,
  latitude: true,
  longitude: true,
  imageUrl: true,
  imageUrls: true,
  status: true,
  createdBy: true,
  createdAt: true,
} as const;

export async function listPublicExperiences(opts?: { take?: number; skip?: number }) {
  const where = publicCatalogWhere;
  const [experiences, total] = await prisma.$transaction([
    prisma.experience.findMany({
      relationLoadStrategy: "join",
      where,
      include: publicListInclude,
      orderBy: { createdAt: "desc" },
      ...(opts?.take != null ? { take: opts.take } : {}),
      ...(opts?.skip != null ? { skip: opts.skip } : {}),
    }),
    prisma.experience.count({ where }),
  ]);
  return { experiences, total };
}

/** Tarjetas del mapa: mismas 6 más recientes, sin perfil de organización ni categorías. */
export async function listPublicMapCards(take: number) {
  return prisma.experience.findMany({
    where: publicCatalogWhere,
    select: publicPlaceSelect,
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Candidatos de “cercanas”: una fila por experiencia publicada, sin relaciones. */
export async function listPublicNearbySources() {
  return prisma.experience.findMany({
    where: publicCatalogWhere,
    select: publicPlaceSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function listAdminExperiences(
  actor: AuthUser,
  filters?: { status?: ExperienceStatus; categoryId?: string; take?: number },
) {
  const reviewer = canReviewExperiences(actor);
  return prisma.experience.findMany({
    where: {
      status: filters?.status,
      categoryId: filters?.categoryId,
      ...(reviewer ? {} : { createdBy: actor.id }),
    },
    select: experienceListSelect,
    orderBy:
      filters?.take && filters.status === "PENDING"
        ? [{ submittedAt: "desc" }, { createdAt: "desc" }]
        : filters?.take
          ? { createdAt: "desc" }
          : [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: filters?.take,
  });
}

const publicDetailInclude = {
  category: true,
  experienceCategories: experienceCategoryInclude,
  experienceInterests: experienceInterestInclude,
  locations: { orderBy: { position: "asc" as const } },
  creator: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      organizationProfile: true,
      _count: {
        select: {
          experiences: { where: { status: "PUBLISHED" as const } },
        },
      },
    },
  },
} as const;

export async function getPublishedExperience(id: string) {
  const experience = await prisma.experience.findUnique({
    relationLoadStrategy: "join",
    where: { id },
    include: publicDetailInclude,
  });
  if (!experience || experience.status !== "PUBLISHED") {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  const payload = toPublicExperiencePayload(experience, { detailOrganization: true });
  const publishedCount = experience.creator?._count.experiences;
  if (!payload.creator?.organization || publishedCount == null) {
    return payload;
  }
  return {
    ...payload,
    creator: {
      ...payload.creator,
      organization: { ...payload.creator.organization, publishedCount },
    },
  };
}

export async function requirePublishedExperienceId(id: string) {
  const experience = await prisma.experience.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!experience || experience.status !== "PUBLISHED") {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  return experience.id;
}

export async function getExperience(id: string, opts?: { publishedOnly?: boolean; actor?: AuthUser }) {
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: experienceInclude,
  });

  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  if (opts?.publishedOnly && experience.status !== publicCatalogWhere.status) {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  if (opts?.actor) {
    assertCanAccess(experience, opts.actor);
  }

  return experience;
}

function normalizeExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = Array.isArray(input.imageUrls)
    ? input.imageUrls.map((url) => url.trim()).filter(Boolean)
    : null;
  if (listed) {
    return { imageUrl: listed[0] ?? null, imageUrls: listed };
  }
  const single = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  const urls = single ? [single] : [];
  return { imageUrl: urls[0] ?? null, imageUrls: urls };
}

function countExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = Array.isArray(input.imageUrls)
    ? input.imageUrls.map((url) => url.trim()).filter(Boolean)
    : [];
  if (listed.length) {
    return listed.length;
  }
  const single = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  return single ? 1 : 0;
}

function requireMinExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  if (countExperienceImages(input) < MIN_EXPERIENCE_IMAGES) {
    throw ApiError.unprocessable(MIN_EXPERIENCE_IMAGES_MESSAGE);
  }
}

function requirePublishFields(
  images: { imageUrl?: string | null; imageUrls?: string[] | null },
  location?: string | null,
) {
  requireMinExperienceImages(images);
  if (!location) {
    throw ApiError.unprocessable("Una experiencia publicada debe tener ubicación");
  }
}

const MAX_EXPERIENCE_CATEGORIES = 3;

async function approvedCategoryIds(ids: string[]) {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length < 1) {
    throw ApiError.unprocessable("Selecciona una categoría.");
  }
  if (unique.length > MAX_EXPERIENCE_CATEGORIES) {
    throw ApiError.unprocessable("Puedes seleccionar máximo 3 categorías por experiencia.");
  }
  const categories = await prisma.category.findMany({ where: { id: { in: unique } } });
  if (categories.length !== unique.length) {
    throw ApiError.badRequest("La categoría no existe");
  }
  for (const category of categories) {
    if (category.status !== "APPROVED") {
      throw ApiError.badRequest("La categoría aún no está aprobada");
    }
  }
  return unique;
}

function categoryLinks(ids: string[]) {
  return ids.map((categoryId, index) => ({ categoryId, position: index + 1 }));
}

type ExperienceLocationInput = {
  department: string;
  municipality: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  howToGetThere?: string | null;
  availability?: Prisma.InputJsonValue | null;
};

function composeStoredLocation(place: Pick<ExperienceLocationInput, "address" | "municipality" | "department">) {
  return [place.address, place.municipality, place.department]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
    .slice(0, 160);
}

function mirrorFirstLocation(places: ExperienceLocationInput[]) {
  const first = places[0];
  return {
    location: composeStoredLocation(first),
    latitude: first.latitude ?? null,
    longitude: first.longitude ?? null,
    howToGetThere: first.howToGetThere ?? null,
    availability:
      first.availability == null ? Prisma.DbNull : (structuredClone(first.availability) as Prisma.InputJsonValue),
  };
}

const RELATED_INTEREST_MAX = 5;

function canonicalRelatedInterests(names: string[], allowEmpty = false) {
  if (names.length === 0 && allowEmpty) {
    return [];
  }
  const next: string[] = [];
  for (const raw of names) {
    const trimmed = raw.trim();
    const mapped = ONBOARDING_INTEREST_ALIASES[trimmed] ?? trimmed;
    if (!mapped || next.includes(mapped)) {
      continue;
    }
    if (!(ONBOARDING_INTERESTS as readonly string[]).includes(mapped)) {
      throw ApiError.badRequest("Selecciona intereses de la lista de preferencias.");
    }
    next.push(mapped);
  }
  if (next.length < 1 || next.length > RELATED_INTEREST_MAX) {
    throw ApiError.badRequest("Selecciona entre 1 y 5 intereses relacionados.");
  }
  return next;
}

async function relatedInterestLinks(names: string[], allowEmpty = false) {
  const canonical = canonicalRelatedInterests(names, allowEmpty);
  if (!canonical.length) {
    return [];
  }
  const rows = await prisma.interest.findMany({
    where: { name: { in: canonical } },
    select: { id: true, name: true },
  });
  const byName = new Map(rows.map((row) => [row.name, row.id]));
  if (canonical.some((name) => !byName.has(name))) {
    throw ApiError.badRequest("Hay intereses relacionados que todavía no están en el catálogo.");
  }
  return canonical.map((name, index) => ({
    interestId: byName.get(name)!,
    position: index + 1,
  }));
}

function locationCreateRows(places: ExperienceLocationInput[]) {
  return places.map((place, index) => ({
    position: index + 1,
    department: place.department.trim(),
    municipality: place.municipality.trim(),
    address: place.address.trim(),
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
    howToGetThere: place.howToGetThere ?? null,
    availability: place.availability == null ? undefined : (structuredClone(place.availability) as Prisma.InputJsonValue),
  }));
}

export async function createExperience(
  actor: AuthUser,
  input: {
    title: string;
    description: string;
    categoryId: string;
    categoryIds?: string[];
    price: number;
    currency?: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    externalUrl?: string | null;
    duration?: string | null;
    durationValue?: number | null;
    durationUnit?: DurationUnit | null;
    availability?: Prisma.InputJsonValue | null;
    howToGetThere?: string | null;
    companyContact: string;
    locations?: ExperienceLocationInput[];
    imageUrl?: string | null;
    imageUrls?: string[];
    stampImageUrl?: string | null;
    status?: ExperienceStatus;
    relatedInterests?: string[];
    environments?: string[];
    idealFor?: string[];
  },
) {
  const categoryIds = await approvedCategoryIds(input.categoryIds?.length ? input.categoryIds : [input.categoryId]);
  const interestRows = Array.isArray(input.relatedInterests) ? await relatedInterestLinks(input.relatedInterests) : null;

  const gallery = normalizeExperienceImages(input);
  requirePublishFields(gallery, input.location);
  void input.status;
  const durationFields = resolveExperienceDuration(input) ?? {
    duration: null,
    durationValue: null,
    durationUnit: null,
  };

  const publishesDirectly = publishesExperiencesDirectly(actor);
  if (!publishesDirectly) {
    await assertAdminCanSubmitExperiences(actor);
  }
  const status: ExperienceStatus = publishesDirectly ? "PUBLISHED" : "PENDING";
  const submittedAt = publishesDirectly ? null : new Date();
  const places = input.locations?.length ? input.locations : null;
  const primary = places ? mirrorFirstLocation(places) : null;
  const experience = await prisma.experience.create({
    data: {
      title: input.title,
      description: input.description,
      categoryId: categoryIds[0],
      experienceCategories: { create: categoryLinks(categoryIds) },
      ...(interestRows ? { experienceInterests: { create: interestRows } } : {}),
      price: input.price,
      currency: input.currency ?? "COP",
      location: primary?.location ?? input.location,
      latitude: primary ? primary.latitude : (input.latitude ?? null),
      longitude: primary ? primary.longitude : (input.longitude ?? null),
      externalUrl: input.externalUrl ?? null,
      duration: durationFields.duration,
      durationValue: durationFields.durationValue,
      durationUnit: durationFields.durationUnit,
      availability: primary
        ? primary.availability === Prisma.DbNull
          ? undefined
          : primary.availability
        : input.availability === undefined || input.availability === null
          ? undefined
          : structuredClone(input.availability),
      howToGetThere: primary ? primary.howToGetThere : (input.howToGetThere ?? null),
      companyContact: input.companyContact,
      ...(input.environments ? { environments: input.environments } : {}),
      ...(input.idealFor ? { idealFor: input.idealFor } : {}),
      ...(places ? { locations: { create: locationCreateRows(places) } } : {}),
      imageUrl: gallery.imageUrl,
      imageUrls: gallery.imageUrls,
      stampImageUrl: input.stampImageUrl ?? null,
      status,
      createdBy: actor.id,
      submittedAt,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_CREATE",
    entity: "Experience",
    entityId: experience.id,
  });
  if (!publishesDirectly) {
    await notifyExperienceSubmitted({
      experienceId: experience.id,
      title: experience.title,
      creatorId: actor.id,
      creatorName: actor.name,
    });
  }

  return experience;
}

function pickExperienceUpdate(input: Prisma.ExperienceUncheckedUpdateInput) {
  const data: Prisma.ExperienceUncheckedUpdateInput = {};
  const keys = [
    "title",
    "description",
    "categoryId",
    "price",
    "currency",
    "location",
    "latitude",
    "longitude",
    "externalUrl",
    "duration",
    "durationValue",
    "durationUnit",
    "availability",
    "howToGetThere",
    "companyContact",
    "environments",
    "idealFor",
    "imageUrl",
    "imageUrls",
    "stampImageUrl",
  ] as const;
  for (const key of keys) {
    if (input[key] !== undefined) {
      if (key === "availability" && input[key] === null) {
        data.availability = Prisma.DbNull;
      } else if (key === "availability") {
        data.availability = structuredClone(input[key]) as Prisma.InputJsonValue;
      } else {
        data[key] = input[key] as never;
      }
    }
  }
  return data;
}

export async function updateExperience(
  actor: AuthUser,
  id: string,
  input: Prisma.ExperienceUncheckedUpdateInput & {
    categoryIds?: string[];
    locations?: ExperienceLocationInput[];
    relatedInterests?: string[];
    environments?: string[];
    idealFor?: string[];
  },
) {
  const current = await getExperience(id, { actor });
  const reviewer = canReviewExperiences(actor);
  const superAdmin = canMutateApprovedCatalog(actor);

  if (superAdmin) {
    // SUPER_ADMIN may edit any experience status.
  } else if (current.status === "PUBLISHED" || current.status === "ARCHIVED") {
    throw ApiError.forbidden("Solo un super administrador puede editar experiencias publicadas o archivadas");
  } else if (!reviewer && current.createdBy !== actor.id) {
    throw ApiError.forbidden("No puedes editar esta experiencia");
  }

  const nextCategoryIds = Array.isArray(input.categoryIds)
    ? await approvedCategoryIds(input.categoryIds)
    : input.categoryId && typeof input.categoryId === "string"
      ? await approvedCategoryIds([input.categoryId])
      : null;
  const nextInterestLinks = Array.isArray(input.relatedInterests)
    ? await relatedInterestLinks(input.relatedInterests, true)
    : null;

  const data = pickExperienceUpdate(input);
  const places = Array.isArray(input.locations) ? input.locations : null;
  if (places?.length) {
    Object.assign(data, mirrorFirstLocation(places));
  }
  if (nextCategoryIds) {
    data.categoryId = nextCategoryIds[0];
  }
  delete data.status;
  const durationPatch = resolveExperienceDuration({
    duration: input.duration === undefined ? undefined : ((input.duration as string | null) ?? null),
    durationValue: input.durationValue === undefined ? undefined : (input.durationValue as number | null),
    durationUnit: input.durationUnit === undefined ? undefined : (input.durationUnit as DurationUnit | null),
  });
  if (durationPatch) {
    Object.assign(data, durationPatch);
  }
  const hasGalleryUpdate = data.imageUrl !== undefined || data.imageUrls !== undefined;
  const gallery = hasGalleryUpdate
    ? normalizeExperienceImages({
        imageUrl: data.imageUrl === undefined ? current.imageUrl : ((data.imageUrl as string | null) || null),
        imageUrls: Array.isArray(data.imageUrls) ? (data.imageUrls as string[]) : undefined,
      })
    : { imageUrl: current.imageUrl, imageUrls: current.imageUrls };

  requireMinExperienceImages(gallery);

  const experienceData = hasGalleryUpdate ? { ...data, imageUrl: gallery.imageUrl, imageUrls: gallery.imageUrls } : data;
  await prisma.$transaction(async (tx) => {
    if (nextCategoryIds) {
      await tx.experienceCategory.deleteMany({ where: { experienceId: id } });
      await tx.experienceCategory.createMany({
        data: categoryLinks(nextCategoryIds).map((link) => ({ experienceId: id, ...link })),
      });
    }
    if (nextInterestLinks) {
      await tx.experienceInterest.deleteMany({ where: { experienceId: id } });
      if (nextInterestLinks.length) {
        await tx.experienceInterest.createMany({
          data: nextInterestLinks.map((link) => ({ experienceId: id, ...link })),
        });
      }
    }
    if (places?.length) {
      await tx.experienceLocation.deleteMany({ where: { experienceId: id } });
      await tx.experienceLocation.createMany({
        data: locationCreateRows(places).map((row) => ({ experienceId: id, ...row })),
      });
    }
    await tx.experience.update({
      where: { id },
      data: experienceData,
    });
  }, { maxWait: 10_000, timeout: 20_000 });

  const experience = await prisma.experience.findUniqueOrThrow({
    where: { id },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_UPDATE",
    entity: "Experience",
    entityId: experience.id,
  });

  return experience;
}

export async function submitExperienceForReview(actor: AuthUser, id: string) {
  const current = await getExperience(id, { actor });
  if (current.createdBy !== actor.id && !canReviewExperiences(actor)) {
    throw ApiError.forbidden("No puedes enviar esta experiencia a revisión");
  }
  await assertAdminCanSubmitExperiences(actor);
  if (current.status === "PUBLISHED") {
    throw ApiError.badRequest("Esta experiencia ya está publicada");
  }
  if (current.status === "ARCHIVED") {
    throw ApiError.badRequest("Reactiva esta experiencia desde Cambiar estado; no la envíes a revisión");
  }
  if (current.status === "PENDING") {
    return current;
  }
  if (current.status !== "REJECTED" && current.status !== "DRAFT") {
    throw ApiError.badRequest("Esta experiencia no se puede enviar a revisión");
  }

  requirePublishFields(current, current.location);

  const experience = await prisma.experience.update({
    where: { id },
    data: {
      status: "PENDING",
      submittedAt: new Date(),
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_SUBMIT",
    entity: "Experience",
    entityId: experience.id,
  });
  await notifyExperienceSubmitted({
    experienceId: experience.id,
    title: experience.title,
    creatorId: experience.createdBy,
    creatorName: experience.creator.name,
  });

  return experience;
}

export async function approveExperience(actor: AuthUser, id: string) {
  if (!canReviewExperiences(actor)) {
    throw ApiError.forbidden("No tienes permiso para aprobar experiencias");
  }
  const current = await getExperience(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden aprobar experiencias pendientes de revisión");
  }

  requirePublishFields(current, current.location);

  const reviewedAt = new Date();
  const [experience] = await prisma.$transaction([
    prisma.experience.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        rejectionReason: null,
        reviewedAt,
        reviewedById: actor.id,
      },
      include: experienceInclude,
    }),
    prisma.experienceReview.create({
      data: {
        experienceId: id,
        reviewerId: actor.id,
        decision: "APPROVED",
      },
    }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_APPROVE",
    entity: "Experience",
    entityId: experience.id,
  });
  if (experience.createdBy !== actor.id) {
    await notifyExperienceApproved({
      experienceId: experience.id,
      title: experience.title,
      creatorId: experience.createdBy,
    });
  }

  return experience;
}

export async function rejectExperience(actor: AuthUser, id: string, reason: string) {
  if (!canReviewExperiences(actor)) {
    throw ApiError.forbidden("No tienes permiso para rechazar experiencias");
  }
  const trimmed = reason.trim();
  if (trimmed.length < 8) {
    throw ApiError.unprocessable("El motivo del rechazo es obligatorio");
  }
  const current = await getExperience(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden rechazar experiencias pendientes de revisión");
  }

  const reviewedAt = new Date();
  const [experience] = await prisma.$transaction([
    prisma.experience.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: trimmed,
        reviewedAt,
        reviewedById: actor.id,
      },
      include: experienceInclude,
    }),
    prisma.experienceReview.create({
      data: {
        experienceId: id,
        reviewerId: actor.id,
        decision: "REJECTED",
        reason: trimmed,
      },
    }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_REJECT",
    entity: "Experience",
    entityId: experience.id,
  });
  if (experience.createdBy !== actor.id) {
    await notifyExperienceRejected({
      experienceId: experience.id,
      title: experience.title,
      creatorId: experience.createdBy,
      reason: trimmed,
    });
  }

  return experience;
}

export async function changeExperienceStatus(actor: AuthUser, id: string, status: ExperienceStatus) {
  if (status === "REJECTED") {
    throw ApiError.forbidden("Para rechazar una experiencia debes indicar un motivo");
  }
  if (status === "PENDING") {
    return submitExperienceForReview(actor, id);
  }
  if (status === "PUBLISHED" || status === "ARCHIVED") {
    const current = await getExperience(id, { actor });
    if (current.status !== "PUBLISHED" && current.status !== "ARCHIVED") {
      if (status === "PUBLISHED") {
        throw ApiError.forbidden("Las experiencias se publican al aprobarlas, no cambiando el estado manualmente");
      }
      throw ApiError.badRequest("Solo se puede desactivar una experiencia ya publicada");
    }
    if (!canManageAvailability(actor, current)) {
      throw ApiError.forbidden("No puedes cambiar la disponibilidad de esta experiencia");
    }
    if (status === current.status) {
      return current;
    }
    if (status === "PUBLISHED") {
      requirePublishFields(current, current.location);
      const experience = await prisma.experience.update({
        where: { id },
        data: { status: "PUBLISHED" },
        include: experienceInclude,
      });
      await recordAudit({
        userId: actor.id,
        action: "EXPERIENCE_STATUS_RESTORED",
        entity: "Experience",
        entityId: experience.id,
      });
      return experience;
    }
    const experience = await prisma.experience.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: experienceInclude,
    });
    await recordAudit({
      userId: actor.id,
      action: "EXPERIENCE_STATUS_ARCHIVED",
      entity: "Experience",
      entityId: experience.id,
    });
    return experience;
  }
  throw ApiError.badRequest("Estado no permitido");
}

export async function deleteExperience(actor: AuthUser, id: string) {
  const current = await getExperience(id, { actor });
  if (canMutateApprovedCatalog(actor)) {
    // SUPER_ADMIN may delete any experience status.
  } else if (current.status === "PUBLISHED") {
    throw ApiError.forbidden("Solo un super administrador puede eliminar experiencias publicadas");
  } else if (!canReviewExperiences(actor) && current.createdBy !== actor.id) {
    throw ApiError.forbidden("No puedes eliminar esta experiencia");
  }
  await prisma.experience.delete({ where: { id } });
  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_DELETE",
    entity: "Experience",
    entityId: id,
  });
}
