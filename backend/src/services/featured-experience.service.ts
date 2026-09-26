import type { ExperienceStatus } from "@prisma/client";
import { FEATURED_PUBLIC_LIMIT, FEATURED_RECENT_ACTIVITY_DAYS } from "../config/featured-score.js";
import {
  calculateFeaturedScore,
  compareFeaturedRanking,
  featuredHighlight,
  selectDiverseByCategory,
  type FeaturedMetrics,
  type FeaturedRankingCriterion,
} from "../config/featured-score.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { recordAudit } from "./audit.service.js";
import type { AuthUser } from "../models/auth-user.js";

const RECENT_MS = FEATURED_RECENT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000;

type CountRow = { experienceId: string; _count: { _all: number } };
type RatingRow = { experienceId: string; _count: { _all: number }; _avg: { rating: number | null } };

function countMap(rows: CountRow[]) {
  return new Map(rows.map((row) => [row.experienceId, row._count._all]));
}

async function loadMetricMaps(experienceIds?: string[]) {
  const idFilter = experienceIds ? { experienceId: { in: experienceIds } } : undefined;
  const since = new Date(Date.now() - RECENT_MS);
  const recentWhere = { ...idFilter, createdAt: { gte: since } };

  const [views, favorites, reviews, recentViews, recentFavorites, recentReviews] = await Promise.all([
    prisma.experienceDetailView.groupBy({
      by: ["experienceId"],
      where: idFilter,
      _count: { _all: true },
    }),
    prisma.experienceFavorite.groupBy({
      by: ["experienceId"],
      where: idFilter,
      _count: { _all: true },
    }),
    prisma.experienceVisitorReview.groupBy({
      by: ["experienceId"],
      where: idFilter,
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.experienceDetailView.groupBy({
      by: ["experienceId"],
      where: recentWhere,
      _count: { _all: true },
    }),
    prisma.experienceFavorite.groupBy({
      by: ["experienceId"],
      where: recentWhere,
      _count: { _all: true },
    }),
    prisma.experienceVisitorReview.groupBy({
      by: ["experienceId"],
      where: recentWhere,
      _count: { _all: true },
    }),
  ]);

  return {
    views: countMap(views),
    favorites: countMap(favorites),
    reviews: new Map(reviews.map((row) => [row.experienceId, row])),
    recentViews: countMap(recentViews),
    recentFavorites: countMap(recentFavorites),
    recentReviews: countMap(recentReviews),
  };
}

function metricsFor(
  id: string,
  maps: Awaited<ReturnType<typeof loadMetricMaps>>,
): FeaturedMetrics {
  const review = maps.reviews.get(id) as RatingRow | undefined;
  const rating = review?._avg.rating ?? 0;
  return {
    visits: maps.views.get(id) ?? 0,
    favorites: maps.favorites.get(id) ?? 0,
    reviews: review?._count._all ?? 0,
    rating: Math.round(rating * 10) / 10,
    recentActivity:
      (maps.recentViews.get(id) ?? 0) +
      (maps.recentFavorites.get(id) ?? 0) +
      (maps.recentReviews.get(id) ?? 0),
  };
}

function coverUrl(experience: { imageUrl: string | null; imageUrls: string[] }) {
  return experience.imageUrls[0] ?? experience.imageUrl ?? null;
}

export async function recordDetailView(experienceId: string) {
  await prisma.experienceDetailView.create({
    data: { experienceId },
  });
}

const coverInclude = { category: true } as const;

const savedFeaturedWhere = {
  isFeatured: true,
  featuredOrder: { gte: 1, lte: FEATURED_PUBLIC_LIMIT },
} as const;

const savedFeaturedOrder = [{ featuredOrder: "asc" as const }, { updatedAt: "desc" as const }];

/** Destacadas guardadas por generar o por selección editorial, en su orden. */
export async function listCoverFeaturedExperiences() {
  return prisma.experience.findMany({
    where: savedFeaturedWhere,
    include: coverInclude,
    orderBy: savedFeaturedOrder,
    take: FEATURED_PUBLIC_LIMIT,
  });
}

const RECOMMENDATION_LIMIT = 12;

const INTEREST_HINTS: Record<string, string[]> = {
  naturaleza: ["naturaleza", "outdoor", "aire libre"],
  gastronomia: ["gastronomia", "comida", "cocina", "cafe"],
  cultura: ["cultura", "patrimonio", "museo"],
  aventura: ["aventura", "extremo"],
  relajacion: ["relajacion", "bienestar", "spa"],
  "arte y creatividad": ["arte", "creatividad", "taller"],
  deportes: ["deporte", "deportes"],
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

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesInterest(
  interest: string,
  experience: { title: string; description: string; category: { name: string } | null },
) {
  const key = foldText(interest);
  if (!key) {
    return false;
  }
  const category = foldText(experience.category?.name ?? "");
  const haystack = foldText(`${experience.title} ${experience.description} ${category}`);
  if (category && (category === key || category.includes(key) || key.includes(category))) {
    return true;
  }
  if (haystack.includes(key)) {
    return true;
  }
  return (INTEREST_HINTS[key] ?? []).some((hint) => category.includes(hint) || haystack.includes(hint));
}

function recommendationTie(seed: string, id: string) {
  let hash = 0;
  const value = `${seed}:${id}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** Carrusel personalizado. Sin intereses, usa el puntaje general y no la selección editorial. */
export async function listRecommendedExperiences(userId?: string) {
  const interests = userId
    ? ((await prisma.userProfile.findUnique({ where: { userId }, select: { interests: true } }))?.interests ?? [])
    : [];
  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    include: coverInclude,
  });
  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${userId ?? "anon"}:${day}`;
  const ranked = [...experiences].sort((left, right) => {
    const leftMatches = interests.reduce((count, interest) => count + (matchesInterest(interest, left) ? 1 : 0), 0);
    const rightMatches = interests.reduce((count, interest) => count + (matchesInterest(interest, right) ? 1 : 0), 0);
    if (rightMatches !== leftMatches) {
      return rightMatches - leftMatches;
    }
    const byScore = calculateFeaturedScore(metricsFor(right.id, maps)) - calculateFeaturedScore(metricsFor(left.id, maps));
    if (byScore !== 0) {
      return byScore;
    }
    return recommendationTie(seed, left.id) - recommendationTie(seed, right.id);
  });
  const matched = interests.length
    ? ranked.filter((item) => interests.some((interest) => matchesInterest(interest, item)))
    : [];
  const source = matched.length > 0 ? "interests" : "popular";
  return {
    source,
    experiences: (source === "interests" ? matched : ranked).slice(0, RECOMMENDATION_LIMIT),
  };
}

function toAdminCard(
  experience: {
    id: string;
    title: string;
    description: string;
    location: string;
    imageUrl: string | null;
    imageUrls: string[];
    status: ExperienceStatus;
    isFeatured: boolean;
    featuredOrder: number | null;
    featuredFrom: Date | null;
    featuredUntil: Date | null;
    category: { id: string; name: string; icon: string };
  },
  metrics: FeaturedMetrics,
) {
  const score = calculateFeaturedScore(metrics);
  return {
    experience: {
      id: experience.id,
      title: experience.title,
      description: experience.description,
      location: experience.location,
      status: experience.status,
      imageUrl: coverUrl(experience),
      isFeatured: experience.isFeatured,
      featuredOrder: experience.featuredOrder,
      featuredFrom: experience.featuredFrom,
      featuredUntil: experience.featuredUntil,
    },
    imageUrl: coverUrl(experience),
    category: experience.category,
    score,
    metrics: {
      visits: metrics.visits,
      favorites: metrics.favorites,
      reviews: metrics.reviews,
      rating: metrics.rating,
      recentActivity: metrics.recentActivity,
    },
    highlight: featuredHighlight(metrics, score),
  };
}

export async function listFeaturedRanking(criterion: FeaturedRankingCriterion) {
  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });
  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  return experiences
    .map((experience) => toAdminCard(experience, metricsFor(experience.id, maps)))
    .sort((left, right) =>
      compareFeaturedRanking(criterion, {
        title: left.experience.title,
        score: left.score,
        metrics: { ...left.metrics, recentActivity: left.metrics.recentActivity },
      }, {
        title: right.experience.title,
        score: right.score,
        metrics: { ...right.metrics, recentActivity: right.metrics.recentActivity },
      }),
    );
}

export async function listOwnExperiencePerformance(actor: AuthUser, criterion: FeaturedRankingCriterion) {
  const experiences = await prisma.experience.findMany({
    where: { status: "PUBLISHED", createdBy: actor.id },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });
  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  return experiences
    .map((experience) => toAdminCard(experience, metricsFor(experience.id, maps)))
    .sort((left, right) =>
      compareFeaturedRanking(criterion, {
        title: left.experience.title,
        score: left.score,
        metrics: { ...left.metrics, recentActivity: left.metrics.recentActivity },
      }, {
        title: right.experience.title,
        score: right.score,
        metrics: { ...right.metrics, recentActivity: right.metrics.recentActivity },
      }),
    );
}

export async function generateFeaturedFromRanking(
  actor: AuthUser,
  criterion: FeaturedRankingCriterion,
  limit = FEATURED_PUBLIC_LIMIT,
) {
  const safeLimit = Math.min(Math.max(limit, 1), FEATURED_PUBLIC_LIMIT);
  const ranked = await listFeaturedRanking(criterion);
  const selected = selectDiverseByCategory(ranked, safeLimit, (card) => card.category.id);
  const selectedIds = selected.map((card) => card.experience.id);

  await prisma.$transaction(async (tx) => {
    await tx.experience.updateMany({
      where: {
        isFeatured: true,
        ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}),
      },
      data: {
        isFeatured: false,
        featuredOrder: null,
        featuredFrom: null,
        featuredUntil: null,
      },
    });
    for (const [index, card] of selected.entries()) {
      await tx.experience.update({
        where: { id: card.experience.id },
        data: {
          isFeatured: true,
          featuredOrder: index + 1,
          featuredFrom: null,
          featuredUntil: null,
        },
      });
    }
  });

  await recordAudit({
    userId: actor.id,
    action: "GENERATE_FEATURED_EXPERIENCES",
    entity: "Experience",
    entityId: selectedIds[0] ?? "featured",
  });
  return listAdminFeaturedExperiences();
}

export async function listAdminFeaturedExperiences() {
  const experiences = await prisma.experience.findMany({
    where: savedFeaturedWhere,
    include: { category: { select: { id: true, name: true, icon: true } } },
    orderBy: savedFeaturedOrder,
    take: FEATURED_PUBLIC_LIMIT,
  });
  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  return experiences.map((experience) => toAdminCard(experience, metricsFor(experience.id, maps)));
}

function assertPublished(status: ExperienceStatus) {
  if (status !== "PUBLISHED") {
    throw ApiError.unprocessable("Solo las experiencias publicadas pueden destacarse");
  }
}

export async function featureExperience(
  actor: AuthUser,
  id: string,
  input: { featuredOrder?: number | null; featuredFrom?: Date | null; featuredUntil?: Date | null },
) {
  const experience = await prisma.experience.findUnique({ where: { id } });
  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  assertPublished(experience.status);
  if (
    input.featuredFrom &&
    input.featuredUntil &&
    input.featuredUntil.getTime() < input.featuredFrom.getTime()
  ) {
    throw ApiError.unprocessable("La fecha de fin debe ser posterior al inicio");
  }

  const updated = await prisma.experience.update({
    where: { id },
    data: {
      isFeatured: true,
      featuredOrder: input.featuredOrder ?? experience.featuredOrder ?? null,
      featuredFrom: input.featuredFrom === undefined ? experience.featuredFrom : input.featuredFrom,
      featuredUntil: input.featuredUntil === undefined ? experience.featuredUntil : input.featuredUntil,
    },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });
  await recordAudit({ userId: actor.id, action: "FEATURE_EXPERIENCE", entity: "Experience", entityId: id });
  const maps = await loadMetricMaps([id]);
  return toAdminCard(updated, metricsFor(id, maps));
}

export async function updateFeaturedOrder(actor: AuthUser, items: Array<{ id: string; featuredOrder: number }>) {
  const ids = items.map((item) => item.id);
  const existing = await prisma.experience.findMany({
    where: { id: { in: ids }, isFeatured: true },
    select: { id: true },
  });
  if (existing.length !== ids.length) {
    throw ApiError.unprocessable("Solo se puede reordenar experiencias que ya están destacadas");
  }
  await prisma.$transaction(
    items.map((item) =>
      prisma.experience.update({
        where: { id: item.id },
        data: { featuredOrder: item.featuredOrder },
      }),
    ),
  );
  await recordAudit({
    userId: actor.id,
    action: "REORDER_FEATURED_EXPERIENCES",
    entity: "Experience",
    entityId: ids[0] ?? "featured",
  });
  return listAdminFeaturedExperiences();
}

export async function unfeatureExperience(actor: AuthUser, id: string) {
  const experience = await prisma.experience.findUnique({ where: { id } });
  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  if (!experience.isFeatured) {
    throw ApiError.unprocessable("La experiencia no está destacada");
  }
  await prisma.experience.update({
    where: { id },
    data: {
      isFeatured: false,
      featuredOrder: null,
      featuredFrom: null,
      featuredUntil: null,
    },
  });
  await recordAudit({ userId: actor.id, action: "UNFEATURE_EXPERIENCE", entity: "Experience", entityId: id });
}
