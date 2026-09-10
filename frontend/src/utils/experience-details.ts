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
] as const;

export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number]["id"];

export type ExperienceAvailability =
  | { type: "EVERY_DAY" }
  | { type: "WEEKDAYS"; days: string[] }
  | { type: "DATES"; dates: string[] };

export function hasStoredAvailability(value: unknown) {
  return Boolean(value && typeof value === "object" && "type" in (value as object));
}

export function parseAvailability(value: unknown): ExperienceAvailability {
  if (!value || typeof value !== "object") {
    return { type: "EVERY_DAY" };
  }
  const record = value as { type?: string; days?: unknown; dates?: unknown };
  if (record.type === "WEEKDAYS") {
    const days = Array.isArray(record.days)
      ? record.days.filter((day): day is string => typeof day === "string" && WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]))
      : [];
    return { type: "WEEKDAYS", days };
  }
  if (record.type === "DATES") {
    const dates = Array.isArray(record.dates)
      ? record.dates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
      : [];
    return { type: "DATES", dates };
  }
  return { type: "EVERY_DAY" };
}

export function formatAvailability(value: unknown) {
  if (!hasStoredAvailability(value)) {
    return "";
  }
  const parsed = parseAvailability(value);
  if (parsed.type === "EVERY_DAY") {
    return "Disponible todos los días";
  }
  if (parsed.type === "WEEKDAYS") {
    return parsed.days.length ? `Días: ${parsed.days.join(", ")}` : "Días de la semana por confirmar";
  }
  if (!parsed.dates.length) {
    return "Fechas por confirmar";
  }
  const formatted = parsed.dates.map((date) => {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  });
  return `Fechas: ${formatted.join(", ")}`;
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
