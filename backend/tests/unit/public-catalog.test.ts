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

  it("busca por palabras clave en campos ya guardados y se combina con los filtros", () => {
    const birds = item({
      id: "birds",
      title: "Avistamiento de aves en Parque Arví",
      description: "Recorrido de observación.",
      categoryId: "nature",
      categoryName: "Naturaleza",
      categorySearch: "Naturaleza",
      location: "Parque Arví",
      keywords: "Medellín Antioquia Talleres Fotografía",
    });
    const food = item({
      id: "food",
      title: "Ruta gastronómica",
      description: "Prueba de sabores locales.",
      categoryId: "food",
      categoryName: "Gastronomía",
      categorySearch: "Gastronomía",
      location: "Centro, Medellín, Antioquia",
      keywords: "Medellín Antioquia Bogotá Cundinamarca cerámica",
    });
    const catalog = [birds, food];

    expect(filterCatalogItems(catalog, { q: "Avistamiento de aves en Parque Arví" }).map((entry) => entry.id)).toEqual([
      "birds",
    ]);
    expect(filterCatalogItems(catalog, { q: "Medellín" }).map((entry) => entry.id).sort()).toEqual(["birds", "food"]);
    expect(filterCatalogItems(catalog, { q: "medellin" }).map((entry) => entry.id).sort()).toEqual(["birds", "food"]);
    expect(filterCatalogItems(catalog, { q: "  gastronomia  " }).map((entry) => entry.id)).toEqual(["food"]);
    expect(filterCatalogItems(catalog, { q: "Talleres" }).map((entry) => entry.id)).toEqual(["birds"]);
    expect(filterCatalogItems(catalog, { q: "Bogotá" }).map((entry) => entry.id)).toEqual(["food"]);
    expect(filterCatalogItems(catalog, { q: "ceram" }).map((entry) => entry.id)).toEqual(["food"]);
    expect(filterCatalogItems(catalog, { q: "xyznoexiste" })).toEqual([]);
    expect(filterCatalogItems(catalog, { q: "Medellín", categoryId: "food" }).map((entry) => entry.id)).toEqual([
      "food",
    ]);
    expect(filterCatalogItems(catalog, { q: "Ruta", city: "Medellín" }).map((entry) => entry.id)).toEqual(["food"]);
  });
});
