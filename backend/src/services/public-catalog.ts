import { prisma } from "../database/prisma.js";

const DEPARTMENT_NAMES = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

const PLANS = ["family", "couple", "solo", "friends"] as const;
const PRICES = ["0-50000", "50000-100000", "100000-200000", "200000+"] as const;
const DURATIONS = ["short", "medium", "half", "day"] as const;

export type PublicCatalogPlan = (typeof PLANS)[number];
export type PublicCatalogPrice = (typeof PRICES)[number];
export type PublicCatalogDuration = (typeof DURATIONS)[number];

export type PublicCatalogFilters = {
  q?: string;
  city?: string;
  categoryId?: string;
  price?: string;
  duration?: string;
  plan?: string;
  sort?: "newest" | "oldest";
};

export type CatalogListItem = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  location: string;
  duration: string | null;
  durationValue: number | null;
  durationUnit: "MINUTES" | "HOURS" | "DAYS" | null;
  createdAt: Date;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isDepartment(value: string) {
  const needle = fold(value);
  return DEPARTMENT_NAMES.some((name) => fold(name) === needle);
}

export function municipalityOf(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) {
    return "";
  }
  const last = parts[parts.length - 1];
  if (!isDepartment(last)) {
    return "";
  }
  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }
  if (parts.length === 2) {
    return parts[0];
  }
  return "";
}

function priceNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function matchesPrice(price: number, band: string) {
  if (!band) {
    return true;
  }
  const value = priceNumber(price);
  if (band === "0-50000") {
    return value <= 50000;
  }
  if (band === "50000-100000") {
    return value > 50000 && value <= 100000;
  }
  if (band === "100000-200000") {
    return value > 100000 && value <= 200000;
  }
  if (band === "200000+") {
    return value > 200000;
  }
  return true;
}

function durationMinutes(item: CatalogListItem) {
  if (item.durationValue && item.durationValue > 0 && item.durationUnit) {
    if (item.durationUnit === "MINUTES") {
      return item.durationValue;
    }
    if (item.durationUnit === "HOURS") {
      return item.durationValue * 60;
    }
    return item.durationValue * 60 * 24;
  }
  const text = (item.duration ?? "").toLowerCase();
  const match = text.match(/(\d+)\s*(minuto|hora|día|dia)/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (match[2].startsWith("min")) {
    return amount;
  }
  if (match[2].startsWith("hora")) {
    return amount * 60;
  }
  return amount * 60 * 24;
}

function matchesDuration(item: CatalogListItem, duration: string) {
  if (!duration) {
    return true;
  }
  const minutes = durationMinutes(item);
  if (minutes == null) {
    return false;
  }
  if (duration === "short") {
    return minutes <= 60;
  }
  if (duration === "medium") {
    return minutes > 60 && minutes <= 180;
  }
  if (duration === "half") {
    return minutes > 180 && minutes <= 360;
  }
  if (duration === "day") {
    return minutes > 360;
  }
  return true;
}

function matchesPlan(item: CatalogListItem, plan: string) {
  if (!plan) {
    return true;
  }
  const haystack = `${item.title} ${item.description} ${item.categoryName}`.toLowerCase();
  if (plan === "family") {
    return /familia|familiar|niñ/.test(haystack);
  }
  if (plan === "couple") {
    return /pareja|románt|romant/.test(haystack);
  }
  if (plan === "solo") {
    return /solo|individual|autogui/.test(haystack);
  }
  if (plan === "friends") {
    return /amigo|grupo|compart/.test(haystack);
  }
  return true;
}

function matchesQuery(item: CatalogListItem, query: string) {
  const normalizedQuery = fold(query);
  if (!normalizedQuery) {
    return true;
  }
  const city = municipalityOf(item.location);
  const haystack = fold([item.title, item.categoryName, item.location, city, item.description].join(" "));
  if (haystack.includes(normalizedQuery)) {
    return true;
  }
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

export function catalogFacets(items: CatalogListItem[]) {
  const cities = new Set<string>();
  const categories = new Map<string, string>();
  for (const item of items) {
    const city = municipalityOf(item.location).trim();
    if (city) {
      cities.add(city);
    }
    if (item.categoryId) {
      categories.set(item.categoryId, item.categoryName.trim() || "Sin categoría");
    }
  }
  return {
    cities: [...cities].sort((a, b) => a.localeCompare(b, "es")),
    categories: [...categories.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  };
}

export function filterCatalogItems(items: CatalogListItem[], filters: PublicCatalogFilters) {
  const filtered = items.filter((item) => {
    if (filters.city && municipalityOf(item.location).trim() !== filters.city.trim()) {
      return false;
    }
    if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }
    if (!matchesPrice(item.price, filters.price ?? "")) {
      return false;
    }
    if (!matchesDuration(item, filters.duration ?? "")) {
      return false;
    }
    if (!matchesPlan(item, filters.plan ?? "")) {
      return false;
    }
    if (!matchesQuery(item, filters.q ?? "")) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((left, right) => {
    const delta = left.createdAt.getTime() - right.createdAt.getTime();
    return filters.sort === "oldest" ? delta : -delta;
  });
}

export function paginateCatalog<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const pageCount = total === 0 ? 0 : Math.ceil(total / limit);
  const current = pageCount === 0 ? 1 : Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page: current,
    limit,
    pageCount,
  };
}

export async function listPublicCatalogPage(input: PublicCatalogFilters & { page: number; limit: number }) {
  const rows = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true },
  });
  const items: CatalogListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? "",
    price: Number(row.price),
    location: row.location,
    duration: row.duration,
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    createdAt: row.createdAt,
  }));
  const facets = catalogFacets(items);
  const filtered = filterCatalogItems(items, input);
  const page = paginateCatalog(filtered, input.page, input.limit);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    experiences: page.items.map((item) => byId.get(item.id)!),
    total: page.total,
    page: page.page,
    limit: page.limit,
    pageCount: page.pageCount,
    hasMore: page.pageCount > 0 && page.page < page.pageCount,
    cities: facets.cities,
    categories: facets.categories,
  };
}
