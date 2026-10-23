export type JourneyPlaceInput = {
  position?: number | null;
  department?: string | null;
  municipality?: string | null;
  latitude?: unknown;
  longitude?: unknown;
};

export type JourneyCategoryInput = {
  id?: string | null;
  name?: string | null;
};

export type JourneyExperienceInput = {
  id: string;
  title: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  location?: string | null;
  description?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  locations?: JourneyPlaceInput[] | null;
  /** Categoría principal. Se usa solo si no hay filas en experienceCategories. */
  category?: JourneyCategoryInput | null;
  /** Fuente principal: hasta tres categorías, en el orden registrado. */
  experienceCategories?: Array<{ category?: JourneyCategoryInput | null }> | null;
};

export type JourneyVisitInput = {
  createdAt: Date | string;
  experience: JourneyExperienceInput;
};

export type VisitedJourneyStop = {
  id: string;
  title: string;
  imageUrl: string | null;
  imageUrls: string[];
  location: string;
  description: string;
  department: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  visitedAt: string;
  /** Sedes registradas. La visita no elige una: el mapa usa solo la principal. */
  venueCount: number;
  /** Categorías reales de la experiencia, sin repetir. */
  categories: Array<{ id: string; name: string }>;
};

export function readCoordinate(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function readCoordinatePair(latitude: unknown, longitude: unknown) {
  const lat = readCoordinate(latitude);
  const lng = readCoordinate(longitude);
  if (lat == null || lng == null) {
    return null;
  }
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

/** La sede principal es la de menor position: la que el catálogo copia en la experiencia. */
export function primaryPlace(locations: JourneyPlaceInput[] | null | undefined) {
  const rows = [...(locations ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return rows[0] ?? null;
}

function cleanCategory(category: JourneyCategoryInput | null | undefined) {
  const id = category?.id?.trim() ?? "";
  const name = category?.name?.trim() ?? "";
  if (!id || !name) {
    return null;
  }
  return { id, name };
}

/** Las categorías del vínculo mandan. Si no hay, queda la categoría principal. */
export function readVisitCategories(experience: JourneyExperienceInput) {
  const linked = (experience.experienceCategories ?? [])
    .map((row) => cleanCategory(row.category))
    .filter((category): category is { id: string; name: string } => category != null);
  const source = linked.length > 0 ? linked : [cleanCategory(experience.category)].filter((category): category is { id: string; name: string } => category != null);
  const seen = new Set<string>();
  const categories: Array<{ id: string; name: string }> = [];
  for (const category of source) {
    if (seen.has(category.id)) {
      continue;
    }
    seen.add(category.id);
    categories.push(category);
  }
  return categories;
}

export function toVisitedJourneyStop(visit: JourneyVisitInput): VisitedJourneyStop {
  const experience = visit.experience;
  const place = primaryPlace(experience.locations);
  const coords = (place ? readCoordinatePair(place.latitude, place.longitude) : null) ?? readCoordinatePair(experience.latitude, experience.longitude);
  const parsed = new Date(visit.createdAt);
  return {
    id: experience.id,
    title: experience.title,
    imageUrl: experience.imageUrl?.trim() || null,
    imageUrls: (experience.imageUrls ?? []).map((url) => url.trim()).filter(Boolean),
    location: experience.location?.trim() ?? "",
    description: experience.description?.trim() ?? "",
    department: place?.department?.trim() ?? "",
    municipality: place?.municipality?.trim() ?? "",
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    visitedAt: Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "",
    venueCount: experience.locations?.length ?? 0,
    categories: readVisitCategories(experience),
  };
}
