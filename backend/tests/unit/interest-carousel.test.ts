import { describe, expect, it } from "vitest";
import {
  COVER_RECOMMENDATION_LIMIT,
  categoryMatchesInterest,
  selectExperiencesForInterests,
} from "../../src/config/interest-carousel.js";

function experience(id: string, title: string, category: string) {
  return { id, title, category: { name: category } };
}

const catalog = [
  experience("c1", "Museo", "Cultural"),
  experience("c2", "Patrimonio", "Cultural"),
  experience("c3", "Teatro", "Cultural"),
  experience("c4", "Oficio", "Cultural"),
  experience("c5", "Ruta cultural", "Cultural"),
  experience("c6", "Archivo", "Cultural"),
  experience("g1", "Cata", "Gastronomía"),
  experience("g2", "Mercado", "Gastronomía"),
  experience("g3", "Cocina regional", "Gastronomía"),
  experience("g4", "Café de origen", "Gastronomía"),
  experience("d1", "Pilates", "Deportivo"),
  experience("t1", "Comuna 13", "Turístico"),
  experience("r1", "Clase de cocina", "Recreativo"),
  experience("a1", "Taller de arte", "Arte prueba"),
];

describe("categoryMatchesInterest", () => {
  it("relaciona Cultura con Cultural y Deportes con Deportivo", () => {
    expect(categoryMatchesInterest("Cultura", "Cultural")).toBe(true);
    expect(categoryMatchesInterest("Deportes", "Deportivo")).toBe(true);
    expect(categoryMatchesInterest("Cultura", "Deportivo")).toBe(false);
    expect(categoryMatchesInterest("Gastronomía", "Recreativo")).toBe(false);
  });
});

describe("selectExperiencesForInterests", () => {
  it("con Cultura y Gastronomía solo devuelve esas categorías y completa 10", () => {
    const selected = selectExperiencesForInterests(catalog, ["Cultura", "Gastronomía"]);
    expect(selected).toHaveLength(10);
    expect(selected.every((item) => item.category.name === "Cultural" || item.category.name === "Gastronomía")).toBe(
      true,
    );
    expect(selected.some((item) => item.category.name === "Deportivo")).toBe(false);
    expect(selected.some((item) => item.category.name === "Turístico")).toBe(false);
    expect(selected.some((item) => item.category.name === "Recreativo")).toBe(false);
  });

  it("no incluye Deportivo si el usuario no eligió Deportes", () => {
    const selected = selectExperiencesForInterests(catalog, ["Cultura", "Gastronomía", "Naturaleza"]);
    expect(selected.map((item) => item.id)).not.toContain("d1");
  });

  it("si hay menos de 10 relacionadas, no completa con otras categorías", () => {
    const selected = selectExperiencesForInterests(
      [
        experience("c1", "Museo", "Cultural"),
        experience("g1", "Cata", "Gastronomía"),
        experience("d1", "Pilates", "Deportivo"),
      ],
      ["Cultura", "Gastronomía"],
    );
    expect(selected.map((item) => item.id)).toEqual(["c1", "g1"]);
  });

  it("no pasa del cupo de 10 aunque haya más coincidencias", () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      experience(`c${index}`, `Cultura ${index}`, "Cultural"),
    );
    const selected = selectExperiencesForInterests(many, ["Cultura"]);
    expect(selected).toHaveLength(COVER_RECOMMENDATION_LIMIT);
    expect(selected.every((item) => item.category.name === "Cultural")).toBe(true);
  });

  it("sin intereses no arma una selección personalizada", () => {
    expect(selectExperiencesForInterests(catalog, [])).toEqual([]);
  });

  it("incluye la experiencia si al menos una de sus categorías coincide", () => {
    const selected = selectExperiencesForInterests(
      [
        {
          id: "cocina",
          title: "Clase de cocina",
          categories: [{ name: "Gastronomía" }, { name: "Recreativo" }],
        },
        {
          id: "tour",
          title: "Tour histórico",
          categories: [{ name: "Cultura" }, { name: "Turístico" }],
        },
        {
          id: "pilates",
          title: "Clase de Pilates",
          category: { name: "Deportivo" },
        },
      ],
      ["Gastronomía", "Cultura"],
    );
    expect(selected.map((item) => item.id)).toEqual(["cocina", "tour"]);
  });
});
