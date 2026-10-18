import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEARBY_RADIUS_KM,
  MAX_NEARBY_RADIUS_KM,
  MAX_NEARBY_RESULTS,
  distanceKm,
  isValidCoordinate,
  resolveRadiusKm,
  selectNearbyExperiences,
} from "../../src/utils/geo.js";

const MEDELLIN = { latitude: 6.2442, longitude: -75.5812 };

describe("distancia y experiencias cercanas", () => {
  it("mide cero entre el mismo punto y unos 22 km a 0.2 grados al norte", () => {
    expect(distanceKm(MEDELLIN.latitude, MEDELLIN.longitude, MEDELLIN.latitude, MEDELLIN.longitude)).toBe(0);
    const north = distanceKm(MEDELLIN.latitude, MEDELLIN.longitude, MEDELLIN.latitude + 0.2, MEDELLIN.longitude);
    expect(north).toBeGreaterThan(20);
    expect(north).toBeLessThan(25);
  });

  it("deja fuera lo que supera el radio y ordena por cercanía", () => {
    const result = selectNearbyExperiences(
      [
        { title: "Lejos", latitude: MEDELLIN.latitude + 0.6, longitude: MEDELLIN.longitude },
        { title: "Cerca", latitude: MEDELLIN.latitude + 0.05, longitude: MEDELLIN.longitude },
        { title: "Media", latitude: MEDELLIN.latitude + 0.2, longitude: MEDELLIN.longitude },
      ],
      MEDELLIN,
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(result.map((item) => item.item.title)).toEqual(["Cerca", "Media"]);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });

  it("ignora experiencias sin coordenadas y el punto 0,0", () => {
    const result = selectNearbyExperiences(
      [
        { title: "Vacío", latitude: null, longitude: null },
        { title: "Cero", latitude: 0, longitude: 0 },
        { title: "Real", latitude: 6.25, longitude: -75.58 },
      ],
      MEDELLIN,
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(result.map((item) => item.item.title)).toEqual(["Real"]);
  });

  it("usa la sede cuando la experiencia no tiene coordenadas propias", () => {
    const result = selectNearbyExperiences(
      [
        {
          title: "Sede",
          latitude: null,
          longitude: null,
          locations: [
            {
              department: "Antioquia",
              municipality: "Medellín",
              latitude: 6.25,
              longitude: -75.57,
            },
          ],
        },
      ],
      MEDELLIN,
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBe(6.25);
    expect(result[0].longitude).toBe(-75.57);
    expect(result[0].locations).toEqual([{ department: "Antioquia", municipality: "Medellín" }]);
  });

  it("no devuelve dirección y prioriza el municipio del pin", () => {
    const result = selectNearbyExperiences(
      [
        {
          title: "Dos sedes",
          latitude: 6.2486,
          longitude: -75.6214,
          locations: [
            { department: "Antioquia", municipality: "Envigado", latitude: 6.17, longitude: -75.58 },
            { department: "Antioquia", municipality: "Medellín", latitude: 6.2486, longitude: -75.6214 },
          ],
        },
      ],
      MEDELLIN,
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(result[0].locations[0]).toEqual({ department: "Antioquia", municipality: "Medellín" });
    expect(result[0].locations[0]).not.toHaveProperty("address");
  });

  it("si la sede principal queda lejos, usa la sede que sí está cerca", () => {
    const result = selectNearbyExperiences(
      [
        {
          title: "Dos sedes",
          latitude: MEDELLIN.latitude + 0.6,
          longitude: MEDELLIN.longitude,
          locations: [
            { department: "Cundinamarca", municipality: "Bogotá D.C.", latitude: MEDELLIN.latitude + 0.6, longitude: MEDELLIN.longitude },
            { department: "Antioquia", municipality: "Medellín", latitude: MEDELLIN.latitude + 0.05, longitude: MEDELLIN.longitude },
          ],
        },
      ],
      MEDELLIN,
      DEFAULT_NEARBY_RADIUS_KM,
    );
    expect(result).toHaveLength(1);
    expect(result[0].latitude).toBeCloseTo(MEDELLIN.latitude + 0.05);
    expect(result[0].locations[0]).toEqual({ department: "Antioquia", municipality: "Medellín" });
  });

  it("recorta el resultado a las más cercanas", () => {
    const items = Array.from({ length: MAX_NEARBY_RESULTS + 5 }, (_, index) => ({
      title: `Lugar ${index}`,
      latitude: MEDELLIN.latitude,
      longitude: MEDELLIN.longitude,
    }));
    expect(selectNearbyExperiences(items, MEDELLIN, DEFAULT_NEARBY_RADIUS_KM)).toHaveLength(MAX_NEARBY_RESULTS);
  });

  it("resuelve el radio con un valor por defecto y un tope", () => {
    expect(resolveRadiusKm(null)).toBe(DEFAULT_NEARBY_RADIUS_KM);
    expect(resolveRadiusKm(0)).toBe(DEFAULT_NEARBY_RADIUS_KM);
    expect(resolveRadiusKm(12)).toBe(12);
    expect(resolveRadiusKm(900)).toBe(MAX_NEARBY_RADIUS_KM);
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(6.2442, -75.5812)).toBe(true);
  });
});
