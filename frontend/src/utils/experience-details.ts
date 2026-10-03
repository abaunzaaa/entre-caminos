export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const AVAILABILITY_TYPES = [
  { id: "EVERY_DAY", label: "Todos los días" },
  { id: "WEEKDAYS", label: "Días de la semana" },
  { id: "DATES", label: "Fechas específicas" },
  { id: "COMING_SOON", label: "Próximamente" },
] as const;

export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number]["id"];

export type ExperienceAvailability =
  | { type: "EVERY_DAY"; times: string[] }
  | { type: "WEEKDAYS"; days: string[]; times: string[] }
  | { type: "DATES"; dates: string[]; times: string[] }
  | { type: "COMING_SOON" };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isAvailabilityTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function parseAvailabilityTimes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isAvailabilityTime(item) || unique.includes(item)) {
      continue;
    }
    unique.push(item);
  }
  return unique.sort();
}

export function formatTimeLabel(value: string) {
  if (!isAvailabilityTime(value)) {
    return value;
  }
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function hasStoredAvailability(value: unknown) {
  return Boolean(value && typeof value === "object" && "type" in (value as object));
}

export function parseAvailability(value: unknown): ExperienceAvailability {
  if (!value || typeof value !== "object") {
    return { type: "EVERY_DAY", times: [] };
  }
  const record = value as { type?: string; days?: unknown; dates?: unknown; times?: unknown };
  const times = parseAvailabilityTimes(record.times);
  if (record.type === "COMING_SOON") {
    return { type: "COMING_SOON" };
  }
  if (record.type === "WEEKDAYS") {
    const days = Array.isArray(record.days)
      ? record.days.filter((day): day is string => typeof day === "string" && WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]))
      : [];
    return { type: "WEEKDAYS", days, times };
  }
  if (record.type === "DATES") {
    const dates = Array.isArray(record.dates)
      ? record.dates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
      : [];
    return { type: "DATES", dates, times };
  }
  return { type: "EVERY_DAY", times };
}

export function selectAvailability(current: ExperienceAvailability, next: AvailabilityType): ExperienceAvailability {
  if (next === "COMING_SOON") {
    return { type: "COMING_SOON" };
  }
  const times = current.type === "COMING_SOON" ? [] : current.times;
  if (next === "WEEKDAYS") {
    return {
      type: "WEEKDAYS",
      days: current.type === "WEEKDAYS" ? current.days : [],
      times,
    };
  }
  if (next === "DATES") {
    return {
      type: "DATES",
      dates: current.type === "DATES" ? current.dates : [],
      times,
    };
  }
  return { type: "EVERY_DAY", times };
}

export function serializeAvailability(availability: ExperienceAvailability) {
  if (availability.type === "COMING_SOON") {
    return { type: "COMING_SOON" as const };
  }
  const times = parseAvailabilityTimes(availability.times);
  if (availability.type === "WEEKDAYS") {
    return {
      type: "WEEKDAYS" as const,
      days: availability.days,
      ...(times.length ? { times } : {}),
    };
  }
  if (availability.type === "DATES") {
    return {
      type: "DATES" as const,
      dates: availability.dates,
      ...(times.length ? { times } : {}),
    };
  }
  return {
    type: "EVERY_DAY" as const,
    ...(times.length ? { times } : {}),
  };
}

export function availabilityDetailFacts(value: unknown): { label: string; value: string }[] {
  if (!hasStoredAvailability(value)) {
    return [];
  }
  const parsed = parseAvailability(value);
  const facts: { label: string; value: string }[] = [];
  if (parsed.type === "COMING_SOON") {
    return [{ label: "Disponibilidad", value: "Próximamente" }];
  }
  if (parsed.type === "EVERY_DAY") {
    facts.push({ label: "Disponibilidad", value: "Disponible todos los días" });
  } else if (parsed.type === "WEEKDAYS" && parsed.days.length) {
    facts.push({ label: "Días disponibles", value: parsed.days.join(", ") });
  } else if (parsed.type === "DATES" && parsed.dates.length) {
    facts.push({
      label: "Fechas",
      value: parsed.dates
        .map((date) => {
          const [year, month, day] = date.split("-");
          return `${day}/${month}/${year}`;
        })
        .join(", "),
    });
  }
  if (parsed.times.length) {
    facts.push({
      label: parsed.times.length === 1 ? "Horario" : "Horarios",
      value: parsed.times.map((time) => formatTimeLabel(time)).join(", "),
    });
  }
  return facts;
}

export function formatAvailability(value: unknown) {
  if (!hasStoredAvailability(value)) {
    return "";
  }
  const parsed = parseAvailability(value);
  if (parsed.type === "COMING_SOON") {
    return "Próximamente";
  }
  const timesText = parsed.times.length
    ? ` · Horarios: ${parsed.times.map((time) => formatTimeLabel(time)).join(", ")}`
    : "";
  if (parsed.type === "EVERY_DAY") {
    return `Disponible todos los días${timesText}`;
  }
  if (parsed.type === "WEEKDAYS") {
    const daysText = parsed.days.length ? `Días: ${parsed.days.join(", ")}` : "Días de la semana por confirmar";
    return `${daysText}${timesText}`;
  }
  if (!parsed.dates.length) {
    return `Fechas por confirmar${timesText}`;
  }
  const formatted = parsed.dates.map((date) => {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  });
  return `Fechas: ${formatted.join(", ")}${timesText}`;
}

export function displayExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return url;
  }
}

export function availabilityLabel(type: AvailabilityType) {
  return AVAILABILITY_TYPES.find((item) => item.id === type)?.label ?? "Todos los días";
}

export const DURATION_UNITS = [
  { id: "MINUTES", label: "Minutos" },
  { id: "HOURS", label: "Horas" },
  { id: "DAYS", label: "Días" },
] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number]["id"];

export function durationUnitLabel(unit: DurationUnit) {
  return DURATION_UNITS.find((item) => item.id === unit)?.label ?? "Horas";
}

export function durationParts(value?: number | null, unit?: DurationUnit | string | null) {
  if (value && value >= 1 && (unit === "MINUTES" || unit === "HOURS" || unit === "DAYS")) {
    return { value, unitLabel: durationUnitLabel(unit) };
  }
  return null;
}

export function formatDuration(value?: number | null, unit?: DurationUnit | string | null, fallback?: string | null) {
  if (value && (unit === "MINUTES" || unit === "HOURS" || unit === "DAYS")) {
    if (unit === "MINUTES") {
      return value === 1 ? "1 minuto" : `${value} minutos`;
    }
    if (unit === "HOURS") {
      return value === 1 ? "1 hora" : `${value} horas`;
    }
    return value === 1 ? "1 día" : `${value} días`;
  }
  return fallback?.trim() || "";
}

export function parseDurationFields(input: {
  duration?: string | null;
  durationValue?: number | null;
  durationUnit?: string | null;
}) {
  if (input.durationValue && (input.durationUnit === "MINUTES" || input.durationUnit === "HOURS" || input.durationUnit === "DAYS")) {
    return { value: String(input.durationValue), unit: input.durationUnit as DurationUnit };
  }
  const text = input.duration?.trim().toLowerCase() ?? "";
  const match = text.match(/^(\d+)\s*(minutos?|min\.?|horas?|h|d[ií]as?|d)$/i);
  if (match) {
    const amount = match[1];
    const token = match[2].toLowerCase();
    const unit: DurationUnit = token.startsWith("min") ? "MINUTES" : token.startsWith("h") ? "HOURS" : "DAYS";
    return { value: amount, unit };
  }
  return { value: "", unit: "HOURS" as DurationUnit };
}
