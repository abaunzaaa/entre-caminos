import type { NearbyExperience } from "../services/catalog.service";

export type MapPriceBand = "free" | "to50" | "mid" | "over100";
export type MapDistanceBand = 5 | 10 | 25 | 50;
export type MapRatingBand = 3 | 4;
export type MapSort = "near" | "rating" | "price-asc" | "price-desc" | "recent";

export const MAP_COMPANIONS = ["Solo", "En pareja", "Amigos", "Familia"] as const;

export type MapFilters = {
  categories: string[];
  companions: string[];
  price: MapPriceBand | null;
  distance: MapDistanceBand | null;
  rating: MapRatingBand | null;
};

export const EMPTY_MAP_FILTERS: MapFilters = {
  categories: [],
  companions: [],
  price: null,
  distance: null,
  rating: null,
};

const PREFERRED_CATEGORIES = [
  "Gastronomía",
  "Aventura",
  "Cultura",
  "Bienestar",
  "Recreativo",
  "Turístico",
  "Talleres",
  "Vida nocturna",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function categoryOptions(experiences: NearbyExperience[]) {
  const names = new Set<string>();
  for (const experience of experiences) {
    for (const name of experience.categoryNames ?? []) {
      const trimmed = name.trim();
      if (trimmed) {
        names.add(trimmed);
      }
    }
  }
  return [...names].sort((left, right) => {
    const leftRank = PREFERRED_CATEGORIES.findIndex((name) => normalize(name) === normalize(left));
    const rightRank = PREFERRED_CATEGORIES.findIndex((name) => normalize(name) === normalize(right));
    const leftOrder = leftRank === -1 ? PREFERRED_CATEGORIES.length : leftRank;
    const rightOrder = rightRank === -1 ? PREFERRED_CATEGORIES.length : rightRank;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right, "es");
  });
}

function priceCop(experience: NearbyExperience) {
  const amount = Number(experience.price);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return (experience.currency || "COP").toUpperCase() === "COP" ? amount : null;
}

function matchesPrice(experience: NearbyExperience, band: MapPriceBand) {
  const amount = priceCop(experience);
  if (amount == null) {
    return false;
  }
  if (band === "free") {
    return amount === 0;
  }
  if (band === "to50") {
    return amount > 0 && amount <= 50_000;
  }
  if (band === "mid") {
    return amount > 50_000 && amount <= 100_000;
  }
  return amount > 100_000;
}

export function applyMapResults(
  experiences: NearbyExperience[],
  filters: MapFilters,
  sort: MapSort,
  nameQuery = "",
) {
  const selected = new Set(filters.categories.map(normalize));
  const companions = new Set(filters.companions);
  const needle = normalize(nameQuery.trim());
  const visible = experiences.filter((experience) => {
    if (needle && !normalize(experience.title).includes(needle)) {
      return false;
    }
    if (selected.size) {
      const names = (experience.categoryNames ?? []).map(normalize);
      if (!names.some((name) => selected.has(name))) {
        return false;
      }
    }
    if (companions.size) {
      const values = experience.idealFor ?? [];
      if (!values.some((value) => companions.has(value))) {
        return false;
      }
    }
    if (filters.price && !matchesPrice(experience, filters.price)) {
      return false;
    }
    if (filters.distance != null && experience.distanceKm > filters.distance) {
      return false;
    }
    if (filters.rating != null) {
      const rating = experience.averageRating;
      if (rating == null || rating < filters.rating) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...visible];
  sorted.sort((left, right) => {
    if (sort === "rating") {
      const leftRating = left.averageRating ?? -1;
      const rightRating = right.averageRating ?? -1;
      if (leftRating !== rightRating) {
        return rightRating - leftRating;
      }
    }
    if (sort === "price-asc" || sort === "price-desc") {
      const leftPrice = priceCop(left);
      const rightPrice = priceCop(right);
      if (leftPrice == null || rightPrice == null) {
        return leftPrice == null ? 1 : -1;
      }
      if (leftPrice !== rightPrice) {
        return sort === "price-asc" ? leftPrice - rightPrice : rightPrice - leftPrice;
      }
    }
    if (sort === "recent") {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }
    return left.distanceKm - right.distanceKm;
  });
  return sorted;
}

export function filtersAreActive(filters: MapFilters) {
  return (
    filters.categories.length > 0 ||
    filters.companions.length > 0 ||
    filters.price != null ||
    filters.distance != null ||
    filters.rating != null
  );
}
