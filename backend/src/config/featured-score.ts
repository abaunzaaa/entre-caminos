/** Pesos del ranking de experiencias destacadas. Ajustar solo aquí. */
export const FEATURED_SCORE_WEIGHTS = {
  visits: 0.01,
  favorites: 0.02,
  reviews: 0.04,
  rating: 0.3,
  recentActivity: 0.015,
} as const;

export const FEATURED_PUBLIC_LIMIT = 5;
export const FEATURED_RECENT_ACTIVITY_DAYS = 30;

export type FeaturedMetrics = {
  visits: number;
  favorites: number;
  reviews: number;
  rating: number;
  recentActivity: number;
};

export type FeaturedScoreInput = FeaturedMetrics;

export const FEATURED_RANKING_CRITERIA = ["visits", "favorites", "reviews", "rating", "trending"] as const;

export type FeaturedRankingCriterion = (typeof FEATURED_RANKING_CRITERIA)[number];

export function rankingMetric(criterion: FeaturedRankingCriterion, metrics: FeaturedMetrics) {
  if (criterion === "visits") {
    return metrics.visits;
  }
  if (criterion === "favorites") {
    return metrics.favorites;
  }
  if (criterion === "reviews") {
    return metrics.reviews;
  }
  if (criterion === "rating") {
    return metrics.rating;
  }
  return metrics.recentActivity;
}

export function compareFeaturedRanking(
  criterion: FeaturedRankingCriterion,
  left: { title: string; score: number; metrics: FeaturedMetrics },
  right: { title: string; score: number; metrics: FeaturedMetrics },
) {
  const byMetric = rankingMetric(criterion, right.metrics) - rankingMetric(criterion, left.metrics);
  if (byMetric !== 0) {
    return byMetric;
  }
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  return left.title.localeCompare(right.title, "es");
}

export function calculateFeaturedScore(input: FeaturedScoreInput): number {
  const visits = Math.max(0, input.visits);
  const favorites = Math.max(0, input.favorites);
  const reviews = Math.max(0, input.reviews);
  const rating = Math.max(0, input.rating);
  const recentActivity = Math.max(0, input.recentActivity);
  const raw =
    visits * FEATURED_SCORE_WEIGHTS.visits +
    favorites * FEATURED_SCORE_WEIGHTS.favorites +
    reviews * FEATURED_SCORE_WEIGHTS.reviews +
    rating * FEATURED_SCORE_WEIGHTS.rating +
    recentActivity * FEATURED_SCORE_WEIGHTS.recentActivity;
  return Math.round(raw * 10) / 10;
}

export type FeaturedHighlight = {
  label: string;
  emoji: string;
};

export function featuredHighlight(metrics: FeaturedMetrics, score: number): FeaturedHighlight {
  const parts = [
    { key: "visits", weight: metrics.visits * FEATURED_SCORE_WEIGHTS.visits },
    { key: "favorites", weight: metrics.favorites * FEATURED_SCORE_WEIGHTS.favorites },
    { key: "reviews", weight: metrics.reviews * FEATURED_SCORE_WEIGHTS.reviews },
    { key: "rating", weight: metrics.rating * FEATURED_SCORE_WEIGHTS.rating },
    { key: "recentActivity", weight: metrics.recentActivity * FEATURED_SCORE_WEIGHTS.recentActivity },
  ];
  const top = parts.reduce((best, item) => (item.weight > best.weight ? item : best), parts[0]);
  if (score <= 0 || top.weight <= 0) {
    return { label: "Selección editorial", emoji: "✨" };
  }
  if (top.key === "recentActivity") {
    return { label: "Actividad reciente", emoji: "📈" };
  }
  if (top.key === "rating" && metrics.rating >= 4.5) {
    return { label: "Muy bien calificada", emoji: "⭐" };
  }
  if (top.key === "favorites") {
    return { label: "Muy guardada", emoji: "❤️" };
  }
  if (top.key === "reviews") {
    return { label: "Muchas reseñas", emoji: "💬" };
  }
  return { label: "Alta interacción", emoji: "🔥" };
}

export function isWithinFeaturedPeriod(
  item: { featuredFrom?: Date | null; featuredUntil?: Date | null },
  now: Date,
) {
  if (item.featuredFrom && item.featuredFrom.getTime() > now.getTime()) {
    return false;
  }
  if (item.featuredUntil && item.featuredUntil.getTime() < now.getTime()) {
    return false;
  }
  return true;
}

export type RankableExperience = {
  id: string;
  status: string;
  isFeatured: boolean;
  featuredOrder: number | null;
  featuredFrom: Date | null;
  featuredUntil: Date | null;
  score: number;
  updatedAt: Date;
};

/**
 * El arreglo ya viene ordenado por el criterio. Recorre esa lista completa:
 * toma la mejor, descarta las siguientes de su categoría y sigue hasta cubrir el cupo.
 */
export function selectDiverseByCategory<T>(items: T[], limit: number, categoryKey: (item: T) => string): T[] {
  if (limit < 1) {
    return [];
  }
  const selected: T[] = [];
  const seenCategories = new Set<string>();
  for (const item of items) {
    if (selected.length >= limit) {
      break;
    }
    const key = categoryKey(item);
    if (seenCategories.has(key)) {
      continue;
    }
    seenCategories.add(key);
    selected.push(item);
  }
  return selected;
}

export function selectPublicFeatured<T extends RankableExperience>(items: T[], now = new Date()): T[] {
  const manual = items
    .filter((item) => item.status === "PUBLISHED" && item.isFeatured && isWithinFeaturedPeriod(item, now))
    .sort((left, right) => {
      const order = (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER);
      if (order !== 0) {
        return order;
      }
      return right.score - left.score;
    })
    .slice(0, FEATURED_PUBLIC_LIMIT);

  if (manual.length > 0) {
    return manual;
  }

  return [...items]
    .filter(
      (item) =>
        item.status === "PUBLISHED" &&
        !(item.isFeatured && !isWithinFeaturedPeriod(item, now)),
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .slice(0, FEATURED_PUBLIC_LIMIT);
}
