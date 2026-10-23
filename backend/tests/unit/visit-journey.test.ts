import { describe, expect, it } from "vitest";
import { readVisitCategories, toVisitedJourneyStop } from "../../src/services/visit-journey.js";

const visitedAt = new Date("2026-03-02T15:00:00.000Z");

describe("toVisitedJourneyStop", () => {
  it("usa la sede principal y no las coordenadas de una sede posterior", () => {
    const stop = toVisitedJourneyStop({
      createdAt: visitedAt,
      experience: {
        id: "exp-1",
        title: "Piedra",
        location: "Medellín, Antioquia",
        latitude: 6.24,
        longitude: -75.57,
        imageUrl: " https://res.cloudinary.com/demo/image/upload/piedra.jpg ",
        imageUrls: [" https://cdn.example/a.jpg ", ""],
        locations: [
          { position: 2, municipality: "Guatapé", department: "Antioquia", latitude: 6.23, longitude: -75.2 },
          { position: 1, municipality: "Medellín", department: "Antioquia", latitude: null, longitude: null },
        ],
      },
    });

    expect(stop.municipality).toBe("Medellín");
    expect(stop.department).toBe("Antioquia");
    expect(stop.latitude).toBe(6.24);
    expect(stop.longitude).toBe(-75.57);
    expect(stop.venueCount).toBe(2);
    expect(stop.imageUrl).toBe("https://res.cloudinary.com/demo/image/upload/piedra.jpg");
    expect(stop.imageUrls).toEqual(["https://cdn.example/a.jpg"]);
    expect(stop.visitedAt).toBe("2026-03-02T15:00:00.000Z");
  });

  it("prefiere las coordenadas de la sede principal sobre las columnas de la experiencia", () => {
    const stop = toVisitedJourneyStop({
      createdAt: visitedAt,
      experience: {
        id: "exp-2",
        title: "Mirador",
        latitude: 6.23,
        longitude: -75.2,
        locations: [{ position: 1, municipality: "Envigado", department: "Antioquia", latitude: "6.1710000", longitude: "-75.5800000" }],
      },
    });

    expect(stop.municipality).toBe("Envigado");
    expect(stop.latitude).toBeCloseTo(6.171, 5);
    expect(stop.longitude).toBeCloseTo(-75.58, 5);
  });

  it("conserva la visita aunque no tenga coordenadas utilizables", () => {
    const stop = toVisitedJourneyStop({
      createdAt: "2026-04-01T15:00:00.000Z",
      experience: {
        id: "exp-3",
        title: "Sin mapa",
        location: "Jericó, Antioquia",
        latitude: 0,
        longitude: 0,
        locations: [
          { position: 1, municipality: "Jericó", department: "Antioquia", latitude: null, longitude: null },
          { position: 2, municipality: "Guatapé", department: "Antioquia", latitude: 6.23, longitude: -75.2 },
        ],
      },
    });

    expect(stop.latitude).toBeNull();
    expect(stop.longitude).toBeNull();
    expect(stop.municipality).toBe("Jericó");
    expect(stop.title).toBe("Sin mapa");
    expect(stop.visitedAt).toBe("2026-04-01T15:00:00.000Z");
  });

  it("rechaza coordenadas fuera de rango", () => {
    const stop = toVisitedJourneyStop({
      createdAt: visitedAt,
      experience: {
        id: "exp-4",
        title: "Rara",
        latitude: 120,
        longitude: -75,
        locations: [],
      },
    });

    expect(stop.latitude).toBeNull();
    expect(stop.longitude).toBeNull();
    expect(stop.visitedAt).toBe("2026-03-02T15:00:00.000Z");
    expect(stop.categories).toEqual([]);
  });

  it("toma las categorías vinculadas y no repite la principal", () => {
    const categories = readVisitCategories({
      id: "exp-5",
      title: "Taller",
      category: { id: "cat-arte", name: " Arte y creatividad " },
      experienceCategories: [
        { category: { id: "cat-arte", name: "Arte y creatividad" } },
        { category: { id: "cat-gastro", name: "Gastronomía" } },
        { category: { id: "cat-arte", name: "Arte y creatividad" } },
        { category: { id: "", name: "Vacía" } },
      ],
    });

    expect(categories).toEqual([
      { id: "cat-arte", name: "Arte y creatividad" },
      { id: "cat-gastro", name: "Gastronomía" },
    ]);
  });

  it("usa la categoría principal cuando la experiencia no tiene vínculos", () => {
    const categories = readVisitCategories({
      id: "exp-6",
      title: "Ruta",
      category: { id: "cat-aventura", name: "Aventura" },
      experienceCategories: [],
    });

    expect(categories).toEqual([{ id: "cat-aventura", name: "Aventura" }]);
  });
});
