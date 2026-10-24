import { Prisma, type DurationUnit } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { parseGeminiJson } from "./gemini.service.js";
import {
  ITINERARY_SYSTEM,
  SELECTION_SYSTEM,
  applySafetyFloor,
  assignCandidateKeys,
  blockReason,
  candidateBrief,
  emptyPlanMessage,
  emptyReading,
  itinerarySchema,
  narrativeContradictsRule,
  parseSelection,
  pickPublishedStart,
  publicNote,
  scheduleFitsRule,
  scheduleRule,
  selectionSchema,
  shortlistCandidates,
  splitByEligibility,
  visibleCopyLooksSpanish,
  type PreferenceReading,
  type ScheduleRule,
} from "./planner-generation.js";
import { generateStructuredGroqJson, hasGroqConfig, StructuredGroqError } from "./openai.service.js";
import type { z } from "zod";
import { ANY_MUNICIPALITY, type generatePlannerSchema, type savePlannerSchema } from "../validators/planner.validator.js";

type Preferences = z.infer<typeof generatePlannerSchema>;
type SaveInput = z.infer<typeof savePlannerSchema>;

type Candidate = {
  id: string;
  title: string;
  description: string;
  descriptionFull: string;
  category: string;
  categoryId: string;
  municipality: string;
  address: string;
  price: number;
  currency: string;
  durationLabel: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
  imageUrls: string[];
  categoryIds: string[];
  categories: string[];
  interests: string[];
  environments: string[];
  idealFor: string[];
  howToGetThere: string | null;
  contact: string | null;
  externalUrl: string | null;
  availabilityLabel: string;
  catalogTimes: string[];
  available: boolean | null;
  latitude: number | null;
  longitude: number | null;
  department: string;
};

const DURATION_BAND: Record<Preferences["durationKey"], [number, number]> = {
  "1-2": [60, 150],
  "3-5": [150, 330],
  "5-8": [300, 520],
  "8+": [480, 24 * 60],
};

function minutesOf(value: number | null, unit: DurationUnit | null) {
  if (!value || value <= 0 || !unit) return null;
  if (unit === "MINUTES") return value;
  if (unit === "HOURS") return value * 60;
  return value * 24 * 60;
}

function bogotaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function assertFutureDate(date: string) {
  if (date < bogotaToday()) {
    throw ApiError.badRequest("Elige una fecha de hoy en adelante.");
  }
}

export async function plannerOptions() {
  const [categories, places] = await Promise.all([
    prisma.category.findMany({
      where: { status: "APPROVED", experiences: { some: { status: "PUBLISHED" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.experienceLocation.findMany({
      where: { experience: { status: "PUBLISHED" } },
      select: { municipality: true },
      distinct: ["municipality"],
      orderBy: { municipality: "asc" },
    }),
  ]);
  const seenPlaces = new Map<string, string>();
  for (const place of places) {
    const name = place.municipality.trim();
    const key = name.toLocaleLowerCase("es");
    if (name && !seenPlaces.has(key)) seenPlaces.set(key, name);
  }
  return { categories, municipalities: [...seenPlaces.values()] };
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function bogotaWeekday(date: string) {
  return WEEKDAYS[new Date(`${date}T12:00:00.000Z`).getUTCDay()] ?? "";
}

function readAvailability(value: unknown, date: string) {
  const times: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { label: "", times, available: null as boolean | null };
  }
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.times)) {
    for (const item of record.times) {
      if (typeof item === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(item)) times.push(item);
    }
  }
  if (record.type === "COMING_SOON") return { label: "Próximamente", times, available: false };
  if (record.type === "EVERY_DAY") {
    return { label: times.length ? `Todos los días · ${times.join(", ")}` : "Todos los días", times, available: true };
  }
  if (record.type === "WEEKDAYS" && Array.isArray(record.days)) {
    const days = record.days.map(String);
    return {
      label: times.length ? `${days.join(", ")} · ${times.join(", ")}` : days.join(", "),
      times,
      available: days.includes(bogotaWeekday(date)),
    };
  }
  if (record.type === "DATES" && Array.isArray(record.dates)) {
    const dates = record.dates.map(String);
    return {
      label: times.length ? `${dates.join(", ")} · ${times.join(", ")}` : dates.join(", "),
      times,
      available: dates.includes(date),
    };
  }
  return { label: "", times, available: null };
}

function wantsAnyMunicipality(input: Preferences) {
  return input.municipality === ANY_MUNICIPALITY;
}

async function loadCandidates(input: Preferences, scope: "local" | "other" | "any" = "local") {
  const rows = await prisma.experience.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { currency: "COP", price: { lte: input.budgetCop } },
        { currency: { not: "COP" } },
      ],
      ...(scope === "any"
        ? {}
        : {
            locations: scope === "local"
              ? { some: { municipality: { equals: input.municipality, mode: "insensitive" } } }
              : { none: { municipality: { equals: input.municipality, mode: "insensitive" } } },
          }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      currency: true,
      duration: true,
      durationValue: true,
      durationUnit: true,
      imageUrl: true,
      imageUrls: true,
      howToGetThere: true,
      companyContact: true,
      externalUrl: true,
      availability: true,
      categoryId: true,
      category: { select: { name: true } },
      environments: true,
      idealFor: true,
      locations: {
        select: { municipality: true, address: true, department: true, availability: true, howToGetThere: true, latitude: true, longitude: true, position: true },
        orderBy: { position: "asc" },
      },
      experienceCategories: { select: { category: { select: { name: true } }, categoryId: true }, orderBy: { position: "asc" } },
      experienceInterests: { select: { interest: { select: { name: true } } }, orderBy: { position: "asc" } },
    },
    take: scope === "local" ? 60 : scope === "any" ? 120 : 80,
  });
  return rows.map((row) => {
    const requested = input.municipality.toLowerCase();
    const place = scope === "any"
      ? row.locations[0]
      : scope === "local"
        ? row.locations.find((item) => item.municipality.toLowerCase() === requested) ?? row.locations[0]
        : row.locations.find((item) => item.municipality.toLowerCase() !== requested) ?? row.locations[0];
    const availability = readAvailability(place?.availability ?? row.availability, input.date);
    const description = row.description.replace(/\s+/g, " ").trim();
    return {
      id: row.id,
      title: row.title,
      description: description.slice(0, 280),
      descriptionFull: description.slice(0, 1600),
      category: row.category.name,
      categoryId: row.categoryId,
      municipality: place?.municipality || (wantsAnyMunicipality(input) ? "" : input.municipality),
      address: place?.address?.trim() || "",
      price: Number(row.price),
      currency: row.currency,
      durationLabel: row.duration,
      durationMinutes: minutesOf(row.durationValue, row.durationUnit),
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrls.filter(Boolean),
      categoryIds: row.experienceCategories.map((item) => item.categoryId),
      categories: row.experienceCategories.map((item) => item.category.name),
      interests: row.experienceInterests.map((item) => item.interest.name),
      environments: row.environments,
      idealFor: row.idealFor,
      howToGetThere: place?.howToGetThere || row.howToGetThere,
      contact: row.companyContact?.trim() || null,
      externalUrl: row.externalUrl?.trim() || null,
      availabilityLabel: availability.label,
      catalogTimes: availability.times,
      available: availability.available,
      latitude: place?.latitude == null ? null : Number(place.latitude),
      longitude: place?.longitude == null ? null : Number(place.longitude),
      department: place?.department?.trim() || "",
    } satisfies Candidate;
  });
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function asText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function clockMinutes(value: string) {
  if (!CLOCK.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

type BuiltStop = {
  position: number;
  experienceId: string;
  title: string;
  description: string;
  location: string;
  stopType: "experience" | "suggestion";
  included: boolean;
  additionalCost: string;
  durationMinutes: number | null;
  durationLabel: string | null;
  suggestedAt: string;
  suggestedEnd: string;
  imageUrl: string | null;
};

type BuiltPlan = {
  title: string;
  summary: string;
  why: string;
  scheduleLabel: string;
  costNotes: string;
  estimatedCop: number;
  durationLabel: string | null;
  coverImageUrl: string | null;
  primary: Candidate;
  stops: BuiltStop[];
};

function catalogBlob(item: Candidate) {
  return [item.title, item.descriptionFull, item.address, item.municipality, item.howToGetThere ?? "", item.availabilityLabel, ...item.categories, ...item.interests]
    .join(" ")
    .toLocaleLowerCase("es");
}

function looksInvented(text: string, item: Candidate) {
  if (/https?:\/\/|www\.|\$\s?\d|\d{2,3}\.\d{3}/i.test(text)) return true;
  const known = catalogBlob(item);
  const place = item.municipality.toLocaleLowerCase("es");
  const allowed = new Set([
    "visita", "recorrido", "inicio", "llegada", "salida", "experiencia", "tour", "pausa", "tiempo", "final",
    "preparación", "preparacion", "cierre", "regreso", "encuentro", "descanso", "libre", "almuerzo",
    "café", "cafe", "observación", "observacion", "bosque", "aves", "naturaleza", "parque",
    "introducción", "introduccion", "exploración", "exploracion", "caminata", "sendero", "guía", "guia",
    "medellin", "medellín",
  ]);
  const matches = text.matchAll(/\b[A-ZÁÉÍÓÚÑ][\p{L}]{3,}/gu);
  return [...matches].some((match) => {
    const index = match.index ?? 0;
    const previous = text.slice(0, index);
    if (!previous.trim() || /[.!?]\s*$/.test(previous)) return false;
    const folded = match[0].toLocaleLowerCase("es");
    if (allowed.has(folded) || folded === place || place.includes(folded)) return false;
    return !known.includes(folded);
  });
}

function organizingMinutes(item: Candidate, input: Preferences) {
  const userMax = DURATION_BAND[input.durationKey][1];
  const core = item.durationMinutes && item.durationMinutes > 600 ? 600 : item.durationMinutes;
  if (!core) return Math.min(userMax, 180);
  return Math.min(userMax, core + 40);
}

function durationText(minutes: number | null) {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return hours === 1 ? "1 h" : `${hours} h`;
  return `${rest} min`;
}

function formatClock(total: number) {
  const minutes = ((Math.round(total) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function absoluteFrom(clock: string, notBefore: number) {
  const minutes = clockMinutes(clock);
  if (minutes == null) return null;
  if (notBefore <= 0) return minutes;
  let absolute = Math.floor(notBefore / (24 * 60)) * (24 * 60) + minutes;
  if (absolute < notBefore) absolute += 24 * 60;
  return absolute;
}

function shortCopy(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const cut = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  return (cut > 70 ? slice.slice(0, cut + 1) : slice).trim();
}

function scheduleLabel(stops: BuiltStop[]) {
  const starts = stops.map((stop) => stop.suggestedAt).filter((value) => CLOCK.test(value));
  const ends = stops.map((stop) => stop.suggestedEnd).filter((value) => CLOCK.test(value));
  if (starts.length && ends.length) return `${starts[0]} – ${ends[ends.length - 1]}`;
  return "Horario flexible";
}

function stopSpan(stop: BuiltStop) {
  if (stop.stopType === "experience") return Math.max(15, stop.durationMinutes ?? 45);
  return Math.max(10, Math.min(30, stop.durationMinutes ?? 15));
}

function fillTimes(stops: BuiltStop[], catalogStart: string) {
  const anchor = CLOCK.test(catalogStart) ? clockMinutes(catalogStart) : null;
  const firstExperience = stops.findIndex((stop) => stop.stopType === "experience");
  let lead = 0;
  for (let index = 0; index < firstExperience; index += 1) {
    lead += stopSpan(stops[index]!);
  }
  let cursor = anchor != null ? anchor - lead : 8 * 60;
  if (anchor != null && cursor < 6 * 60 && firstExperience > 0) {
    const room = Math.max(0, anchor - 6 * 60);
    const each = Math.max(10, Math.floor(room / firstExperience));
    for (let index = 0; index < firstExperience; index += 1) {
      const stop = stops[index]!;
      stop.durationMinutes = Math.min(stopSpan(stop), each);
    }
    lead = stops.slice(0, firstExperience).reduce((sum, stop) => sum + (stop.durationMinutes ?? 10), 0);
    cursor = Math.max(6 * 60, anchor - lead);
  } else if (cursor < 6 * 60) {
    cursor = 6 * 60;
  }
  for (const [index, stop] of stops.entries()) {
    if (index === firstExperience && anchor != null) cursor = anchor;
    const minutes = stop.stopType === "experience" ? Math.max(15, stop.durationMinutes ?? 45) : stopSpan(stop);
    stop.durationMinutes = minutes;
    stop.durationLabel = durationText(minutes);
    stop.suggestedAt = formatClock(cursor);
    stop.suggestedEnd = formatClock(cursor + minutes);
    cursor += minutes;
  }
}

function ensureCatalogExperience(stops: BuiltStop[], primary: Candidate) {
  const named = stops.find((stop) => stop.title.toLocaleLowerCase("es") === primary.title.toLocaleLowerCase("es"));
  if (named && named.stopType !== "experience") {
    named.stopType = "experience";
    named.included = true;
    named.description = shortCopy(primary.description, 220);
    named.location = primary.address || primary.municipality;
    named.imageUrl = primary.imageUrl;
    if (primary.durationMinutes && primary.durationMinutes > 0) {
      named.durationMinutes = primary.durationMinutes;
      named.durationLabel = durationText(primary.durationMinutes);
    }
  }
  if (stops.some((stop) => stop.stopType === "experience")) return;
  const tail = /^(cierre|regres|salida|final|despu[eé]s)/i;
  const insertAt = stops.findIndex((stop) => tail.test(stop.title));
  const minutes = primary.durationMinutes && primary.durationMinutes > 0 ? primary.durationMinutes : 60;
  stops.splice(insertAt < 0 ? stops.length : insertAt, 0, {
    position: 0,
    experienceId: primary.id,
    title: primary.title,
    description: shortCopy(primary.description, 220),
    location: primary.address || primary.municipality,
    stopType: "experience",
    included: true,
    additionalCost: "",
    durationMinutes: minutes,
    durationLabel: durationText(minutes),
    suggestedAt: "",
    suggestedEnd: "",
    imageUrl: primary.imageUrl,
  });
}

function validatePlan(raw: Record<string, unknown> | null, primary: Candidate, input: Preferences, rule: ScheduleRule) {
  const errors: string[] = [];
  if (!raw) return { errors: ["La respuesta no es JSON."], plan: null as BuiltPlan | null };
  const windowMinutes = organizingMinutes(primary, input);
  const rows = Array.isArray(raw.stops) ? raw.stops : [];
  if (!rows.length) errors.push("El recorrido está vacío.");
  const stops: BuiltStop[] = [];
  const dropped: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const kind = asText(record.type, 40).toLowerCase();
    const title = asText(record.title, 90);
    const description = asText(record.description, 280);
    const minutes = typeof record.durationMinutes === "number" && Number.isFinite(record.durationMinutes) ? Math.round(record.durationMinutes) : null;
    const titleIsMoment = /^(llegad|prepar|encuentro|inicio|cierre|regres|pausa|descanso|tiempo libre|anticipaci)/i.test(title);
    const catalog = kind === "experience" || kind === "catalog_activity";
    const type = catalog && !titleIsMoment ? "experience" : "suggestion";
    if (!title || !description || (kind !== "experience" && kind !== "suggestion" && kind !== "catalog_activity" && kind !== "suggested_moment")) {
      errors.push("Hay una parada sin título, descripción o tipo válido.");
      continue;
    }
    if (type === "experience") {
      const sameTitle = title.toLocaleLowerCase("es") === primary.title.toLocaleLowerCase("es");
      const invented = looksInvented(`${title}. ${description}`, primary);
      const already = stops.some((stop) => stop.stopType === "experience");
      if (invented && !sameTitle && already) {
        dropped.push(`«${title}» agrega datos que no están en la ficha. Márcalo como suggestion si es una pausa, sin nombrar establecimientos.`);
        continue;
      }
      const safeTitle = invented && !sameTitle ? primary.title : title;
      const safeDescription = invented ? shortCopy(primary.description, 220) : description;
      if (sameTitle && already) continue;
      stops.push({
        position: stops.length + 1,
        experienceId: primary.id,
        title: safeTitle,
        description: safeDescription,
        location: primary.address || primary.municipality,
        stopType: "experience",
        included: true,
        additionalCost: "",
        durationMinutes: primary.durationMinutes && primary.durationMinutes > 0 ? primary.durationMinutes : minutes,
        durationLabel: durationText(primary.durationMinutes && primary.durationMinutes > 0 ? primary.durationMinutes : minutes),
        suggestedAt: "",
        suggestedEnd: "",
        imageUrl: primary.imageUrls[stops.filter((stop) => stop.stopType === "experience").length] || primary.imageUrl,
      });
    } else if (/https?:\/\/|www\.|\$\s?\d|\d{2,3}\.\d{3}/i.test(`${title} ${description}`)) {
      dropped.push(`«${title}» incluye un precio o un enlace que no podemos verificar.`);
      continue;
    } else {
      stops.push({
        position: stops.length + 1,
        experienceId: primary.id,
        title,
        description,
        location: primary.municipality,
        stopType: "suggestion",
        included: false,
        additionalCost: "",
        durationMinutes: minutes && minutes > 0 ? Math.min(30, Math.max(10, minutes)) : 15,
        durationLabel: durationText(minutes && minutes > 0 ? Math.min(30, Math.max(10, minutes)) : 15),
        suggestedAt: "",
        suggestedEnd: "",
        imageUrl: null,
      });
    }
    if (stops.length >= 8) break;
  }
  ensureCatalogExperience(stops, primary);
  if (stops.length === 1 && stops[0]?.stopType === "experience") {
    const place = primary.municipality || "el punto de encuentro";
    stops.unshift({
      position: 1,
      experienceId: primary.id,
      title: "Llegada al punto de encuentro",
      description: `Llegada a ${place} para comenzar la actividad publicada. Este momento es una sugerencia y no está incluido en el precio.`,
      location: primary.municipality,
      stopType: "suggestion",
      included: false,
      additionalCost: "",
      durationMinutes: 15,
      durationLabel: durationText(15),
      suggestedAt: "",
      suggestedEnd: "",
      imageUrl: null,
    });
  }
  if (rule.maxMinutes != null && primary.durationMinutes != null && primary.durationMinutes > rule.maxMinutes + 20) {
    errors.push("La duración publicada supera el tope pedido. No la recortes.");
    return { errors, plan: null };
  }
  const publishedStart = pickPublishedStart(primary.catalogTimes, rule);
  if (rule.mandatory && !publishedStart) {
    errors.push("La experiencia no tiene un horario publicado en la franja obligatoria.");
    return { errors, plan: null };
  }
  let used = stops.reduce((sum, stop) => sum + (stop.durationMinutes ?? 0), 0);
  while (used > windowMinutes + 15 && stops.filter((stop) => stop.stopType === "suggestion").length > 1) {
    const extra = stops.map((stop, index) => ({ stop, index })).reverse().find((item) => item.stop.stopType === "suggestion");
    if (!extra) break;
    stops.splice(extra.index, 1);
    used = stops.reduce((sum, stop) => sum + (stop.durationMinutes ?? 0), 0);
  }
  stops.forEach((stop, index) => {
    stop.position = index + 1;
  });
  if (publishedStart) {
    fillTimes(stops, publishedStart);
    let notBefore = 0;
    for (const stop of stops) {
      const start = absoluteFrom(stop.suggestedAt, notBefore);
      const end = clockMinutes(stop.suggestedEnd);
      const minutes = stop.durationMinutes ?? 0;
      const shown = start != null && end != null ? (end - (start % (24 * 60)) + 24 * 60) % (24 * 60) : -1;
      const coherent = start != null && end != null && minutes >= 10 && shown === minutes % (24 * 60);
      if (!coherent) {
        errors.push(`«${stop.title}» no tiene un horario propuesto coherente.`);
        continue;
      }
      if (notBefore > 0 && start < notBefore) errors.push(`«${stop.title}» se superpone con la parada anterior.`);
      notBefore = start + minutes;
    }
  }
  if (!stops.some((stop) => stop.stopType === "experience")) {
    errors.push("Incluye al menos un momento respaldado por la ficha, sin servicios que el texto no confirme.");
  }
  const titles = new Set<string>();
  for (const stop of stops) {
    const key = stop.title.toLocaleLowerCase("es");
    if (titles.has(key)) errors.push(`La parada «${stop.title}» está repetida.`);
    titles.add(key);
  }
  const sameAsExperience = stops.filter((stop) => stop.title.toLocaleLowerCase("es") === primary.title.toLocaleLowerCase("es")).length;
  if (sameAsExperience > 1) errors.push("No repitas el nombre de la experiencia en varias paradas.");
  const experienceMinutes = stops.filter((stop) => stop.stopType === "experience").reduce((sum, stop) => sum + (stop.durationMinutes ?? 0), 0);
  if (used > windowMinutes + 15 && used - experienceMinutes > 45) {
    errors.push("Las sugerencias superan el tiempo disponible. Acórtalas; no cambies la duración de la experiencia.");
  }
  const experienceIndexes = stops.map((stop, index) => (stop.stopType === "experience" ? index : -1)).filter((index) => index >= 0);
  if (experienceIndexes.length > 1) {
    const between = stops.slice(experienceIndexes[0]! + 1, experienceIndexes[experienceIndexes.length - 1]);
    if (between.some((stop) => stop.stopType === "suggestion")) {
      errors.push("No interrumpas la experiencia con sugerencias. Pon la llegada antes y el cierre después.");
    }
  }
  if (stops.length < 2) {
    errors.push("Devuelve al menos 2 momentos distintos. Uno debe salir de la ficha y el otro puede ser llegada o cierre, marcado como suggestion y sin inventar lugares.");
  }
  const planTitle = asText(raw.title, 90);
  if (!planTitle || planTitle.toLocaleLowerCase("es") === primary.title.toLocaleLowerCase("es")) {
    errors.push("El título del plan debe ser propio del recorrido y no copiar el nombre de la experiencia.");
  }
  if (publishedStart) {
    const firstExperience = stops.find((stop) => stop.stopType === "experience");
    if (firstExperience && !primary.catalogTimes.includes(firstExperience.suggestedAt)) {
      errors.push("El momento incluido de la experiencia debe empezar en un horario publicado del catálogo.");
    }
  }
  const experienceStart = stops.find((stop) => stop.stopType === "experience")?.suggestedAt ?? "";
  if (publishedStart && !scheduleFitsRule(experienceStart, rule)) {
    errors.push("El horario propuesto no está en la franja obligatoria.");
  }
  const narrative = [
    asText(raw.title, 90),
    asText(raw.summary, 420),
    asText(raw.whyThisPlan, 700),
    asText(raw.why, 700),
    ...stops.map((stop) => `${stop.title} ${stop.description}`),
  ].join(" ");
  if (narrativeContradictsRule(narrative, rule)) {
    errors.push("El relato describe otro momento del día y no respeta la nota.");
  }
  if (!visibleCopyLooksSpanish([planTitle, narrative])) {
    errors.push("El texto visible debe estar en español.");
  }
  if (errors.length || stops.length < 2) {
    errors.push(...dropped);
    return { errors, plan: null };
  }
  return {
    errors,
    plan: {
      title: planTitle,
      summary: shortCopy(asText(raw.summary, 420), 240),
      why: shortCopy([asText(raw.selectionReason, 220), asText(raw.whyThisPlan, 700) || asText(raw.why, 700)].filter(Boolean).join(" "), 420),
      scheduleLabel: scheduleLabel(stops),
      costNotes: shortCopy(asText(raw.costNotes, 240), 220) || "El valor corresponde al precio publicado de la experiencia. Las sugerencias no están confirmadas como incluidas.",
      estimatedCop: primary.price,
      durationLabel: durationText(used) || primary.durationLabel,
      coverImageUrl: primary.imageUrl || primary.imageUrls[0] || null,
      primary,
      stops,
    } satisfies BuiltPlan,
  };
}

function centroid(items: Candidate[]) {
  const points = items.filter((item) => item.latitude != null && item.longitude != null && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  if (!points.length) return null;
  const latitude = points.reduce((sum, item) => sum + (item.latitude ?? 0), 0) / points.length;
  const longitude = points.reduce((sum, item) => sum + (item.longitude ?? 0), 0) / points.length;
  return { latitude, longitude };
}

function kilometers(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const dLat = (to.latitude - from.latitude) * rad;
  const dLon = (to.longitude - from.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function affordable(items: Candidate[], input: Preferences) {
  return items.filter((item) => item.available !== false && !input.avoid.includes(item.id) && Number.isFinite(item.price) && item.price <= input.budgetCop);
}

function alternativeCopy(input: Preferences, chosen: Candidate, origin: { latitude: number; longitude: number } | null) {
  const there = chosen.latitude != null && chosen.longitude != null ? { latitude: chosen.latitude, longitude: chosen.longitude } : null;
  const distance = origin && there ? kilometers(origin, there) : null;
  const travel = distance == null
    ? "El desplazamiento no está incluido en el precio."
    : `Queda a unos ${Math.max(1, Math.round(distance))} km. El desplazamiento no está incluido en el precio.`;
  return `No encontramos experiencias disponibles en ${input.municipality} para tus preferencias, pero encontramos una alternativa en ${chosen.municipality} que podría encantarte. ${travel}`;
}

const RATE_MESSAGE = "Estamos recibiendo muchas solicitudes en este momento. Intenta generar tu plan nuevamente en unos segundos.";
let plannerBusy = false;
let plannerBlockedUntil = 0;

function rateLimitError() {
  return new ApiError(429, RATE_MESSAGE, "PLANNER_RATE_LIMIT");
}

function claimPlannerSlot() {
  if (Date.now() < plannerBlockedUntil || plannerBusy) throw rateLimitError();
  plannerBusy = true;
}

function releasePlannerSlot() {
  plannerBusy = false;
}

function rememberRateLimit(seconds: number | null) {
  const wait = Math.min(120, Math.max(8, Math.ceil(seconds ?? 20)));
  plannerBlockedUntil = Date.now() + wait * 1000;
}

async function callGroq(input: Parameters<typeof generateStructuredGroqJson>[0]) {
  try {
    return await generateStructuredGroqJson({ ...input, format: "json_schema" });
  } catch (error) {
    if (error instanceof StructuredGroqError && (error.status === 429 || error.groqCode === "rate_limit_exceeded")) {
      rememberRateLimit(error.retryAfterSeconds);
      throw rateLimitError();
    }
    throw error;
  }
}

function spreadByMunicipality<T extends { municipality: string }>(items: T[], limit = 36) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.municipality.toLocaleLowerCase("es");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const buckets = [...groups.values()];
  const picked: T[] = [];
  let cursor = 0;
  while (picked.length < limit && buckets.some((bucket) => bucket.length)) {
    const next = buckets[cursor % buckets.length]?.shift();
    if (next) picked.push(next);
    cursor += 1;
    if (cursor > limit * (buckets.length + 1)) break;
  }
  return picked;
}

async function prepareCandidates(input: Preferences, reading: PreferenceReading) {
  if (wantsAnyMunicipality(input)) {
    const all = await loadCandidates(input, "any");
    const split = splitByEligibility(affordable(all, input), reading);
    const options = shortlistCandidates(spreadByMunicipality(split.eligible), 8);
    if (!options.length) {
      throw new ApiError(422, emptyPlanMessage(reading, split.blocked.map((item) => ({ title: item.item.title, reason: item.reason }))), "PLANNER_EMPTY");
    }
    return { options, origin: centroid(all), reading, blocked: split.blocked, anyPlace: true };
  }
  const local = await loadCandidates(input, "local");
  const localSplit = splitByEligibility(affordable(local, input), reading);
  const localOptions = shortlistCandidates(localSplit.eligible, 8);
  if (localOptions.length) {
    return { options: localOptions, origin: centroid(local), reading, blocked: localSplit.blocked, anyPlace: false };
  }
  const others = await loadCandidates(input, "other");
  const otherSplit = splitByEligibility(affordable(others, input), reading);
  const otherOptions = shortlistCandidates(otherSplit.eligible, 8);
  if (otherOptions.length) {
    return { options: otherOptions, origin: centroid(local), reading, blocked: localSplit.blocked, anyPlace: false };
  }
  throw new ApiError(422, emptyPlanMessage(reading, localSplit.blocked.map((item) => ({ title: item.item.title, reason: item.reason }))), "PLANNER_EMPTY");
}

function preferencePayload(input: Preferences) {
  const anyPlace = wantsAnyMunicipality(input);
  return {
    nota: publicNote(input.note),
    fecha: input.date,
    municipio: anyPlace ? null : input.municipality,
    cualquierMunicipio: anyPlace,
    presupuestoCop: input.budgetCop,
    intereses: input.interests,
    duracion: input.durationKey,
  };
}

function experienceForWriting(item: Candidate) {
  return {
    titulo: item.title,
    municipio: item.municipality,
    direccion: item.address,
    categoria: item.category,
    resumen: item.description.replace(/\s+/g, " ").trim().slice(0, 280),
    intereses: item.interests.slice(0, 5),
    precio: item.price,
    moneda: item.currency,
    duracion: item.durationLabel,
    minutosPublicados: item.durationMinutes,
    horariosPublicados: item.catalogTimes,
    disponibilidad: item.availabilityLabel || null,
  };
}

async function askSelection(input: Preferences, options: Candidate[], repair: string, attempt: number) {
  const { keyed } = assignCandidateKeys(options);
  const keys = keyed.map((item) => item.key);
  const text = await callGroq({
    system: SELECTION_SYSTEM,
    user: JSON.stringify({
      ...preferencePayload(input),
      claves: keys,
      candidatas: keyed.map(({ key, item }) => candidateBrief(key, item)),
      ...(repair ? { errorACorregir: repair } : {}),
    }),
    schemaName: "planner_selection",
    schema: selectionSchema(keys) as unknown as Record<string, unknown>,
    stage: "planner.select",
    attempt,
    maxTokens: 500,
  });
  return { raw: parseGeminiJson(text), keys };
}

async function askItinerary(
  input: Preferences,
  reading: PreferenceReading,
  selected: Candidate,
  reason: string,
  repair: string,
  attempt: number,
) {
  const rule = scheduleRule(reading);
  const text = await callGroq({
    system: ITINERARY_SYSTEM,
    user: JSON.stringify({
      nota: publicNote(input.note),
      fecha: input.date,
      duracion: input.durationKey,
      intereses: input.interests,
      franjaObligatoria: rule.mandatory ? { desde: reading.mandatoryTimeFrom, hasta: reading.mandatoryTimeTo } : null,
      motivo: reason,
      experiencia: experienceForWriting(selected),
      ...(repair ? { errorACorregir: repair } : {}),
    }),
    schemaName: "planner_itinerary",
    schema: itinerarySchema() as unknown as Record<string, unknown>,
    stage: "planner.generate",
    attempt,
    maxTokens: 900,
  });
  return parseGeminiJson(text);
}

function generationFailed() {
  return new ApiError(
    503,
    "Esta vez no logramos crear tu itinerario. Puedes intentarlo de nuevo o ajustar tus preferencias.",
    "PLANNER_GENERATION_FAILED",
  );
}

export async function generateItinerary(input: Preferences) {
  assertFutureDate(input.date);
  if (!hasGroqConfig()) {
    throw ApiError.unavailable("El planificador no está configurado en este momento.");
  }
  const preliminary = applySafetyFloor(input.note, emptyReading());
  const prepared = await prepareCandidates(input, preliminary);
  claimPlannerSlot();
  try {
    const { byKey } = assignCandidateKeys(prepared.options);
    const allowedKeys = [...byKey.keys()];
    let spare = true;
    let repair = "";
    let decision = parseSelection(null, allowedKeys);
    for (let attempt = 1; attempt <= 2 && decision.status === "invalid"; attempt += 1) {
      if (attempt === 2) {
        if (!spare) break;
        spare = false;
      }
      let asked: { raw: Record<string, unknown> | null } = { raw: null };
      try {
        asked = await askSelection(input, prepared.options, repair, attempt);
        decision = parseSelection(asked.raw, allowedKeys);
      } catch (error) {
        if (error instanceof ApiError) throw error;
        decision = parseSelection(null, allowedKeys);
        logger.warn("planner.groq_failed", { stage: "planner.select", attempt, message: error instanceof Error ? error.message : "error" });
      }
      if (decision.status === "invalid") {
        repair = "Si eliges, selectedCandidateKey debe ser una clave de la lista. Si ninguna cumple, responde no_match y null.";
        logger.warn("planner.invalid_choice", {
          stage: "planner.select",
          attempt,
          key: asked.raw?.selectedCandidateKey ?? null,
          selectionStatus: asked.raw?.selectionStatus ?? null,
        });
      }
    }
    if (decision.status === "no_match") {
      const reading = applySafetyFloor(input.note, decision.reading ?? preliminary);
      throw new ApiError(422, emptyPlanMessage(reading, prepared.blocked.map((item) => ({ title: item.item.title, reason: item.reason }))), "PLANNER_EMPTY");
    }
    if (decision.status !== "selected") throw generationFailed();
    const selected = byKey.get(decision.key) ?? null;
    if (!selected) throw generationFailed();
    const reading = applySafetyFloor(input.note, decision.reading ?? preliminary);
    const unfit = blockReason(selected, reading);
    if (unfit) {
      throw new ApiError(422, emptyPlanMessage(reading, [{ title: selected.title, reason: unfit }]), "PLANNER_EMPTY");
    }
    const rule = scheduleRule(reading);
    let writeRepair = "";
    let plan: BuiltPlan | null = null;
    let writeErrors: string[] = [];
    for (let attempt = 1; attempt <= 2 && !plan; attempt += 1) {
      if (attempt === 2) {
        if (!spare) break;
        spare = false;
      }
      try {
        const raw = await askItinerary(input, reading, selected, decision.reason, writeRepair, attempt);
        const checked = validatePlan({ ...(raw ?? {}), selectionReason: decision.reason }, selected, input, rule);
        plan = checked.plan;
        writeErrors = checked.errors;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        writeErrors = ["La respuesta no es JSON."];
        logger.warn("planner.groq_failed", { stage: "planner.generate", attempt, message: error instanceof Error ? error.message : "error" });
      }
      if (!plan) {
        writeRepair = writeErrors.slice(0, 2).join(" ");
        logger.warn("planner.invalid_itinerary", { stage: "planner.generate", attempt, errors: writeErrors });
      }
    }
    if (!plan) {
      const rejected = writeErrors.some((item) => item.includes("franja") || item.includes("momento del día") || item.includes("obligatoria") || item.includes("español"));
      if (rejected) throw new ApiError(422, emptyPlanMessage(reading, []), "PLANNER_EMPTY");
      throw generationFailed();
    }
    const ready = plan;
  const otherPlace = !prepared.anyPlace && ready.primary.municipality.toLocaleLowerCase("es") !== input.municipality.toLocaleLowerCase("es");
  const alternativeMessage = otherPlace ? alternativeCopy(input, ready.primary, prepared.origin) : "";
  return {
    title: ready.title,
    summary: ready.summary,
    why: ready.why,
    date: input.date,
    municipality: ready.primary.municipality,
    requestedMunicipality: prepared.anyPlace ? ready.primary.municipality : input.municipality,
    usedAlternativeMunicipality: otherPlace,
    alternativeMessage,
    scheduleIsSuggested: ready.scheduleLabel !== "Horario flexible",
    people: input.people,
    durationKey: input.durationKey,
    durationLabel: ready.durationLabel,
    scheduleLabel: ready.scheduleLabel,
    budgetCop: input.budgetCop,
    estimatedCop: ready.estimatedCop,
    currency: ready.primary.currency,
    costNotes: ready.costNotes,
    planType: null,
    note: input.note,
    coverImageUrl: ready.coverImageUrl,
    primaryExperienceId: ready.primary.id,
    photos: photoList(ready.primary.imageUrl, ready.primary.imageUrls),
    venue: venueOf(ready.primary),
    stops: ready.stops.map((stop) => ({
      position: stop.position,
      experienceId: stop.experienceId,
      title: stop.title,
      description: stop.description,
      category: ready.primary.category,
      municipality: ready.primary.municipality,
      location: stop.location,
      price: ready.primary.price,
      currency: ready.primary.currency,
      durationLabel: stop.durationLabel,
      durationMinutes: stop.durationMinutes,
      imageUrl: stop.imageUrl,
      suggestedAt: stop.suggestedAt,
      suggestedEnd: stop.suggestedEnd,
      stopType: stop.stopType,
      included: stop.included,
      additionalCost: stop.additionalCost,
    })),
  };
  } finally {
    releasePlannerSlot();
  }
}

const draftSelect = {
  id: true,
  title: true,
  summary: true,
  why: true,
  plannedOn: true,
  municipality: true,
  people: true,
  durationKey: true,
  budgetCop: true,
  planType: true,
  note: true,
  scheduleLabel: true,
  costNotes: true,
  createdAt: true,
  stops: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      suggestedAt: true,
      suggestedEnd: true,
      blurb: true,
      title: true,
      location: true,
      stopType: true,
      included: true,
      additionalCost: true,
      durationMinutes: true,
      experience: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          currency: true,
          duration: true,
          imageUrl: true,
          imageUrls: true,
          category: { select: { name: true } },
          environments: true,
          experienceInterests: { select: { interest: { select: { name: true } } }, orderBy: { position: "asc" as const } },
          experienceCategories: { select: { category: { select: { name: true } } }, orderBy: { position: "asc" as const } },
          locations: {
            select: { municipality: true, address: true, department: true, latitude: true, longitude: true, availability: true },
            orderBy: { position: "asc" as const },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.PlannerItinerarySelect;

function photoList(imageUrl: string | null, imageUrls: string[]) {
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const item of [imageUrl, ...imageUrls]) {
    const value = item?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    photos.push(value);
  }
  return photos;
}

function venueOf(item: {
  department?: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  environments: string[];
  interests: string[];
  categories: string[];
  category?: string;
  available: boolean | null;
}) {
  const latitude = item.latitude != null && Number.isFinite(item.latitude) ? item.latitude : null;
  const longitude = item.longitude != null && Number.isFinite(item.longitude) ? item.longitude : null;
  return {
    department: item.department?.trim() || "",
    address: item.address.trim(),
    latitude,
    longitude,
    environments: item.environments.filter(Boolean),
    interests: item.interests.filter(Boolean),
    categories: (item.categories.length ? item.categories : item.category ? [item.category] : []).filter(Boolean),
    available: item.available,
  };
}

function unpackWhy(value: string) {
  const match = value.match(/^«alt»([\s\S]*?)«\/alt»/);
  if (!match) return { why: value, alternativeMessage: "" };
  return { why: value.slice(match[0].length), alternativeMessage: match[1] ?? "" };
}

function packWhy(why: string, alternative: string) {
  const clean = why.replace(/^«alt»[\s\S]*?«\/alt»/, "");
  if (!alternative.trim()) return clean;
  return `«alt»${alternative.trim()}«/alt»${clean}`;
}

function present(row: Prisma.PlannerItineraryGetPayload<{ select: typeof draftSelect }>) {
  const primary = row.stops[0]?.experience;
  let experienceImage = 0;
  const knownMinutes = row.stops.reduce((sum, stop) => sum + (stop.durationMinutes ?? 0), 0);
  const stops = row.stops.map((stop) => {
    const suggestion = stop.stopType === "suggestion";
    const image = suggestion ? null : stop.experience.imageUrls[experienceImage] || stop.experience.imageUrl;
    if (!suggestion) experienceImage += 1;
    return {
      position: stop.position,
      experienceId: stop.experience.id,
      title: stop.title || stop.experience.title,
      description: stop.blurb || stop.experience.description.replace(/\s+/g, " ").trim().slice(0, 280),
      category: stop.experience.category.name,
      municipality: stop.experience.locations[0]?.municipality || row.municipality,
      location: stop.location || stop.experience.locations[0]?.address || row.municipality,
      price: Number(stop.experience.price),
      currency: stop.experience.currency,
      durationLabel: durationText(stop.durationMinutes) || stop.experience.duration,
      durationMinutes: stop.durationMinutes,
      imageUrl: image,
      suggestedAt: stop.suggestedAt,
      suggestedEnd: stop.suggestedEnd,
      stopType: suggestion ? "suggestion" as const : "experience" as const,
      included: suggestion ? false : stop.included,
      additionalCost: suggestion ? (stop.additionalCost === "Por confirmar" ? "" : stop.additionalCost) : "",
    };
  });
  const unpacked = unpackWhy(row.why);
  const schedule = !row.scheduleLabel || row.scheduleLabel === "Por confirmar" ? "Horario flexible" : row.scheduleLabel;
  const place = primary?.locations[0];
  const availability = readAvailability(place?.availability, row.plannedOn.toISOString().slice(0, 10));
  const venue = primary
    ? venueOf({
      department: place?.department || "",
      address: place?.address || "",
      latitude: place?.latitude == null ? null : Number(place.latitude),
      longitude: place?.longitude == null ? null : Number(place.longitude),
      environments: primary.environments,
      interests: primary.experienceInterests.map((item) => item.interest.name),
      categories: primary.experienceCategories.map((item) => item.category.name),
      category: primary.category.name,
      available: availability.available,
    })
    : null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    why: unpacked.why,
    date: row.plannedOn.toISOString().slice(0, 10),
    municipality: row.municipality,
    requestedMunicipality: row.municipality,
    usedAlternativeMunicipality: Boolean(unpacked.alternativeMessage),
    alternativeMessage: unpacked.alternativeMessage,
    scheduleIsSuggested: schedule !== "Horario flexible",
    people: row.people,
    durationKey: row.durationKey,
    durationLabel: knownMinutes > 0 ? `${Math.max(1, Math.round(knownMinutes / 60))} h aprox.` : primary?.duration ?? null,
    scheduleLabel: schedule,
    budgetCop: row.budgetCop,
    estimatedCop: primary ? Number(primary.price) : 0,
    currency: primary?.currency ?? "COP",
    costNotes: row.costNotes,
    planType: row.planType,
    note: row.note,
    coverImageUrl: primary?.imageUrl || primary?.imageUrls[0] || null,
    photos: primary ? photoList(primary.imageUrl, primary.imageUrls) : [],
    primaryExperienceId: primary?.id ?? null,
    venue,
    createdAt: row.createdAt.toISOString(),
    stops,
  };
}

export async function saveItinerary(userId: string, input: SaveInput) {
  assertFutureDate(input.date);
  const ids = [...new Set(input.stops.map((stop) => stop.experienceId))];
  const found = await prisma.experience.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw ApiError.badRequest("Alguna experiencia del recorrido ya no está disponible.");
  }
  const plannedOn = new Date(`${input.date}T00:00:00.000Z`);
  const primaryId = input.stops[0]?.experienceId;
  const existing = primaryId
    ? await prisma.plannerItinerary.findFirst({
        where: {
          userId,
          title: input.title,
          plannedOn,
          municipality: input.municipality,
          folderKey: input.folderKey,
          stops: { some: { experienceId: primaryId, position: 1 } },
        },
        select: draftSelect,
      })
    : null;
  const sameStops = Boolean(
    existing
    && existing.stops.length === input.stops.length
    && existing.stops.every((stop, index) => {
      const next = input.stops[index];
      return stop.title === (next?.title ?? "") && stop.blurb === (next?.blurb ?? "") && stop.suggestedAt === (next?.suggestedAt ?? "");
    }),
  );
  if (existing && sameStops) return present(existing);
  const created = await prisma.plannerItinerary.create({
    data: {
      userId,
      title: input.title,
      summary: input.summary,
      why: packWhy(input.why, input.alternativeMessage ?? ""),
      plannedOn,
      municipality: input.municipality,
      people: input.people,
      durationKey: input.durationKey,
      budgetCop: input.budgetCop,
      planType: input.planType ?? "aire",
      note: input.note,
      scheduleLabel: input.scheduleLabel ?? "",
      costNotes: input.costNotes ?? "",
      folderKey: input.folderKey,
      stops: {
        create: input.stops.map((stop, index) => ({
          experienceId: stop.experienceId,
          position: index + 1,
          suggestedAt: stop.suggestedAt ?? "",
          suggestedEnd: stop.suggestedEnd ?? "",
          blurb: stop.blurb ?? "",
          title: stop.title ?? "",
          location: stop.location ?? "",
          stopType: stop.stopType ?? "experience",
          included: stop.included ?? stop.stopType !== "suggestion",
          additionalCost: stop.additionalCost ?? "",
          durationMinutes: stop.durationMinutes ?? null,
        })),
      },
    },
    select: draftSelect,
  });
  return present(created);
}

export async function listItineraries(userId: string) {
  const rows = await prisma.plannerItinerary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 48,
    select: {
      id: true,
      title: true,
      summary: true,
      municipality: true,
      plannedOn: true,
      people: true,
      budgetCop: true,
      durationKey: true,
      folderKey: true,
      stops: {
        take: 1,
        orderBy: { position: "asc" },
        select: { experience: { select: { id: true, imageUrl: true, price: true, currency: true, category: { select: { name: true } } } } },
      },
      _count: { select: { stops: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    municipality: row.municipality,
    date: row.plannedOn.toISOString().slice(0, 10),
    people: row.people,
    budgetCop: row.budgetCop,
    durationKey: row.durationKey,
    folderKey: row.folderKey,
    estimatedCop: row.stops[0] ? Number(row.stops[0].experience.price) : 0,
    currency: row.stops[0]?.experience.currency ?? "COP",
    imageUrl: row.stops[0]?.experience.imageUrl ?? null,
    category: row.stops[0]?.experience.category.name ?? "",
    primaryExperienceId: row.stops[0]?.experience.id ?? null,
    stops: row._count.stops,
  }));
}

export async function getItinerary(userId: string, id: string) {
  const row = await prisma.plannerItinerary.findFirst({
    where: { id, userId },
    select: draftSelect,
  });
  if (!row) throw ApiError.notFound("No encontramos ese plan.");
  return present(row);
}
