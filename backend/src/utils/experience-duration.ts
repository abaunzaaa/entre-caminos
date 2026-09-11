export const DURATION_UNITS = ["MINUTES", "HOURS", "DAYS"] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number];

const UNIT_LABEL: Record<DurationUnit, { one: string; many: string }> = {
  MINUTES: { one: "minuto", many: "minutos" },
  HOURS: { one: "hora", many: "horas" },
  DAYS: { one: "día", many: "días" },
};

export function isDurationUnit(value: unknown): value is DurationUnit {
  return value === "MINUTES" || value === "HOURS" || value === "DAYS";
}

export function formatDuration(value?: number | null, unit?: DurationUnit | null) {
  if (!value || !unit || value < 1) {
    return null;
  }
  const labels = UNIT_LABEL[unit];
  return `${value} ${value === 1 ? labels.one : labels.many}`;
}

export function parseDurationText(value?: string | null): { value: number; unit: DurationUnit } | null {
  const text = value?.trim().toLowerCase() ?? "";
  if (!text) {
    return null;
  }
  const match = text.match(/^(\d+)\s*(minutos?|min\.?|horas?|h(?:oras)?|d[ií]as?|d)$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount < 1) {
    return null;
  }
  const unitToken = match[2].toLowerCase();
  const unit: DurationUnit = unitToken.startsWith("min")
    ? "MINUTES"
    : unitToken.startsWith("h")
      ? "HOURS"
      : "DAYS";
  return { value: amount, unit };
}

export function resolveExperienceDuration(input: {
  duration?: string | null;
  durationValue?: number | null;
  durationUnit?: DurationUnit | null;
}) {
  if (input.durationValue != null && input.durationUnit) {
    return {
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      duration: formatDuration(input.durationValue, input.durationUnit),
    };
  }
  const parsed = parseDurationText(input.duration);
  if (parsed) {
    return {
      durationValue: parsed.value,
      durationUnit: parsed.unit,
      duration: formatDuration(parsed.value, parsed.unit) ?? input.duration?.trim() ?? null,
    };
  }
  if (input.duration === null || input.durationValue === null) {
    return { duration: null, durationValue: null, durationUnit: null };
  }
  if (typeof input.duration === "string") {
    return {
      duration: input.duration.trim() || null,
      durationValue: null,
      durationUnit: null,
    };
  }
  return null;
}
