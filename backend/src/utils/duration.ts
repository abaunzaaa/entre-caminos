const UNIT_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

export function durationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof UNIT_MS;
  return amount * UNIT_MS[unit];
}
