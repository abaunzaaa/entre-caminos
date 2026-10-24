import { describe, expect, it } from "vitest";
import { CURRENT_PLACE_FALLBACK, formatCurrentPlace } from "./map-place";

describe("formatCurrentPlace", () => {
  it("muestra municipio y departamento de la ubicación actual", () => {
    expect(formatCurrentPlace({ municipality: "Medellín", department: "Antioquia" })).toBe("Medellín · Antioquia");
  });

  it("usa un texto neutro si el reverse geocoding no trae municipio", () => {
    expect(formatCurrentPlace(null)).toBe(CURRENT_PLACE_FALLBACK);
    expect(formatCurrentPlace({ municipality: "", department: "Antioquia" })).toBe(CURRENT_PLACE_FALLBACK);
    expect(formatCurrentPlace({ municipality: "   ", department: "" })).toBe(CURRENT_PLACE_FALLBACK);
  });

  it("muestra solo el municipio cuando no hay departamento", () => {
    expect(formatCurrentPlace({ municipality: "Donmatías", department: "" })).toBe("Donmatías");
  });
});
