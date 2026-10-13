export const JOURNEY_THEMES = ["olive", "cream", "sand", "sage"] as const;
export const JOURNEY_BACKGROUNDS = ["cream", "linen", "olive", "pressed"] as const;
const CLASSIC_STICKERS = ["leaf", "bloom", "sprig", "fern", "sun", "ribbon", "compass", "cup", "heart", "star", "camera"] as const;
const LINE_STICKERS = [
  "line-avion", "line-pasaporte", "line-maleta", "line-camara", "line-globo", "line-brujula", "line-mapa", "line-pin", "line-tiquete", "line-van", "line-palmera", "line-montana",
  "line-sombrilla", "line-sol", "line-ola", "line-concha", "line-palmeras", "line-chanclas", "line-velero", "line-coctel", "line-protector", "line-snorkel", "line-silla", "line-bolso",
  "line-moto", "line-bici", "line-tren", "line-bus", "line-taxi", "line-ventanilla", "line-hotel", "line-portatil", "line-cafe", "line-camara2", "line-mapa2", "line-senal",
  "line-carpa", "line-fogata", "line-bota", "line-mochila", "line-cumbre", "line-letrero", "line-binoculares", "line-canoa", "line-pinos", "line-faro", "line-taza", "line-flechas",
] as const;
const PASTEL_STICKERS = Array.from({ length: 27 }, (_, index) => `pastel-${String(index + 1).padStart(2, "0")}`) as [
  "pastel-01", "pastel-02", "pastel-03", "pastel-04", "pastel-05", "pastel-06", "pastel-07", "pastel-08", "pastel-09", "pastel-10",
  "pastel-11", "pastel-12", "pastel-13", "pastel-14", "pastel-15", "pastel-16", "pastel-17", "pastel-18", "pastel-19", "pastel-20",
  "pastel-21", "pastel-22", "pastel-23", "pastel-24", "pastel-25", "pastel-26", "pastel-27",
];
export const JOURNEY_STICKERS = [...CLASSIC_STICKERS, ...LINE_STICKERS, ...PASTEL_STICKERS] as const;

export type JourneyTheme = (typeof JOURNEY_THEMES)[number];
export type JourneyBackground = (typeof JOURNEY_BACKGROUNDS)[number];
export type JourneySticker = (typeof JOURNEY_STICKERS)[number];

const THEME_SET = new Set<string>(JOURNEY_THEMES);
const BACKGROUND_SET = new Set<string>(JOURNEY_BACKGROUNDS);
const STICKER_SET = new Set<string>(JOURNEY_STICKERS);

export function isJourneyTheme(value: string): value is JourneyTheme {
  return THEME_SET.has(value);
}

export function isJourneyBackground(value: string): value is JourneyBackground {
  return BACKGROUND_SET.has(value);
}

export function isJourneySticker(value: string): value is JourneySticker {
  return STICKER_SET.has(value);
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 12;
  }
  return Math.min(94, Math.max(2, value));
}

export function assertMemoryAttendance(input: { experienceId?: string | null; planId?: string | null; attended: boolean }) {
  const linked = Boolean(input.experienceId || input.planId);
  if (linked && !input.attended) {
    return "Confirma que realizaste la experiencia antes de guardarla en tu bitácora.";
  }
  return null;
}
