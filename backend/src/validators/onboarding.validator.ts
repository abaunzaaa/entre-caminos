import { z } from "zod";
import {
  AVATAR_ACCESSORIES,
  AVATAR_FACES,
  AVATAR_GLASSES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_OUTFIT_COLORS,
  AVATAR_OUTFITS,
  AVATAR_SKIN_TONES,
  ONBOARDING_BUDGETS,
  ONBOARDING_CLIMATES,
  ONBOARDING_COMPANIONS,
  ONBOARDING_COUNTRIES,
  ONBOARDING_INTEREST_ALIASES,
  ONBOARDING_INTERESTS,
  ONBOARDING_MUSIC,
  ONBOARDING_PLACES,
} from "../config/onboarding.js";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
};

export const avatarConfigSchema = z.object({
  version: z.literal(1),
  skinTone: z.enum(AVATAR_SKIN_TONES),
  face: z.enum(AVATAR_FACES),
  hairStyle: z.enum(AVATAR_HAIR_STYLES),
  hairColor: z.enum(AVATAR_HAIR_COLORS),
  outfit: z.enum(AVATAR_OUTFITS),
  outfitColor: z.enum(AVATAR_OUTFIT_COLORS),
  accessory: z.enum(AVATAR_ACCESSORIES).optional(),
  glasses: z.enum(AVATAR_GLASSES).optional(),
});

const stringList = (allowed: readonly string[], aliases: Record<string, string> = {}) =>
  z.array(z.string()).transform((values) => {
    const allowedSet = new Set<string>(allowed);
    const next: string[] = [];
    for (const raw of values) {
      const mapped = aliases[raw.trim()] ?? raw.trim();
      if (allowedSet.has(mapped) && !next.includes(mapped)) {
        next.push(mapped);
      }
    }
    return next;
  });

export const onboardingSaveSchema = z.object({
  country: z.preprocess(emptyToUndefined, z.enum(ONBOARDING_COUNTRIES).optional()),
  department: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  city: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  neighborhood: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  addressReference: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  latitude: z.number().gte(-90).lte(90).nullable().optional(),
  longitude: z.number().gte(-180).lte(180).nullable().optional(),
  profileImageType: z.enum(["PHOTO", "AVATAR"]).optional(),
  avatarConfig: avatarConfigSchema.optional(),
  interests: stringList(ONBOARDING_INTERESTS, ONBOARDING_INTEREST_ALIASES).optional(),
  companions: stringList(ONBOARDING_COMPANIONS).optional(),
  places: stringList(ONBOARDING_PLACES).optional(),
  music: stringList(ONBOARDING_MUSIC).optional(),
  budget: stringList(ONBOARDING_BUDGETS).optional(),
  climate: stringList(ONBOARDING_CLIMATES).optional(),
  completed: z.boolean().optional(),
});

export type OnboardingSaveInput = z.infer<typeof onboardingSaveSchema>;
