import type { OrganizationProfile, Prisma } from "@prisma/client";
import { calculateFeaturedScore, FEATURED_RECENT_ACTIVITY_DAYS, isWithinFeaturedPeriod } from "../config/featured-score.js";
import { prisma } from "../database/prisma.js";
import { listApprovedCategoryNames } from "./category.service.js";
import { toPublicOrganizationProfile } from "./organization-profile.service.js";
import { recentGuideHistory } from "../utils/guide-history.js";

const GUIDE_CANDIDATE_LIMIT = 16;

export type GuideCatalogItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  address: string | null;
  area: string;
  howToGetThere: string | null;
  availabilityLabel: string;
  price: unknown;
  duration: string | null;
  imageUrl: string | null;
  category: string | null;
};

export type GuideExperienceContext = {
  id?: string;
  name?: string;
  category?: string;
  location?: string;
  price?: string | number;
  duration?: string;
  description?: string;
  availableDays?: unknown;
  howToGetThere?: string;
};

export type GuideChatContext = {
  mode?: "general" | "experience";
  experience?: GuideExperienceContext;
};

function formatAvailability(value: unknown) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const times = Array.isArray(record.times)
      ? record.times.filter((item): item is string => typeof item === "string").join(", ")
      : "";
    if (record.type === "COMING_SOON") {
      return "Próximamente";
    }
    if (record.type === "EVERY_DAY") {
      return times ? `Todos los días · Horarios: ${times}` : "Todos los días";
    }
    if (record.type === "WEEKDAYS" && Array.isArray(record.days)) {
      const days = record.days.map(String).join(", ");
      return times ? `${days} · Horarios: ${times}` : days;
    }
    if (Array.isArray(record.availableDays)) {
      return record.availableDays.map(String).join(", ");
    }
    if (record.type === "DATES" && Array.isArray(record.dates)) {
      const dates = record.dates.map(String).join(", ");
      return times ? `${dates} · Horarios: ${times}` : dates;
    }
    try {
      return JSON.stringify(value).slice(0, 280);
    } catch {
      return "";
    }
  }
  return String(value);
}

type GuidePlace = {
  address: string;
  municipality: string;
  department: string;
  howToGetThere: string | null;
  availability: unknown;
};

const guideCatalogInclude = {
  category: true,
  experienceCategories: {
    orderBy: { position: "asc" as const },
    include: { category: { select: { name: true } } },
  },
  locations: { orderBy: { position: "asc" as const }, take: 3 },
} as const;

const guideDetailInclude = {
  ...guideCatalogInclude,
  creator: {
    select: {
      organizationProfile: {
        select: {
          tradeName: true,
          description: true,
          logoUrl: true,
          department: true,
          city: true,
          contactPhone: true,
          contactEmail: true,
          website: true,
          address: true,
        },
      },
    },
  },
} as const;

const rankSelect = {
  id: true,
  title: true,
  price: true,
  isFeatured: true,
  featuredOrder: true,
  featuredFrom: true,
  featuredUntil: true,
  location: true,
  locations: { select: { municipality: true, department: true } },
} as const;

function foldText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parsePriceMax(message: string) {
  const match = message.match(
    /(?:menos de|hasta|m[aá]ximo(?: de)?|por debajo de)\s*\$?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{4,})/i,
  );
  if (!match?.[1]) {
    return undefined;
  }
  const value = Number(match[1].replace(/[.\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

const TEXT_STOPWORDS = new Set([
  "quiero",
  "algo",
  "unas",
  "para",
  "como",
  "desde",
  "hasta",
  "menos",
  "maximo",
  "experiencia",
  "experiencias",
  "recomiendame",
  "recomienda",
  "recomiendas",
  "puedo",
  "hacer",
  "tengo",
  "esta",
  "este",
  "esto",
  "cerca",
  "plan",
  "planes",
  "lugar",
  "lugares",
  "barato",
  "barata",
  "baratos",
  "economico",
  "economica",
  "economicos",
  "economicas",
  "muestrame",
  "muestra",
  "mostrar",
  "dime",
  "busco",
  "buscar",
  "cuales",
  "alguna",
  "algunas",
  "algun",
  "algunos",
  "hola",
  "buenas",
  "gracias",
  "disponible",
  "disponibles",
  "disponibilidad",
  "todos",
  "dias",
  "tranquilo",
  "tranquila",
  "bueno",
  "buena",
  "mejor",
  "gusta",
  "gustar",
  "gustaria",
  "favorito",
  "favoritos",
  "guardado",
  "guardados",
]);

type RankRow = {
  id: string;
  title: string;
  price: unknown;
  isFeatured: boolean;
  featuredOrder: number | null;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  location: string;
  locations: Array<{ municipality: string; department: string }>;
};

function parseDurationMaxMinutes(message: string) {
  const hours = message.match(/(?:menos de|hasta|m[aá]ximo(?: de)?)\s*(\d+)\s*horas?/i);
  if (hours?.[1]) {
    return Number(hours[1]) * 60;
  }
  const minutes = message.match(/(?:menos de|hasta|m[aá]ximo(?: de)?)\s*(\d+)\s*minutos?/i);
  if (minutes?.[1]) {
    return Number(minutes[1]);
  }
  return undefined;
}

function meaningfulWords(value: string) {
  return foldText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !TEXT_STOPWORDS.has(token));
}

function sameWord(left: string, right: string) {
  if (left === right) {
    return true;
  }
  const short = left.length <= right.length ? left : right;
  const long = left.length <= right.length ? right : left;
  if (short.length < 5 || long.length - short.length > 2 || !long.startsWith(short)) {
    return false;
  }
  const suffix = long.slice(short.length);
  return suffix === "s" || suffix === "es";
}

function searchTokens(message: string, reserved: string[]) {
  const reservedKeys = new Set(reserved.flatMap((item) => meaningfulWords(item)));
  return [...new Set(meaningfulWords(message).filter((token) => !reservedKeys.has(token)))].slice(0, 4);
}

function namedLabels(message: string, labels: string[]) {
  const text = foldText(message);
  const messageTokens = meaningfulWords(message);
  return labels.filter((name) => {
    const key = foldText(name);
    if (key.length >= 6 && text.includes(key)) {
      return true;
    }
    return meaningfulWords(name).some((word) => messageTokens.some((token) => sameWord(token, word)));
  });
}

function wantsEveryDay(message: string) {
  return /todos los d[ií]as|cualquier d[ií]a|every_day|all_days/i.test(message);
}

function prefersCheap(message: string) {
  return /barat|econ[oó]mic|precio bajo/i.test(message);
}

function placeLabels(rows: Array<{ location: string; locations: Array<{ municipality: string; department: string }> }>) {
  const labels = new Set<string>();
  for (const row of rows) {
    for (const part of row.location.split(/[,;/]/)) {
      const label = part.trim();
      if (label.length >= 4) {
        labels.add(label);
      }
    }
    for (const place of row.locations) {
      if (place.municipality.trim().length >= 4) {
        labels.add(place.municipality.trim());
      }
      if (place.department.trim().length >= 4) {
        labels.add(place.department.trim());
      }
    }
  }
  return [...labels].sort((left, right) => right.length - left.length);
}

function mentionedPlace(message: string, labels: string[]) {
  const text = foldText(message);
  return labels.find((label) => text.includes(foldText(label)));
}

function placeWhere(place: string): Prisma.ExperienceWhereInput {
  return {
    OR: [
      { location: { contains: place, mode: "insensitive" } },
      { locations: { some: { municipality: { equals: place, mode: "insensitive" } } } },
      { locations: { some: { department: { equals: place, mode: "insensitive" } } } },
    ],
  };
}

function durationWhere(maxMinutes: number): Prisma.ExperienceWhereInput {
  const options: Prisma.ExperienceWhereInput[] = [
    { durationUnit: "MINUTES", durationValue: { lte: maxMinutes } },
  ];
  if (maxMinutes >= 60) {
    options.push({ durationUnit: "HOURS", durationValue: { lte: Math.floor(maxMinutes / 60) } });
  }
  if (maxMinutes >= 24 * 60) {
    options.push({ durationUnit: "DAYS", durationValue: { lte: Math.floor(maxMinutes / (24 * 60)) } });
  }
  return { OR: options };
}

function textWhere(tokens: string[]): Prisma.ExperienceWhereInput {
  return {
    OR: tokens.flatMap((token) => [
      { title: { contains: token, mode: "insensitive" as const } },
      { description: { contains: token, mode: "insensitive" as const } },
      { location: { contains: token, mode: "insensitive" as const } },
      { category: { name: { contains: token, mode: "insensitive" as const } } },
      { experienceCategories: { some: { category: { name: { contains: token, mode: "insensitive" as const } } } } },
      { experienceInterests: { some: { interest: { name: { contains: token, mode: "insensitive" as const } } } } },
      { locations: { some: { municipality: { contains: token, mode: "insensitive" as const } } } },
      { locations: { some: { department: { contains: token, mode: "insensitive" as const } } } },
    ]),
  };
}

function everyDayWhere(): Prisma.ExperienceWhereInput {
  const type = { path: ["type"], equals: "EVERY_DAY" };
  return {
    OR: [{ availability: type }, { locations: { some: { availability: type } } }],
  };
}

async function publicScores(ids: string[]) {
  const scores = new Map<string, number>();
  if (!ids.length) {
    return scores;
  }
  const since = new Date(Date.now() - FEATURED_RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  const where = { experienceId: { in: ids } };
  const recentWhere = { experienceId: { in: ids }, createdAt: { gte: since } };
  const [views, favorites, reviews, recentViews, recentFavorites, recentReviews] = await Promise.all([
    prisma.experienceDetailView.groupBy({ by: ["experienceId"], where, _count: { _all: true } }),
    prisma.experienceFavorite.groupBy({ by: ["experienceId"], where, _count: { _all: true } }),
    prisma.experienceVisitorReview.groupBy({
      by: ["experienceId"],
      where,
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.experienceDetailView.groupBy({ by: ["experienceId"], where: recentWhere, _count: { _all: true } }),
    prisma.experienceFavorite.groupBy({ by: ["experienceId"], where: recentWhere, _count: { _all: true } }),
    prisma.experienceVisitorReview.groupBy({ by: ["experienceId"], where: recentWhere, _count: { _all: true } }),
  ]);
  const countOf = (rows: Array<{ experienceId: string; _count: { _all: number } }>) =>
    new Map(rows.map((row) => [row.experienceId, row._count._all]));
  const viewMap = countOf(views);
  const favoriteMap = countOf(favorites);
  const recentViewMap = countOf(recentViews);
  const recentFavoriteMap = countOf(recentFavorites);
  const recentReviewMap = countOf(recentReviews);
  const reviewMap = new Map(reviews.map((row) => [row.experienceId, row]));
  for (const id of ids) {
    const review = reviewMap.get(id);
    scores.set(
      id,
      calculateFeaturedScore({
        visits: viewMap.get(id) ?? 0,
        favorites: favoriteMap.get(id) ?? 0,
        reviews: review?._count._all ?? 0,
        rating: review?._avg.rating ?? 0,
        recentActivity: (recentViewMap.get(id) ?? 0) + (recentFavoriteMap.get(id) ?? 0) + (recentReviewMap.get(id) ?? 0),
      }),
    );
  }
  return scores;
}

function rowMatchesCity(row: RankRow, city: string) {
  const key = foldText(city);
  if (key.length < 4) {
    return false;
  }
  if (foldText(row.location).includes(key)) {
    return true;
  }
  return row.locations.some((place) => foldText(place.municipality) === key || foldText(place.department) === key);
}

async function orderCandidateIds(rows: RankRow[], cheap: boolean) {
  const scores = await publicScores(rows.map((row) => row.id));
  const now = new Date();
  return [...rows]
    .sort((left, right) => {
      if (cheap) {
        const price = Number(left.price) - Number(right.price);
        if (price !== 0) {
          return price;
        }
      }
      const leftFeatured = left.isFeatured && isWithinFeaturedPeriod(left, now);
      const rightFeatured = right.isFeatured && isWithinFeaturedPeriod(right, now);
      if (leftFeatured !== rightFeatured) {
        return leftFeatured ? -1 : 1;
      }
      if (leftFeatured && rightFeatured) {
        const order = (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER);
        if (order !== 0) {
          return order;
        }
      }
      const score = (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0);
      if (score !== 0) {
        return score;
      }
      return left.title.localeCompare(right.title, "es");
    })
    .slice(0, GUIDE_CANDIDATE_LIMIT)
    .map((row) => row.id);
}

async function generalCandidateIds(rows: RankRow[], city: string) {
  const scores = await publicScores(rows.map((row) => row.id));
  const now = new Date();
  const byScore = [...rows].sort((left, right) => {
    const score = (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0);
    if (score !== 0) {
      return score;
    }
    return left.title.localeCompare(right.title, "es");
  });
  const featured = byScore
    .filter((row) => row.isFeatured && isWithinFeaturedPeriod(row, now))
    .sort(
      (left, right) =>
        (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER),
    );
  const local = city ? byScore.filter((row) => rowMatchesCity(row, city)) : [];
  const picked: RankRow[] = [];
  for (const row of [...featured, ...local, ...byScore]) {
    if (picked.length >= GUIDE_CANDIDATE_LIMIT) {
      break;
    }
    if (!picked.some((item) => item.id === row.id)) {
      picked.push(row);
    }
  }
  return picked.map((row) => row.id);
}

function clipFact(value: string | null | undefined, max: number) {
  const text = value?.trim() ?? "";
  return text ? text.slice(0, max) : "";
}

function placeOf(item: {
  location: string;
  howToGetThere: string | null;
  availability: unknown;
  locations: GuidePlace[];
}) {
  const primary = item.locations[0];
  const address = clipFact(primary?.address, 180);
  const municipality = clipFact(primary?.municipality, 80);
  const department = clipFact(primary?.department, 80);
  const area = [municipality, department].filter(Boolean).join(", ") || item.location;
  return {
    address: address || null,
    area,
    howToGetThere: clipFact(primary?.howToGetThere || item.howToGetThere, 220) || null,
    availabilityLabel: formatAvailability(primary?.availability ?? item.availability),
  };
}

function toCatalogItem(item: {
  id: string;
  title: string;
  description: string;
  location: string;
  price: unknown;
  duration: string | null;
  imageUrl: string | null;
  howToGetThere: string | null;
  availability: unknown;
  category: { name: string } | null;
  experienceCategories?: Array<{ category: { name: string } }>;
  locations: GuidePlace[];
}): GuideCatalogItem {
  const place = placeOf(item);
  const names = (item.experienceCategories ?? []).map((link) => link.category.name).filter(Boolean);
  return {
    id: item.id,
    title: item.title,
    description: item.description.slice(0, 280),
    location: item.location,
    address: place.address,
    area: place.area,
    howToGetThere: place.howToGetThere,
    availabilityLabel: place.availabilityLabel,
    price: item.price,
    duration: item.duration,
    imageUrl: item.imageUrl,
    category: names.join(", ") || item.category?.name || null,
  };
}

function organizationLine(profile: Partial<OrganizationProfile> | null | undefined) {
  const publicProfile = toPublicOrganizationProfile(profile as OrganizationProfile | null | undefined);
  if (!publicProfile) {
    return "";
  }
  const contact = [publicProfile.contactPhone, publicProfile.website, publicProfile.contactEmail]
    .filter(Boolean)
    .join(", ");
  return [
    `Organización: ${publicProfile.tradeName} (${publicProfile.city}, ${publicProfile.department}).`,
    publicProfile.description.slice(0, 240),
    publicProfile.address ? `Dirección de la organización: ${publicProfile.address}.` : "",
    `Contacto público: ${contact || "no publicado"}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function locationLines(item: GuideCatalogItem) {
  if (item.address) {
    return [`Lugar: ${item.area || item.location}.`, `Dirección: ${item.address}.`];
  }
  return [
    `Ubicación publicada: ${item.location || "no indicada"}.`,
    "Dirección de sede: no hay una calle guardada por separado. Si la ubicación publicada no trae calle, di que no hay una dirección exacta publicada. No inventes una.",
  ];
}

function publicDetailBlock(
  index: number | null,
  item: GuideCatalogItem,
  description: string,
  organization: string,
  contact: string | null | undefined,
) {
  return [
    index ? `${index}. ${item.title}` : item.title,
    `Categorías: ${item.category || "no indicada"}.`,
    ...locationLines(item),
    `Cómo llegar: ${item.howToGetThere || "no indicado"}.`,
    `Precio: ${String(item.price)}.`,
    `Duración: ${item.duration || "no indicada"}.`,
    `Disponibilidad: ${item.availabilityLabel || "no indicada"}.`,
    `Descripción: ${description || "no indicada"}.`,
    `Contacto público de la experiencia: ${contact?.trim() || "no publicado"}.`,
    organization || "Organización: no hay un perfil público completo.",
  ].join(" ");
}

function catalogFactLine(item: GuideCatalogItem) {
  return [
    `- ${item.id}`,
    item.title,
    item.category ?? "Experiencia",
    item.address ? `lugar: ${item.area || item.location}` : `ubicación publicada: ${item.location}`,
    item.address ? `dirección: ${item.address}` : "dirección de sede: no separada",
    `cómo llegar: ${item.howToGetThere || "no indicado"}`,
    `precio: ${String(item.price)}`,
    `duración: ${item.duration || "no indicada"}`,
    `disponibilidad: ${item.availabilityLabel || "no indicada"}`,
  ].join(" | ");
}

export async function loadGuideContext(input: {
  userId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  experienceId?: string;
  highlightIds?: string[];
  context?: GuideChatContext;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const generalMode = input.context?.mode === "general";
  const experienceId = generalMode ? undefined : input.experienceId || input.context?.experience?.id;
  const [categoryNames, interestRows, user, profile] = await Promise.all([
    listApprovedCategoryNames(),
    prisma.interest.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: {
        city: true,
        department: true,
        interests: true,
        companions: true,
        places: true,
        budget: true,
        climate: true,
      },
    }),
  ]);
  const interestNames = interestRows.map((row) => row.name);
  const askedCategories = namedLabels(input.message, categoryNames);
  const askedInterests = namedLabels(input.message, interestNames);
  const priceMax = parsePriceMax(input.message);
  const maxMinutes = parseDurationMaxMinutes(input.message);
  const everyDay = wantsEveryDay(input.message);
  const wantsFavorites = /favorit|guardad|tengo guardado|mis guardad/i.test(input.message);
  const wantsSimilar = wantsFavorites && /parecid|similar|como (mis|los|lo)/i.test(input.message);
  const cheap = prefersCheap(input.message);
  const placePool = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    select: { location: true, locations: { select: { municipality: true, department: true } } },
  });
  const publishedCount = placePool.length;
  const place = mentionedPlace(input.message, placeLabels(placePool));
  const tokens = searchTokens(input.message, [...askedCategories, ...askedInterests, place ?? ""]);
  const filters: Prisma.ExperienceWhereInput[] = [{ status: "PUBLISHED" }];
  if (priceMax) {
    filters.push({ price: { lte: priceMax } });
  }
  const topic: Prisma.ExperienceWhereInput[] = [];
  if (askedCategories.length) {
    topic.push(
      { category: { name: { in: askedCategories } } },
      { experienceCategories: { some: { category: { name: { in: askedCategories } } } } },
    );
  }
  if (askedInterests.length) {
    topic.push({ experienceInterests: { some: { interest: { name: { in: askedInterests } } } } });
  }
  if (topic.length) {
    filters.push({ OR: topic });
  }
  if (place) {
    filters.push(placeWhere(place));
  }
  if (maxMinutes) {
    filters.push(durationWhere(maxMinutes));
  }
  if (everyDay) {
    filters.push(everyDayWhere());
  }
  const structured = filters.length > 1;
  const whereBase: Prisma.ExperienceWhereInput = { AND: filters };
  const whereWithText: Prisma.ExperienceWhereInput = {
    AND: [...filters, ...(tokens.length ? [textWhere(tokens)] : [])],
  };
  let candidateIds: string[] = [];
  let retrievalNote = "";
  if (wantsFavorites && wantsSimilar) {
    const saved = await prisma.experienceFavorite.findMany({
      where: { userId: input.userId, experience: { status: "PUBLISHED" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        experience: {
          select: {
            id: true,
            title: true,
            category: { select: { name: true } },
            experienceCategories: { select: { category: { select: { name: true } } } },
          },
        },
      },
    });
    const savedIds = saved.map((row) => row.experience.id);
    const savedCategories = [
      ...new Set(
        saved.flatMap((row) => [
          row.experience.category?.name,
          ...row.experience.experienceCategories.map((link) => link.category.name),
        ]),
      ),
    ].filter((name): name is string => Boolean(name));
    const similarWhere: Prisma.ExperienceWhereInput = {
      AND: [
        ...filters,
        { id: { notIn: savedIds.length ? savedIds : ["__none__"] } },
        savedCategories.length
          ? {
              OR: [
                { category: { name: { in: savedCategories } } },
                { experienceCategories: { some: { category: { name: { in: savedCategories } } } } },
              ],
            }
          : { id: { in: [] } },
      ],
    };
    const rows = savedCategories.length
      ? await prisma.experience.findMany({ where: similarWhere, select: rankSelect })
      : [];
    candidateIds = await orderCandidateIds(rows, cheap);
    const savedTitles = saved.map((row) => row.experience.title).join(", ");
    retrievalNote = savedTitles
      ? `Parecidas a los favoritos publicados (${savedTitles}), usando sus categorías reales: ${savedCategories.join(", ") || "ninguna"}. Los candidatos no repiten lo ya guardado.`
      : "Esta persona no tiene favoritos publicados para buscar algo parecido.";
  } else if (wantsFavorites) {
    const loadFavorites = (where: Prisma.ExperienceWhereInput) =>
      prisma.experienceFavorite.findMany({
        where: { userId: input.userId, experience: where },
        orderBy: { createdAt: "desc" },
        take: GUIDE_CANDIDATE_LIMIT,
        include: { experience: { select: rankSelect } },
      });
    let favoriteRows = await loadFavorites(whereWithText);
    if (!favoriteRows.length && tokens.length && structured) {
      favoriteRows = await loadFavorites(whereBase);
    }
    candidateIds = favoriteRows.map((row) => row.experience.id);
    retrievalNote = "Este turno consulta los favoritos publicados actuales de esta persona.";
  } else if (structured || tokens.length) {
    let rows = await prisma.experience.findMany({ where: whereWithText, select: rankSelect });
    if (!rows.length && tokens.length && structured) {
      rows = await prisma.experience.findMany({ where: whereBase, select: rankSelect });
    }
    candidateIds = await orderCandidateIds(rows, cheap);
    const parts = [
      askedCategories.length ? `categorías ${askedCategories.join(", ")}` : "",
      askedInterests.length ? `intereses ${askedInterests.join(", ")}` : "",
      place ? `lugar ${place}` : "",
      priceMax ? `precio hasta ${priceMax}` : "",
      maxMinutes ? `duración de hasta ${maxMinutes} minutos` : "",
      everyDay ? "disponibilidad todos los días" : "",
      tokens.length ? `texto ${tokens.join(", ")}` : "",
    ].filter(Boolean);
    retrievalNote = `Candidatos filtrados en la base de datos y después limitados a ${GUIDE_CANDIDATE_LIMIT}: ${parts.join("; ")}.`;
  } else if (cheap) {
    const rows = await prisma.experience.findMany({ where: { status: "PUBLISHED" }, select: rankSelect });
    candidateIds = await orderCandidateIds(rows, true);
    retrievalNote = `Pidió algo económico sin otra restricción. Se ordenan las ${publishedCount} experiencias publicadas por precio.`;
  } else {
    const rows = await prisma.experience.findMany({ where: { status: "PUBLISHED" }, select: rankSelect });
    candidateIds = await generalCandidateIds(rows, profile?.city?.trim() || input.location?.city || "");
    retrievalNote = `Consulta general, máximo ${GUIDE_CANDIDATE_LIMIT}. Orden: destacadas vigentes, luego publicadas en la ciudad del perfil, y se completa con la puntuación pública ya usada en destacadas (visitas, favoritos, reseñas y actividad reciente). No usa la fecha de publicación.`;
  }
  const highlighted = (input.highlightIds ?? []).filter(Boolean).slice(0, 6);
  const detailIds = [...new Set([...candidateIds, ...highlighted, ...(experienceId ? [experienceId] : [])])];
  const details = detailIds.length
    ? await prisma.experience.findMany({
        where: { id: { in: detailIds }, status: "PUBLISHED" },
        include: guideDetailInclude,
      })
    : [];
  const byId = new Map(details.map((row) => [row.id, row]));
  const focus = experienceId ? byId.get(experienceId) ?? null : null;
  const catalog: GuideCatalogItem[] = [];
  for (const id of [...candidateIds, ...highlighted]) {
    const row = byId.get(id);
    if (row && !catalog.some((item) => item.id === row.id)) {
      catalog.push(toCatalogItem(row));
    }
  }
  const candidateItems = candidateIds
    .map((id) => byId.get(id))
    .filter((row): row is (typeof details)[number] => Boolean(row))
    .map(toCatalogItem);
  const mentionedRows = highlighted
    .map((id) => byId.get(id))
    .filter((row): row is (typeof details)[number] => Boolean(row));

  const history = recentGuideHistory(input.history);

  const clientExperience = generalMode ? undefined : input.context?.experience;
  const experienceBlock = focus
    ? [
        "MODO: experiencia específica. Prioriza siempre esta información y no inventes lo que no aparezca aquí.",
        "No preguntes qué tipo de experiencia quiere: ya está viendo esta ficha. Si pide un plan, úsala como centro y solo pregunta día, compañía o presupuesto si faltan.",
        publicDetailBlock(
          null,
          toCatalogItem(focus),
          focus.description.slice(0, 800),
          organizationLine(focus.creator?.organizationProfile),
          focus.companyContact,
        ),
      ].join("\n")
    : clientExperience?.name
      ? [
          "MODO: experiencia específica (contexto del cliente). Úsala primero y no inventes datos.",
          "No preguntes qué tipo de experiencia quiere: ya está viendo esta ficha.",
          `Experiencia: ${clientExperience.name}.`,
          `Categoría: ${clientExperience.category ?? "N/A"}.`,
          `Lugar registrado: ${clientExperience.location ?? "no indicado"}.`,
          "Dirección: no publicada en el contexto recibido.",
          `Precio: ${clientExperience.price ?? "no indicado"}.`,
          `Duración: ${clientExperience.duration ?? "no indicada"}.`,
          `Disponibilidad: ${formatAvailability(clientExperience.availableDays) || "no indicada"}.`,
          `Descripción: ${(clientExperience.description ?? "").slice(0, 800) || "no indicada"}.`,
          `Cómo llegar: ${clientExperience.howToGetThere || "no indicado"}.`,
          "Organización: no viene en el contexto del cliente.",
        ].join("\n")
      : "MODO: guía general. No hay una experiencia abierta. Ayuda a descubrir experiencias publicadas.";
  const mentionedBlock = mentionedRows.length
    ? [
        "Experiencias ya recomendadas, en el orden de las tarjetas. La número 1 es la primera. Si un dato no está, di que no está publicado:",
        ...mentionedRows.map((row, index) =>
          publicDetailBlock(
            index + 1,
            toCatalogItem(row),
            row.description.slice(0, 800),
            organizationLine(row.creator?.organizationProfile),
            row.companyContact,
          ),
        ),
      ].join("\n")
    : "";

  const contextPrompt = [
    user?.name ? `Nombre de la persona: ${user.name}.` : "",
    profile
      ? `Perfil: ciudad ${profile.city ?? "sin definir"}${profile.department ? `, ${profile.department}` : ""}, intereses ${profile.interests.join(", ") || "sin definir"}, compañía ${profile.companions.join(", ") || "sin definir"}, lugares ${profile.places.join(", ") || "sin definir"}, presupuesto ${profile.budget.join(", ") || "sin definir"}, climas ${profile.climate.join(", ") || "sin definir"}. Los intereses no son categorías y no hay una relación guardada entre ambos. Úsalos como preferencia frente a las categorías aprobadas. Si el mensaje actual pide otro tipo, ese mensaje manda.`
      : "Perfil: aún no hay preferencias guardadas.",
    input.location?.city ? `Ciudad declarada por la persona: ${input.location.city}.` : "",
    `Categorías aprobadas: ${categoryNames.join(", ") || "ninguna"}. Cuando preguntes el tipo de experiencia, usa estos nombres. Si hay más de seis, el botón Ver más muestra el siguiente grupo y la persona también puede escribir cualquiera.`,
    `Experiencias publicadas en el catálogo: ${publishedCount}. Candidatos de esta búsqueda: ${candidateItems.length}.`,
    publishedCount === 0
      ? "El catálogo publicado está vacío. Puedes decir que aún no hay experiencias publicadas."
      : candidateItems.length === 0
        ? "Hay experiencias publicadas, pero esta búsqueda no tuvo coincidencias. No digas que no hay experiencias publicadas ni que el catálogo está vacío."
        : "Hay coincidencias reales en los candidatos. Recomienda solo esas experiencias. No digas que no hay experiencias publicadas.",
    retrievalNote,
    experienceBlock,
    mentionedBlock,
    "Candidatos de este turno (id | título | categoría | lugar | dirección | cómo llegar | precio | duración | disponibilidad):",
    candidateItems.map(catalogFactLine).join("\n") || "(vacío)",
  ]
    .filter(Boolean)
    .join("\n\n");

  const transcript = history
    .map((item) => `${item.role === "user" ? "Persona" : "Guía"}: ${item.content}`)
    .join("\n");

  const prompt = [contextPrompt, transcript ? `Conversación:\n${transcript}` : "", `Mensaje nuevo: ${input.message}`]
    .filter(Boolean)
    .join("\n\n");

  return {
    catalog,
    categoryNames,
    publishedCount,
    askedCategories,
    askedInterests,
    detectedCity: place ?? null,
    detectedPrice: priceMax ?? null,
    detectedDuration: maxMinutes ?? null,
    everyDay,
    cityFallback: profile?.city || input.location?.city || "",
    contextPrompt,
    prompt,
  };
}

