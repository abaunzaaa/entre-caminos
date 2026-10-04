import { ONBOARDING_INTEREST_ALIASES } from "./onboarding.js";

/** Carrusel de portada. Solo coincidencias con los intereses del usuario, hasta este cupo. */
export const COVER_RECOMMENDATION_LIMIT = 10;

/** Intereses pesan más que ambiente, y ambiente más que compañía. El presupuesto no entra: no hay regla de precio. */
const INTEREST_MATCH_WEIGHT = 10;
const ENVIRONMENT_MATCH_WEIGHT = 3;
const COMPANION_MATCH_WEIGHT = 2;

/**
 * Pistas entre el interés del onboarding y el nombre de la categoría.
 * No se usan sobre el título ni la descripción.
 */
const INTEREST_CATEGORY_HINTS: Record<string, string[]> = {
  naturaleza: ["naturaleza", "outdoor", "aire libre"],
  gastronomia: ["gastronomia", "comida", "cocina", "cafe"],
  cultura: ["cultura", "patrimonio", "museo"],
  aventura: ["aventura", "extremo"],
  relajacion: ["relajacion", "bienestar", "spa"],
  bienestar: ["bienestar", "relajacion", "spa"],
  "vida nocturna": ["nocturna", "fiesta"],
  "arte y creatividad": ["arte", "creatividad"],
  deportes: ["deport"],
  "historia y patrimonio": ["historia", "patrimonio", "museo"],
  musica: ["musica", "concierto"],
  talleres: ["taller", "talleres"],
  "planes urbanos": ["urbano", "ciudad"],
  cafe: ["cafe", "cafeteria"],
  fotografia: ["fotografia", "foto"],
  danza: ["danza", "baile"],
  literatura: ["literatura", "lectura"],
  "fiesta / vida nocturna": ["fiesta", "nocturna"],
};

type CategoryName = { name: string };

type Categorized = {
  id: string;
  title: string;
  category?: CategoryName | null;
  categories?: CategoryName[] | null;
  relatedInterests?: string[] | null;
  environments?: string[] | null;
  idealFor?: string[] | null;
};

export type RecommendationContext = {
  places?: string[] | null;
  companions?: string[] | null;
};

function canonicalInterestName(value: string) {
  const trimmed = value.trim();
  return ONBOARDING_INTEREST_ALIASES[trimmed] ?? trimmed;
}

function relatedInterestNames(experience: Categorized) {
  const names: string[] = [];
  for (const interest of experience.relatedInterests ?? []) {
    const canonical = canonicalInterestName(interest);
    const key = foldInterestText(canonical);
    if (!key || names.some((existing) => foldInterestText(existing) === key)) {
      continue;
    }
    names.push(canonical);
  }
  return names;
}

function foldedKeys(values?: string[] | null) {
  const keys: string[] = [];
  for (const value of values ?? []) {
    const key = foldInterestText(value);
    if (!key || keys.includes(key)) {
      continue;
    }
    keys.push(key);
  }
  return keys;
}

function sharesAny(left?: string[] | null, right?: string[] | null) {
  const wanted = new Set(foldedKeys(right));
  return foldedKeys(left).some((key) => wanted.has(key));
}

function sharedInterestCount(experience: Categorized, interests: string[]) {
  const related = new Set(relatedInterestNames(experience).map((name) => foldInterestText(name)));
  let score = 0;
  const seen = new Set<string>();
  for (const interest of interests) {
    const key = foldInterestText(canonicalInterestName(interest));
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (related.has(key)) {
      score += 1;
    }
  }
  return score;
}

export function foldInterestText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function categoryMatchesInterest(interest: string, categoryName?: string | null) {
  const key = foldInterestText(interest);
  const category = foldInterestText(categoryName ?? "");
  if (!key || category.length < 4) {
    return false;
  }
  if (category === key || category.includes(key) || key.includes(category)) {
    return true;
  }
  return (INTEREST_CATEGORY_HINTS[key] ?? []).some((hint) => hint.length >= 4 && category.includes(hint));
}

/** Nombres de categoría de la experiencia. Hoy llega una; más adelante puede haber varias. */
export function experienceCategoryNames(experience: {
  category?: CategoryName | null;
  categories?: CategoryName[] | null;
}) {
  const names: string[] = [];
  const push = (name?: string | null) => {
    const trimmed = name?.trim();
    if (!trimmed) {
      return;
    }
    const key = foldInterestText(trimmed);
    if (names.some((existing) => foldInterestText(existing) === key)) {
      return;
    }
    names.push(trimmed);
  };
  push(experience.category?.name);
  for (const category of experience.categories ?? []) {
    push(category?.name);
  }
  return names;
}

export function experienceMatchesInterest(
  interest: string,
  experience: { category?: CategoryName | null; categories?: CategoryName[] | null },
) {
  return experienceCategoryNames(experience).some((name) => categoryMatchesInterest(interest, name));
}

/**
 * FALLBACK TEMPORAL.
 * Solo para experiencias que todavía no tienen intereses relacionados.
 * Compara los intereses del usuario con el nombre de la categoría, como antes.
 * Cuando el catálogo tenga intereses en cada experiencia, esta función puede retirarse.
 */
function selectExperiencesByCategoryFallback<T extends Categorized>(
  experiences: T[],
  interests: string[],
  limit = COVER_RECOMMENDATION_LIMIT,
): T[] {
  const buckets: T[][] = [];
  const seenInterests = new Set<string>();
  for (const interest of interests) {
    const key = foldInterestText(interest);
    if (!key || seenInterests.has(key)) {
      continue;
    }
    seenInterests.add(key);
    buckets.push(
      experiences
        .filter((item) => experienceMatchesInterest(interest, item))
        .sort((left, right) => left.title.localeCompare(right.title, "es")),
    );
  }

  const used = new Set<string>();
  const selected: T[] = [];
  let added = true;
  while (selected.length < limit && added) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.find((item) => !used.has(item.id));
      if (!next) {
        continue;
      }
      used.add(next.id);
      selected.push(next);
      added = true;
      if (selected.length >= limit) {
        break;
      }
    }
  }
  return selected;
}

/**
 * Hasta `limit` experiencias.
 * Si la experiencia tiene intereses relacionados, cuenta la intersección con los del usuario.
 * Más coincidencias van primero. No completa con experiencias sin relación.
 * Las que aún no tienen intereses usan el fallback temporal por categoría.
 */
function recommendationScore(experience: Categorized, interests: string[], context?: RecommendationContext) {
  const shared = sharedInterestCount(experience, interests);
  if (shared <= 0) {
    return 0;
  }
  return (
    shared * INTEREST_MATCH_WEIGHT +
    (sharesAny(experience.environments, context?.places) ? ENVIRONMENT_MATCH_WEIGHT : 0) +
    (sharesAny(experience.idealFor, context?.companions) ? COMPANION_MATCH_WEIGHT : 0)
  );
}

export function selectExperiencesForInterests<T extends Categorized>(
  experiences: T[],
  interests: string[],
  limit = COVER_RECOMMENDATION_LIMIT,
  context?: RecommendationContext,
): T[] {
  const active = interests.map(canonicalInterestName).filter((interest) => foldInterestText(interest));
  if (!active.length) {
    return [];
  }

  const linked = experiences.filter((item) => relatedInterestNames(item).length > 0);
  const legacy = experiences.filter((item) => relatedInterestNames(item).length === 0);
  const ranked = linked
    .map((item) => ({ item, score: recommendationScore(item, active, context) }))
    .filter((row) => row.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.item.title.localeCompare(right.item.title, "es"),
    )
    .map((row) => row.item);

  const selected = ranked.slice(0, limit);
  if (selected.length >= limit) {
    return selected;
  }

  const used = new Set(selected.map((item) => item.id));
  for (const item of selectExperiencesByCategoryFallback(legacy, active, limit)) {
    if (selected.length >= limit) {
      break;
    }
    if (used.has(item.id)) {
      continue;
    }
    used.add(item.id);
    selected.push(item);
  }
  return selected;
}
