export const JOURNEY_THEMES = ["olive", "cream", "sand", "sage"] as const;
export const JOURNEY_BACKGROUNDS = ["cream", "linen", "olive", "pressed"] as const;
export const JOURNEY_STICKERS = ["leaf", "bloom", "sprig", "fern", "sun", "ribbon", "compass", "cup", "heart", "star", "camera"] as const;

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
