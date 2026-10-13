import { describe, expect, it } from "vitest";
import { FALLBACK_USD_TO_COP } from "../../src/config/exchange-rates.js";
import { filterCatalogItems, paginateCatalog, type CatalogListItem } from "../../src/services/public-catalog.js";
import { getBudgetLevel, normalizePriceToCOP } from "../../src/utils/budget.js";

function item(partial: Partial<CatalogListItem> & Pick<CatalogListItem, "id" | "title">): CatalogListItem {
  return {
    description: "",
    categoryId: "cat-1",
    categoryName: "Cultural",
    price: 80000,
    currency: "COP",
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

  it("combina presupuesto con ciudad, categoría y búsqueda", () => {
    const local = item({
      id: "local",
      title: "Taller de cerámica",
      price: 100_000,
      currency: "COP",
      categoryId: "food",
      location: "Centro, Medellín, Antioquia",
      keywords: "cerámica",
    });
    const dollars = item({
      id: "dollars",
      title: "Plan en dólares",
      price: 80,
      currency: "USD",
      categoryId: "food",
      location: "Centro, Medellín, Antioquia",
    });
    const luxury = item({
      id: "luxury",
      title: "Noche de lujo",
      price: 650_000,
      currency: "COP",
      categoryId: "nature",
      location: "Chapinero, Bogotá, Cundinamarca",
    });
    const catalog = [local, dollars, luxury];
    const dollarLevel = getBudgetLevel(80, "USD");

    expect(normalizePriceToCOP(80, "USD")).toBe(80 * FALLBACK_USD_TO_COP);
    expect(dollarLevel).not.toBe("Económico");
    expect(filterCatalogItems(catalog, { price: "Económico", city: "Medellín" }).map((entry) => entry.id)).toEqual([
      "local",
    ]);
    expect(filterCatalogItems(catalog, { price: "Económico", categoryId: "food" }).map((entry) => entry.id)).toEqual([
      "local",
    ]);
    expect(filterCatalogItems(catalog, { price: "Económico", q: "cerámica" }).map((entry) => entry.id)).toEqual([
      "local",
    ]);
    expect(filterCatalogItems(catalog, { price: dollarLevel ?? "" }).map((entry) => entry.id)).toEqual(["dollars"]);
    expect(filterCatalogItems(catalog, {}).map((entry) => entry.id)).toEqual(["local", "dollars", "luxury"]);
  });

  describe("tipo de plan según idealFor", () => {
    const salsa = item({
      id: "salsa",
      title: "Clase grupal de salsa para principiantes en DANCEFREE",
      description: "No necesitas experiencia previa ni asistir con pareja.",
      categoryId: "culture",
      categoryName: "Cultura e historia",
      location: "Calle 10A #40-27, El Poblado, Medellín, Antioquia",
      idealFor: ["Solo", "En pareja", "Amigos"],
      createdAt: new Date("2026-03-03T00:00:00.000Z"),
    });
    const tour = item({
      id: "tour",
      title: "Tour a Guatapé",
      description: "Pueblo, embalse y piedra.",
      categoryId: "nature",
      categoryName: "Naturaleza y aventura",
      location: "Piedra del Peñol, Guatapé, Antioquia",
      price: 129_000,
      idealFor: ["Familia", "Amigos", "En pareja", "Solo"],
      createdAt: new Date("2026-03-02T00:00:00.000Z"),
    });
    const escape = item({
      id: "escape",
      title: "Escape room",
      description: "Juego para resolver en solo una hora con amigos y familia.",
      categoryId: "urban",
      categoryName: "Planes urbanos",
      location: "Laureles, Medellín, Antioquia",
      idealFor: ["Amigos", "Familia"],
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    const empty = item({ id: "empty", title: "Plan sin compañía definida", description: "Ideal en pareja." });
    const catalog = [salsa, tour, escape, empty];
    const ids = (plan: string, extra: Record<string, string> = {}) =>
      filterCatalogItems(catalog, { plan, ...extra }).map((entry) => entry.id);

    it("encuentra la experiencia con cualquiera de sus valores, sin importar el orden", () => {
      expect(ids("solo")).toEqual(["salsa", "tour"]);
      expect(ids("couple")).toEqual(["salsa", "tour"]);
      expect(ids("friends")).toEqual(["salsa", "tour", "escape"]);
      expect(ids("family")).toEqual(["tour", "escape"]);
    });

    it("no usa título ni descripción para decidir el tipo de plan", () => {
      expect(ids("family")).not.toContain("salsa");
      expect(ids("solo")).not.toContain("escape");
      expect(ids("couple")).not.toContain("empty");
    });

    it("sin tipo de plan no filtra por idealFor", () => {
      expect(ids("")).toEqual(["salsa", "tour", "escape", "empty"]);
    });

    it("se combina con categoría, ciudad, presupuesto y búsqueda", () => {
      expect(ids("solo", { categoryId: "culture" })).toEqual(["salsa"]);
      expect(ids("solo", { categoryId: "urban" })).toEqual([]);
      expect(ids("friends", { city: "Medellín" })).toEqual(["salsa", "escape"]);
      expect(ids("family", { city: "Guatapé" })).toEqual(["tour"]);
      expect(ids("solo", { price: "Económico" })).toEqual(["salsa", "tour"]);
      expect(ids("solo", { q: "salsa" })).toEqual(["salsa"]);
      expect(ids("family", { q: "salsa" })).toEqual([]);
    });
  });
});
