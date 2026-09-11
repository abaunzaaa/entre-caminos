export const ONBOARDING_COUNTRIES = ["Colombia"] as const;

export const ONBOARDING_INTERESTS = [
  "Naturaleza",
  "Gastronomía",
  "Cultura",
  "Aventura",
  "Relajación",
  "Fiesta / Vida nocturna",
  "Arte y creatividad",
  "Deportes",
  "Historia y patrimonio",
  "Música",
  "Talleres",
  "Planes urbanos",
  "Café",
  "Fotografía",
  "Danza",
  "Literatura",
] as const;

export const ONBOARDING_INTEREST_ALIASES: Record<string, (typeof ONBOARDING_INTERESTS)[number]> = {
  Comida: "Gastronomía",
  Fiesta: "Fiesta / Vida nocturna",
  "Vida nocturna": "Fiesta / Vida nocturna",
  Bienestar: "Relajación",
};

export const ONBOARDING_COMPANIONS = ["Solo", "En pareja", "Amigos", "Familia"] as const;
export const ONBOARDING_PLACES = [
  "Playa",
  "Montaña",
  "Bosque / Naturaleza",
  "Ciudad",
  "Pueblos mágicos",
] as const;
export const ONBOARDING_MUSIC = ["Pop", "Reggaetón", "Rock", "Más"] as const;
export const ONBOARDING_BUDGETS = ["Económico", "Moderado", "Alto", "Lujo"] as const;
export const ONBOARDING_CLIMATES = ["Cálido", "Templado", "Frío", "No tengo preferencia"] as const;

export const ONBOARDING_INTEREST_MIN = 3;
export const ONBOARDING_INTEREST_MAX = 5;

export const AVATAR_SKIN_TONES = ["sand", "honey", "amber", "cocoa", "espresso"] as const;
export const AVATAR_FACES = ["soft", "oval", "round"] as const;
export const AVATAR_EYES = ["almond", "round", "lidded"] as const;
export const AVATAR_EYEBROWS = ["soft", "defined", "arched"] as const;
export const AVATAR_MOUTHS = ["neutral", "soft-smile", "calm"] as const;
export const AVATAR_HAIR_STYLES = ["short", "wavy", "bun", "fade", "none"] as const;
export const AVATAR_HAIR_COLORS = ["ink", "chestnut", "gold", "silver", "dark"] as const;
export const AVATAR_OUTFITS = ["shirt", "knit", "jacket"] as const;
export const AVATAR_OUTFIT_COLORS = ["forest", "sage", "sand", "clay"] as const;
export const AVATAR_ACCESSORIES = ["none", "earring"] as const;
export const AVATAR_GLASSES = ["none", "round", "thin"] as const;

export const DEFAULT_AVATAR_CONFIG = {
  version: 2 as const,
  skinTone: "honey",
  face: "soft",
  eyes: "almond",
  eyebrows: "soft",
  mouth: "soft-smile",
  hairStyle: "wavy",
  hairColor: "chestnut",
  outfit: "knit",
  outfitColor: "forest",
  accessory: "none",
  glasses: "none",
};

export type AvatarConfig = typeof DEFAULT_AVATAR_CONFIG;

export function normalizeAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_AVATAR_CONFIG;
  }
  const raw = value as Record<string, unknown>;
  const pick = <T extends string>(allowed: readonly T[], incoming: unknown, fallback: T) =>
    allowed.includes(incoming as T) ? (incoming as T) : fallback;
  return {
    version: 2,
    skinTone: pick(AVATAR_SKIN_TONES, raw.skinTone, DEFAULT_AVATAR_CONFIG.skinTone),
    face: pick(AVATAR_FACES, raw.face, DEFAULT_AVATAR_CONFIG.face),
    eyes: pick(AVATAR_EYES, raw.eyes, DEFAULT_AVATAR_CONFIG.eyes),
    eyebrows: pick(AVATAR_EYEBROWS, raw.eyebrows, DEFAULT_AVATAR_CONFIG.eyebrows),
    mouth: pick(AVATAR_MOUTHS, raw.mouth, DEFAULT_AVATAR_CONFIG.mouth),
    hairStyle: pick(AVATAR_HAIR_STYLES, raw.hairStyle, DEFAULT_AVATAR_CONFIG.hairStyle),
    hairColor: pick(AVATAR_HAIR_COLORS, raw.hairColor, DEFAULT_AVATAR_CONFIG.hairColor),
    outfit: pick(AVATAR_OUTFITS, raw.outfit, DEFAULT_AVATAR_CONFIG.outfit),
    outfitColor: pick(AVATAR_OUTFIT_COLORS, raw.outfitColor, DEFAULT_AVATAR_CONFIG.outfitColor),
    accessory: pick(AVATAR_ACCESSORIES, raw.accessory, DEFAULT_AVATAR_CONFIG.accessory),
    glasses: pick(AVATAR_GLASSES, raw.glasses, DEFAULT_AVATAR_CONFIG.glasses),
  };
}
