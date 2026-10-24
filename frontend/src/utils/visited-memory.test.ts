import { describe, expect, it } from "vitest";
import { formatVisitedStamp, pickVisitReview, type VisitMemoryReview } from "./visited-memory";

function review(partial: Partial<VisitMemoryReview> & Pick<VisitMemoryReview, "experienceId">): VisitMemoryReview {
  return {
    rating: 5,
    comment: "",
    location: null,
    ...partial,
  };
}

describe("formatVisitedStamp", () => {
  it("formatea la fecha de Bogotá sin inventar un día", () => {
    expect(formatVisitedStamp("2026-10-19T15:30:00.000Z")).toBe("19 OCT 2026");
    expect(formatVisitedStamp("")).toBe("");
    expect(formatVisitedStamp("no-es-fecha")).toBe("");
  });
});

describe("pickVisitReview", () => {
  it("no devuelve nada si el usuario no reseñó esa experiencia", () => {
    expect(pickVisitReview([review({ experienceId: "otra" })], "exp-1", "Medellín")).toBeNull();
  });

  it("usa la reseña de la sede que coincide con el municipio", () => {
    const envigado = review({ experienceId: "exp-1", rating: 3, location: { id: "b", label: "Envigado" } });
    const medellin = review({ experienceId: "exp-1", rating: 5, comment: "Repetiría", location: { id: "a", label: "Medellín" } });
    expect(pickVisitReview([envigado, medellin], "exp-1", "Medellín")).toBe(medellin);
  });

  it("si solo hay una reseña propia, la usa aunque no tenga sede", () => {
    const only = review({ experienceId: "exp-1", rating: 4.5, comment: "Linda" });
    expect(pickVisitReview([only], "exp-1", "Medellín")).toBe(only);
  });

  it("no elige entre sedes distintas cuando ninguna es la de la polaroid", () => {
    const reviews = [
      review({ experienceId: "exp-1", location: { id: "b", label: "Envigado" } }),
      review({ experienceId: "exp-1", location: { id: "c", label: "Rionegro" } }),
    ];
    expect(pickVisitReview(reviews, "exp-1", "Medellín")).toBeNull();
  });
});
