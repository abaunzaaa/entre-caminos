import { describe, expect, it } from "vitest";
import {
  FEATURED_SCORE_WEIGHTS,
  calculateFeaturedScore,
  compareFeaturedRanking,
  featuredHighlight,
  isWithinFeaturedPeriod,
  selectDiverseByCategory,
  selectPublicFeatured,
  type FeaturedMetrics,
  type RankableExperience,
} from "../../src/config/featured-score.js";

function item(partial: Partial<RankableExperience> & Pick<RankableExperience, "id">): RankableExperience {
  return {
    status: "PUBLISHED",
    isFeatured: false,
    featuredOrder: null,
    featuredFrom: null,
    featuredUntil: null,
    score: 0,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("calculateFeaturedScore", () => {
  it("suma visitas, favoritos, reseñas, calificación y actividad reciente con los pesos centrales", () => {
    const score = calculateFeaturedScore({
      visits: 340,
      favorites: 120,
      reviews: 35,
      rating: 4.8,
      recentActivity: 20,
    });
    const expected =
      340 * FEATURED_SCORE_WEIGHTS.visits +
      120 * FEATURED_SCORE_WEIGHTS.favorites +
      35 * FEATURED_SCORE_WEIGHTS.reviews +
      4.8 * FEATURED_SCORE_WEIGHTS.rating +
      20 * FEATURED_SCORE_WEIGHTS.recentActivity;
    expect(score).toBe(Math.round(expected * 10) / 10);
  });

  it("ignora métricas negativas", () => {
    expect(
      calculateFeaturedScore({
        visits: -4,
        favorites: 0,
        reviews: 0,
        rating: 0,
        recentActivity: 0,
      }),
    ).toBe(0);
  });

  it("describe la señal dominante", () => {
    expect(
      featuredHighlight(
        { visits: 340, favorites: 10, reviews: 2, rating: 3, recentActivity: 1 },
        8,
      ).label,
    ).toBe("Alta interacción");
    expect(
      featuredHighlight(
        { visits: 0, favorites: 0, reviews: 0, rating: 0, recentActivity: 0 },
        0,
      ).label,
    ).toBe("Selección editorial");
  });
});

describe("compareFeaturedRanking", () => {
  function entry(title: string, metrics: FeaturedMetrics) {
    return { title, metrics, score: calculateFeaturedScore(metrics) };
  }

  const visited = entry("Visitada", { visits: 40, favorites: 1, reviews: 1, rating: 3, recentActivity: 1 });
  const saved = entry("Guardada", { visits: 2, favorites: 30, reviews: 1, rating: 3, recentActivity: 1 });
  const reviewed = entry("Reseñada", { visits: 2, favorites: 1, reviews: 25, rating: 3, recentActivity: 1 });
  const rated = entry("Calificada", { visits: 2, favorites: 1, reviews: 4, rating: 4.9, recentActivity: 1 });
  const trending = entry("Tendencia", { visits: 3, favorites: 1, reviews: 1, rating: 3, recentActivity: 18 });
  const pool = [visited, saved, reviewed, rated, trending];

  it("cambia el primer lugar según el criterio", () => {
    const top = (criterion: "visits" | "favorites" | "reviews" | "rating" | "trending") =>
      [...pool].sort((left, right) => compareFeaturedRanking(criterion, left, right))[0]?.title;
    expect(top("visits")).toBe("Visitada");
    expect(top("favorites")).toBe("Guardada");
    expect(top("reviews")).toBe("Reseñada");
    expect(top("rating")).toBe("Calificada");
    expect(top("trending")).toBe("Tendencia");
  });
});

describe("selectDiverseByCategory", () => {
  it("reparte las primeras posiciones entre categorías distintas y conserva el orden de métricas", () => {
    const ranked = [
      { id: "c1", categoryId: "cultura" },
      { id: "c2", categoryId: "cultura" },
      { id: "g1", categoryId: "gastronomia" },
      { id: "n1", categoryId: "naturaleza" },
    ];
    expect(selectDiverseByCategory(ranked, 3, (item) => item.categoryId).map((item) => item.id)).toEqual([
      "c1",
      "g1",
      "n1",
    ]);
  });

  it("no completa el cupo con otra experiencia de una categoría ya elegida", () => {
    const ranked = [
      { id: "c1", categoryId: "cultura" },
      { id: "c2", categoryId: "cultura" },
      { id: "g1", categoryId: "gastronomia" },
      { id: "c3", categoryId: "cultura" },
    ];
    expect(selectDiverseByCategory(ranked, 5, (item) => item.categoryId).map((item) => item.id)).toEqual([
      "c1",
      "g1",
    ]);
  });

  it("sigue el criterio en toda la lista y no se queda con las primeras cinco para luego quitar duplicados", () => {
    const ranked = [
      { id: "cocina", categoryId: "recreativo", visits: 100 },
      { id: "flores", categoryId: "recreativo", visits: 90 },
      { id: "candlelight", categoryId: "cultural", visits: 80 },
      { id: "ceramicas", categoryId: "cultural", visits: 70 },
      { id: "jardines", categoryId: "turistico", visits: 60 },
      { id: "bosque", categoryId: "naturaleza", visits: 40 },
    ];
    expect(selectDiverseByCategory(ranked, 5, (item) => item.categoryId).map((item) => item.id)).toEqual([
      "cocina",
      "candlelight",
      "jardines",
      "bosque",
    ]);
  });
});

describe("selectPublicFeatured", () => {
  const now = new Date("2026-09-24T12:00:00.000Z");

  it("prioriza destacadas manuales vigentes y respeta el orden, con máximo 5", () => {
    const selected = selectPublicFeatured(
      [
        item({ id: "auto", score: 99, updatedAt: now }),
        item({ id: "late", isFeatured: true, featuredOrder: 2, score: 1 }),
        item({ id: "early", isFeatured: true, featuredOrder: 1, score: 1 }),
        item({
          id: "expired",
          isFeatured: true,
          featuredOrder: 0,
          featuredUntil: new Date("2026-09-01T00:00:00.000Z"),
        }),
        item({ id: "draft", status: "DRAFT", isFeatured: true, featuredOrder: 0, score: 50 }),
      ],
      now,
    );
    expect(selected.map((entry) => entry.id)).toEqual(["early", "late"]);
  });

  it("si no hay destacadas manuales vigentes, usa las mejores por score", () => {
    const selected = selectPublicFeatured(
      [
        item({ id: "low", score: 1, updatedAt: now }),
        item({ id: "high", score: 9, updatedAt: new Date("2026-01-01T00:00:00.000Z") }),
        item({
          id: "expired-only",
          isFeatured: true,
          score: 20,
          featuredUntil: new Date("2026-01-01T00:00:00.000Z"),
        }),
      ],
      now,
    );
    expect(selected.map((entry) => entry.id)).toEqual(["high", "low"]);
    expect(isWithinFeaturedPeriod({ featuredUntil: new Date("2026-01-01T00:00:00.000Z") }, now)).toBe(false);
  });
});
