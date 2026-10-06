import { Prisma, type ExperienceStatus } from "@prisma/client";
import { FEATURED_PUBLIC_LIMIT, FEATURED_RECENT_ACTIVITY_DAYS } from "../config/featured-score.js";
import { COVER_RECOMMENDATION_LIMIT, selectExperiencesForInterests } from "../config/interest-carousel.js";
import { ONBOARDING_INTEREST_ALIASES } from "../config/onboarding.js";
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

type RatingRow = { experienceId: string; _count: { _all: number }; _avg: { rating: number | null } };

type MetricRow = {
  kind: string;
  experience_id: string;
  total: number;
  recent: number;
  rating_avg: number | null;
};

function emptyMetricMaps() {
  return {
    views: new Map<string, number>(),
    favorites: new Map<string, number>(),
    reviews: new Map<string, RatingRow>(),
    recentViews: new Map<string, number>(),
    recentFavorites: new Map<string, number>(),
    recentReviews: new Map<string, number>(),
  };
}

/** Una sola lectura para visitas, favoritos y reseñas, con el mismo conteo que los seis groupBy. */
async function loadMetricMaps(experienceIds?: string[]) {
  if (experienceIds && experienceIds.length === 0) {
    return emptyMetricMaps();
  }
  const since = new Date(Date.now() - RECENT_MS);
  const idClause = experienceIds
    ? Prisma.sql`AND experience_id IN (${Prisma.join(experienceIds)})`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<MetricRow[]>(Prisma.sql`
    SELECT 'view' AS kind, experience_id, COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE created_at >= ${since})::int AS recent,
           NULL::float8 AS rating_avg
    FROM experience_detail_views
    WHERE TRUE ${idClause}
    GROUP BY experience_id
    UNION ALL
    SELECT 'favorite', experience_id, COUNT(*)::int,
           COUNT(*) FILTER (WHERE created_at >= ${since})::int,
           NULL::float8
    FROM experience_favorites
    WHERE TRUE ${idClause}
    GROUP BY experience_id
    UNION ALL
    SELECT 'review', experience_id, COUNT(*)::int,
           COUNT(*) FILTER (WHERE created_at >= ${since})::int,
           AVG(rating)::float8
    FROM experience_visitor_reviews
    WHERE TRUE ${idClause}
    GROUP BY experience_id
  `);

  const maps = emptyMetricMaps();
  for (const row of rows) {
    const total = Number(row.total);
    const recent = Number(row.recent);
    if (row.kind === "view") {
      maps.views.set(row.experience_id, total);
      maps.recentViews.set(row.experience_id, recent);
    } else if (row.kind === "favorite") {
      maps.favorites.set(row.experience_id, total);
      maps.recentFavorites.set(row.experience_id, recent);
    } else {
      maps.reviews.set(row.experience_id, {
        experienceId: row.experience_id,
        _count: { _all: total },
        _avg: { rating: row.rating_avg == null ? null : Number(row.rating_avg) },
      });
      maps.recentReviews.set(row.experience_id, recent);
    }
  }
  return maps;
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

const categoryPreview = { select: { id: true, name: true, icon: true } } as const;

const featuredCategoriesInclude = {
  category: categoryPreview,
  experienceCategories: {
    orderBy: { position: "asc" as const },
    include: { category: categoryPreview },
  },
} as const;

const coverCategorySelect = { id: true, name: true, icon: true } as const;

const coverInclude = {
  category: { select: coverCategorySelect },
  experienceCategories: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      categoryId: true,
      category: { select: coverCategorySelect },
    },
  },
} as const;

const savedFeaturedWhere = {
  isFeatured: true,
  featuredOrder: { gte: 1, lte: FEATURED_PUBLIC_LIMIT },
} as const;

const savedFeaturedOrder = [{ featuredOrder: "asc" as const }, { updatedAt: "desc" as const }];

/** Destacadas guardadas por generar o por selección editorial, en su orden. */
export async function listCoverFeaturedExperiences() {
  return prisma.experience.findMany({
    relationLoadStrategy: "join",
    where: savedFeaturedWhere,
    include: coverInclude,
    orderBy: savedFeaturedOrder,
    take: FEATURED_PUBLIC_LIMIT,
  });
}

function recommendationTie(seed: string, id: string) {
  let hash = 0;
  const value = `${seed}:${id}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

const recommendationInclude = {
  category: { select: { id: true, name: true, icon: true } },
  experienceCategories: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      categoryId: true,
      category: { select: { id: true, name: true, icon: true } },
    },
  },
  experienceInterests: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      interest: { select: { name: true } },
    },
  },
} as const;

function loadPublishedForRecommendations() {
  return prisma.experience.findMany({
    relationLoadStrategy: "join",
    where: { status: "PUBLISHED" },
    include: recommendationInclude,
  });
}

function rankByPopularity<T extends { id: string }>(
  experiences: T[],
  maps: Awaited<ReturnType<typeof loadMetricMaps>>,
  seedOwner: string,
) {
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${seedOwner}:${day}`;
  return [...experiences].sort((left, right) => {
    const byScore = calculateFeaturedScore(metricsFor(right.id, maps)) - calculateFeaturedScore(metricsFor(left.id, maps));
    if (byScore !== 0) {
      return byScore;
    }
    return recommendationTie(seed, left.id) - recommendationTie(seed, right.id);
  });
}

function activeInterestNames(interests: string[]) {
  return interests
    .map((interest) => ONBOARDING_INTEREST_ALIASES[interest.trim()] ?? interest.trim())
    .filter(Boolean);
}

/** Carrusel de portada. Con intereses, solo sus categorías. Sin intereses, puntaje general y no la selección editorial. */
export async function listRecommendedExperiences(userId?: string) {
  const profilePromise = userId
    ? prisma.userProfile.findUnique({
        where: { userId },
        select: { interests: true, places: true, companions: true },
      })
    : Promise.resolve(null);

  if (!userId) {
    const [experiences, maps] = await Promise.all([
      loadPublishedForRecommendations(),
      loadMetricMaps(),
    ]);
    return {
      source: "popular" as const,
      experiences: rankByPopularity(experiences, maps, "anon").slice(0, COVER_RECOMMENDATION_LIMIT),
    };
  }

  const [profile, experiences] = await Promise.all([profilePromise, loadPublishedForRecommendations()]);
  const activeInterests = activeInterestNames(profile?.interests ?? []);
  if (activeInterests.length > 0) {
    const personalized = experiences.map((experience) => ({
      ...experience,
      categories: experience.experienceCategories.length
        ? experience.experienceCategories.map((link) => ({ name: link.category.name }))
        : experience.category
          ? [{ name: experience.category.name }]
          : [],
      relatedInterests: experience.experienceInterests.map((link) => link.interest.name),
      environments: experience.environments,
      idealFor: experience.idealFor,
    }));
    return {
      source: "interests" as const,
      experiences: selectExperiencesForInterests(personalized, activeInterests, COVER_RECOMMENDATION_LIMIT, {
        places: profile?.places ?? [],
        companions: profile?.companions ?? [],
      }),
    };
  }

  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  return {
    source: "popular" as const,
    experiences: rankByPopularity(experiences, maps, userId).slice(0, COVER_RECOMMENDATION_LIMIT),
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
    experienceCategories?: Array<{
      position: number;
      category: { id: string; name: string; icon: string };
    }>;
  },
  metrics: FeaturedMetrics,
) {
  const score = calculateFeaturedScore(metrics);
  const ordered = [...(experience.experienceCategories ?? [])].sort((left, right) => left.position - right.position);
  const categories = ordered.map((link) => link.category).filter((category) => category?.name);
  const listed = categories.length > 0 ? categories : [experience.category];
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
    category: listed[0],
    categories: listed,
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
    include: featuredCategoriesInclude,
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
    include: featuredCategoriesInclude,
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
}

export async function listAdminFeaturedExperiences() {
  const experiences = await prisma.experience.findMany({
    where: savedFeaturedWhere,
    include: featuredCategoriesInclude,
    orderBy: savedFeaturedOrder,
    take: FEATURED_PUBLIC_LIMIT,
  });
  const maps = await loadMetricMaps(experiences.map((item) => item.id));
  return experiences.map((experience) => toAdminCard(experience, metricsFor(experience.id, maps)));
}

function primaryCategoryId(experience: {
  categoryId: string;
  experienceCategories: Array<{ categoryId: string }>;
}) {
  return experience.experienceCategories[0]?.categoryId || experience.categoryId;
}

/** Reemplaza el conjunto destacado editorial en una transacción, sin métricas ni tarjetas. */
export async function saveEditorialFeatured(actor: AuthUser, experienceIds: string[]) {
  const ids = [...new Set(experienceIds)];
  if (ids.length !== experienceIds.length) {
    throw ApiError.unprocessable("Cada experiencia solo puede destacarse una vez");
  }
  if (ids.length < 1 || ids.length > FEATURED_PUBLIC_LIMIT) {
    throw ApiError.unprocessable("Puedes destacar entre 1 y 5 experiencias");
  }

  const rows = await prisma.experience.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      status: true,
      categoryId: true,
      experienceCategories: {
        orderBy: { position: "asc" },
        select: { categoryId: true },
        take: 1,
      },
    },
  });
  if (rows.length !== ids.length) {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids.map((id) => byId.get(id)!);
  for (const row of ordered) {
    assertPublished(row.status);
  }
  const primaryCategories = new Set<string>();
  for (const row of ordered) {
    const primary = primaryCategoryId(row);
    if (primaryCategories.has(primary)) {
      throw ApiError.unprocessable(
        "Solo puedes seleccionar una experiencia por categoría principal. Elige una experiencia con otra categoría para continuar.",
      );
    }
    primaryCategories.add(primary);
  }

  await prisma.$transaction(async (tx) => {
    await tx.experience.updateMany({
      where: {
        isFeatured: true,
        id: { notIn: ids },
      },
      data: {
        isFeatured: false,
        featuredOrder: null,
        featuredFrom: null,
        featuredUntil: null,
      },
    });
    for (const [index, id] of ids.entries()) {
      await tx.experience.update({
        where: { id },
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
    action: "FEATURE_EXPERIENCE",
    entity: "Experience",
    entityId: ids[0] ?? "featured",
  });
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
    include: featuredCategoriesInclude,
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
