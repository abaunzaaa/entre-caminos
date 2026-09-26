import { describe, expect, it } from "vitest";
import { filterCatalogItems, paginateCatalog, type CatalogListItem } from "../../src/services/public-catalog.js";

function item(partial: Partial<CatalogListItem> & Pick<CatalogListItem, "id" | "title">): CatalogListItem {
  return {
    description: "",
    categoryId: "cat-1",
    categoryName: "Cultural",
    price: 80000,
    location: "Centro, Medellín, Antioquia",
    duration: null,
    durationValue: 2,
    durationUnit: "HOURS",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("public catalog page", () => {
  const rows = Array.from({ length: 10 }, (_, index) =>
    item({
      id: `exp-${index + 1}`,
      title: index < 9 ? `Cultural ${index + 1}` : "Ruta natural",
      categoryId: index < 9 ? "cultural" : "nature",
      categoryName: index < 9 ? "Cultural" : "Naturaleza",
      createdAt: new Date(Date.UTC(2026, 0, index + 1)),
    }),
  );

  it("devuelve como máximo 8 experiencias por página", () => {
    const filtered = filterCatalogItems(rows, { sort: "newest" });
    const first = paginateCatalog(filtered, 1, 8);
    const second = paginateCatalog(filtered, 2, 8);
    expect(first.items).toHaveLength(8);
    expect(first.total).toBe(10);
    expect(first.pageCount).toBe(2);
    expect(second.items).toHaveLength(2);
    expect(second.items.map((entry) => entry.id)).not.toEqual(first.items.map((entry) => entry.id));
  });

  it("pagina solo la categoría filtrada", () => {
    const filtered = filterCatalogItems(rows, { categoryId: "cultural", sort: "newest" });
    const page = paginateCatalog(filtered, 1, 8);
    expect(page.total).toBe(9);
    expect(page.pageCount).toBe(2);
    expect(page.items.every((entry) => entry.categoryId === "cultural")).toBe(true);
    expect(paginateCatalog(filtered, 1, 8).page).toBe(1);
  });
});
