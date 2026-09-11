export const ONBOARDING_COUNTRIES = ["Colombia"] as const;

export const ONBOARDING_INTERESTS = [
  "Naturaleza",
  "Gastronomía",
  "Cultura",
  "Aventura",
  "Relajación",
  "Fiesta / Vida nocturna",
] as const;

export const ONBOARDING_INTEREST_ALIASES: Record<string, (typeof ONBOARDING_INTERESTS)[number]> = {
  Comida: "Gastronomía",
  Fiesta: "Fiesta / Vida nocturna",
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
export const AVATAR_HAIR_STYLES = ["short", "wavy", "bun", "fade", "none"] as const;
export const AVATAR_HAIR_COLORS = ["ink", "chestnut", "gold", "silver", "dark"] as const;
export const AVATAR_OUTFITS = ["shirt", "knit", "jacket"] as const;
export const AVATAR_OUTFIT_COLORS = ["forest", "sage", "sand", "clay"] as const;
export const AVATAR_ACCESSORIES = ["none", "earring"] as const;
export const AVATAR_GLASSES = ["none", "round", "thin"] as const;

export const DEFAULT_AVATAR_CONFIG = {
  version: 1 as const,
  skinTone: "honey",
  face: "soft",
  hairStyle: "wavy",
  hairColor: "chestnut",
  outfit: "knit",
  outfitColor: "forest",
  accessory: "none",
  glasses: "none",
};

export type AvatarConfig = typeof DEFAULT_AVATAR_CONFIG;
