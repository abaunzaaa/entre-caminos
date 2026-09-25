import type { ExperienceStatus } from "@prisma/client";
import { FEATURED_RECENT_ACTIVITY_DAYS } from "../config/featured-score.js";
import {
  calculateFeaturedScore,
  compareFeaturedRanking,
  featuredHighlight,
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

function activeFeaturedWhere(now: Date) {
  return {
    status: "PUBLISHED" as const,
    isFeatured: true,
    AND: [
      { OR: [{ featuredFrom: null }, { featuredFrom: { lte: now } }] },
      { OR: [{ featuredUntil: null }, { featuredUntil: { gte: now } }] },
    ],
  };
}

const COVER_CAROUSEL_LIMIT = 12;

/** Portada: solo destacadas vigentes, en el orden editorial. */
export async function listCoverFeaturedExperiences(now = new Date()) {
  return prisma.experience.findMany({
    where: activeFeaturedWhere(now),
    include: coverInclude,
    orderBy: [{ featuredOrder: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    take: COVER_CAROUSEL_LIMIT,
  });
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

export async function generateFeaturedFromRanking(
  actor: AuthUser,
  criterion: FeaturedRankingCriterion,
  limit = 10,
) {
  const ranked = await listFeaturedRanking(criterion);
  const selected = ranked.slice(0, limit);
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
    where: { isFeatured: true },
    include: { category: { select: { id: true, name: true, icon: true } } },
    orderBy: [{ featuredOrder: "asc" }, { updatedAt: "desc" }],
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
