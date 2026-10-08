const TZ = "America/Bogota";

function parseDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12));
}

export function bogotaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: string, days: number) {
  const date = parseDay(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const start = addDays(first.toISOString().slice(0, 10), -startOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function weekDays(iso: string) {
  const date = parseDay(iso);
  const offset = (date.getUTCDay() + 6) % 7;
  const monday = addDays(iso, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthTitle(year: number, month: number) {
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1, 12)),
  );
}

export function weekdayShort(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", timeZone: "UTC" }).format(parseDay(iso));
}

export function longDay(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDay(iso));
}

export function bogotaDay(isoDateTime: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDateTime));
}

export function bogotaClock(isoDateTime: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoDateTime));
}

export function bogotaTimeValue(isoDateTime: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoDateTime));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "09";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function toPlannedAt(day: string, time: string) {
  return `${day}T${time}:00-05:00`;
}

export function ticketDate(isoDateTime: string) {
  const day = bogotaDay(isoDateTime);
  const date = parseDay(day);
  return {
    day: new Intl.DateTimeFormat("es-CO", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" }).format(date).replace(".", ""),
    year: day.slice(0, 4),
  };
}
