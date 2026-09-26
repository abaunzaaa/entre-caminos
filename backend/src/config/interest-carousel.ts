/** Carrusel de portada. Solo categorías ligadas a los intereses, hasta este cupo. */
export const COVER_RECOMMENDATION_LIMIT = 10;

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
};

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
 * Hasta `limit` experiencias con al menos una categoría ligada a algún interés.
 * Reparte el cupo entre los intereses, en el orden en que el usuario los eligió.
 * No completa con categorías ajenas.
 */
export function selectExperiencesForInterests<T extends Categorized>(
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
