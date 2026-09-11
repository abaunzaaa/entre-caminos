import {
  BookOpen,
  Building2,
  Camera,
  Church,
  CloudSun,
  Coffee,
  Compass,
  Dumbbell,
  Flower2,
  Heart,
  Home,
  Landmark,
  Mountain,
  Music,
  Palette,
  Palmtree,
  PartyPopper,
  Snowflake,
  Sun,
  Trees,
  User,
  Users,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AvatarConfig } from "../types";

export type OnboardingOption = {
  value: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
};

export type OnboardingGroup = {
  id: string;
  title: string;
  hint: string;
  multiple: boolean;
  options: OnboardingOption[];
};

export const ONBOARDING_COUNTRIES = ["Colombia"] as const;

export const INTEREST_ALIASES: Record<string, string> = {
  Comida: "Gastronomía",
  Fiesta: "Fiesta / Vida nocturna",
  "Vida nocturna": "Fiesta / Vida nocturna",
  Bienestar: "Relajación",
};

export const INTEREST_OPTIONS: OnboardingOption[] = [
  { value: "Naturaleza", label: "Naturaleza", icon: Trees },
  { value: "Gastronomía", label: "Gastronomía", icon: Utensils },
  { value: "Cultura", label: "Cultura", icon: Landmark },
  { value: "Aventura", label: "Aventura", icon: Compass },
  { value: "Relajación", label: "Bienestar", icon: Flower2 },
  { value: "Arte y creatividad", label: "Arte y creatividad", icon: Palette },
  { value: "Deportes", label: "Deportes", icon: Dumbbell },
  { value: "Historia y patrimonio", label: "Historia y patrimonio", icon: Landmark },
  { value: "Música", label: "Música", icon: Music },
  { value: "Talleres", label: "Talleres", icon: Wrench },
  { value: "Planes urbanos", label: "Planes urbanos", icon: Building2 },
  { value: "Café", label: "Café", icon: Coffee },
  { value: "Fotografía", label: "Fotografía", icon: Camera },
  { value: "Danza", label: "Danza", icon: Heart },
  { value: "Literatura", label: "Literatura", icon: BookOpen },
  { value: "Fiesta / Vida nocturna", label: "Vida nocturna", icon: PartyPopper },
];

export const COMPANY_OPTIONS: OnboardingOption[] = [
  { value: "Solo", label: "Solo", hint: "A tu propio ritmo", icon: User },
  { value: "En pareja", label: "En pareja", hint: "Momentos para dos", icon: Heart },
  { value: "Amigos", label: "Con amigos", hint: "Planes para compartir", icon: Users },
  { value: "Familia", label: "En familia", hint: "Tiempo juntos", icon: Home },
];

export const PLACE_OPTIONS: OnboardingOption[] = [
  { value: "Playa", label: "Playa", icon: Palmtree },
  { value: "Montaña", label: "Montaña", icon: Mountain },
  { value: "Bosque / Naturaleza", label: "Bosque", icon: Trees },
  { value: "Ciudad", label: "Ciudad", icon: Building2 },
  { value: "Pueblos mágicos", label: "Pueblos", icon: Church },
];

export const PREFERENCE_GROUPS: OnboardingGroup[] = [
  {
    id: "ambientes",
    title: "Ambientes",
    hint: "Puedes elegir varias opciones",
    multiple: true,
    options: PLACE_OPTIONS,
  },
  {
    id: "musica",
    title: "Ritmo y música",
    hint: "Puedes elegir varias opciones",
    multiple: true,
    options: [
      { value: "Pop", label: "Pop", icon: Music },
      { value: "Reggaetón", label: "Reggaetón", icon: Music },
      { value: "Rock", label: "Rock", icon: Music },
      { value: "Más", label: "Más ritmos", icon: Music },
    ],
  },
  {
    id: "presupuesto",
    title: "Presupuesto",
    hint: "Elige una opción",
    multiple: false,
    options: [
      { value: "Económico", label: "Económico", icon: Wallet },
      { value: "Moderado", label: "Moderado", icon: Wallet },
      { value: "Alto", label: "Alto", icon: Wallet },
      { value: "Lujo", label: "Lujo", icon: Wallet },
    ],
  },
  {
    id: "clima",
    title: "Clima",
    hint: "Elige una opción",
    multiple: false,
    options: [
      { value: "Cálido", label: "Cálido", icon: Sun },
      { value: "Templado", label: "Templado", icon: CloudSun },
      { value: "Frío", label: "Frío", icon: Snowflake },
      { value: "No tengo preferencia", label: "Sin preferencia", icon: CloudSun },
    ],
  },
];

export const PRIMARY_INTEREST_VALUES = INTEREST_OPTIONS.map((option) => option.value);

const LABEL_BY_VALUE = new Map(
  [
    ...INTEREST_OPTIONS,
    ...COMPANY_OPTIONS,
    ...PREFERENCE_GROUPS.flatMap((group) => group.options),
  ].map((option) => [option.value, option.label] as const),
);

export function getPreferenceLabel(value: string) {
  return LABEL_BY_VALUE.get(value) ?? value;
}

export function canonicalizeInterest(value: string) {
  return INTEREST_ALIASES[value] ?? value;
}

export function isPrimaryInterest(value: string) {
  return PRIMARY_INTEREST_VALUES.includes(canonicalizeInterest(value));
}

export const AVATAR_SKIN_TONES = [
  { id: "sand", label: "Arena", color: "#e8c9a8" },
  { id: "honey", label: "Miel", color: "#d4a574" },
  { id: "amber", label: "Ámbar", color: "#c08654" },
  { id: "cocoa", label: "Cacao", color: "#8d5a3b" },
  { id: "espresso", label: "Espresso", color: "#5c3a28" },
] as const;

export const AVATAR_FACES = [
  { id: "soft", label: "Suave" },
  { id: "oval", label: "Ovalado" },
  { id: "round", label: "Redondeado" },
] as const;

export const AVATAR_EYES = [
  { id: "almond", label: "Almendrados" },
  { id: "round", label: "Redondos" },
  { id: "lidded", label: "Párpado suave" },
] as const;

export const AVATAR_EYEBROWS = [
  { id: "soft", label: "Suaves" },
  { id: "defined", label: "Marcadas" },
  { id: "arched", label: "Arqueadas" },
] as const;

export const AVATAR_MOUTHS = [
  { id: "neutral", label: "Neutra" },
  { id: "soft-smile", label: "Sonrisa suave" },
  { id: "calm", label: "Sereno" },
] as const;

export const AVATAR_HAIR_STYLES = [
  { id: "short", label: "Corto" },
  { id: "wavy", label: "Ondulado" },
  { id: "bun", label: "Recogido" },
  { id: "fade", label: "Fade" },
  { id: "none", label: "Al ras" },
] as const;

export const AVATAR_HAIR_COLORS = [
  { id: "ink", label: "Tinta", color: "#1f1a17" },
  { id: "chestnut", label: "Castaño", color: "#6b3f2a" },
  { id: "gold", label: "Dorado", color: "#c4a35a" },
  { id: "silver", label: "Plata", color: "#c5c0b6" },
  { id: "dark", label: "Oscuro", color: "#2c2420" },
] as const;

export const AVATAR_OUTFITS = [
  { id: "shirt", label: "Camisa" },
  { id: "knit", label: "Tejido" },
  { id: "jacket", label: "Chaqueta" },
] as const;

export const AVATAR_OUTFIT_COLORS = [
  { id: "forest", label: "Bosque", color: "#294942" },
  { id: "sage", label: "Salvia", color: "#91a69e" },
  { id: "sand", label: "Arena", color: "#d8cbb8" },
  { id: "clay", label: "Arcilla", color: "#b8896a" },
] as const;

export const AVATAR_ACCESSORIES = [
  { id: "none", label: "Sin accesorio" },
  { id: "earring", label: "Arete" },
] as const;

export const AVATAR_GLASSES = [
  { id: "none", label: "Sin gafas" },
  { id: "round", label: "Redondas" },
  { id: "thin", label: "Delgadas" },
] as const;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 2,
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

export function parseAvatarConfig(value: unknown): AvatarConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_AVATAR_CONFIG;
  }
  const raw = value as Record<string, unknown>;
  const pick = <T extends string>(allowed: readonly { id: T }[], incoming: unknown, fallback: T) => {
    return allowed.some((item) => item.id === incoming) ? (incoming as T) : fallback;
  };
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
    accessory: pick(AVATAR_ACCESSORIES, raw.accessory, "none"),
    glasses: pick(AVATAR_GLASSES, raw.glasses, "none"),
  };
}

export function randomAvatarConfig(): AvatarConfig {
  const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!;
  return {
    version: 2,
    skinTone: pick(AVATAR_SKIN_TONES).id,
    face: pick(AVATAR_FACES).id,
    eyes: pick(AVATAR_EYES).id,
    eyebrows: pick(AVATAR_EYEBROWS).id,
    mouth: pick(AVATAR_MOUTHS).id,
    hairStyle: pick(AVATAR_HAIR_STYLES).id,
    hairColor: pick(AVATAR_HAIR_COLORS).id,
    outfit: pick(AVATAR_OUTFITS).id,
    outfitColor: pick(AVATAR_OUTFIT_COLORS).id,
    accessory: pick(AVATAR_ACCESSORIES).id,
    glasses: pick(AVATAR_GLASSES).id,
  };
}
