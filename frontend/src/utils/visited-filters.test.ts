import { describe, expect, it } from "vitest";
import { stopMatchesCategory, visitedCategoryFilters } from "./visited-filters";

describe("visitedCategoryFilters", () => {
  it("arma los chips con las categorías presentes y cuenta cada experiencia una vez", () => {
    const filters = visitedCategoryFilters([
      { categories: [{ id: "gastro", name: "Gastronomía" }, { id: "arte", name: "Arte y creatividad" }] },
      { categories: [{ id: "arte", name: "Arte y creatividad" }, { id: "arte", name: "Arte y creatividad" }] },
      { categories: [{ id: "aventura", name: "Aventura" }] },
      { categories: [] },
    ]);

    expect(filters).toEqual([
      { id: "arte", name: "Arte y creatividad", count: 2 },
      { id: "aventura", name: "Aventura", count: 1 },
      { id: "gastro", name: "Gastronomía", count: 1 },
    ]);
  });

  it("Todas deja ver cualquier pin y una categoría solo los suyos", () => {
    const stop = { categories: [{ id: "cultura", name: "Cultura" }] };
    expect(stopMatchesCategory(stop, null)).toBe(true);
    expect(stopMatchesCategory(stop, "cultura")).toBe(true);
    expect(stopMatchesCategory(stop, "gastro")).toBe(false);
    expect(stopMatchesCategory({ categories: [] }, "cultura")).toBe(false);
  });
});
