import { describe, expect, it } from "vitest";
import { MAP_WHEEL_PX_PER_ZOOM, wheelZoomStep } from "./map-wheel";

describe("wheelZoomStep", () => {
  it("avanza menos de un nivel por muesca de la rueda", () => {
    const step = wheelZoomStep(-100, 0, 800);
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(1);
    expect(step).toBeCloseTo(100 / MAP_WHEEL_PX_PER_ZOOM);
  });

  it("aleja cuando la rueda baja", () => {
    expect(wheelZoomStep(100, 0, 800)).toBeLessThan(0);
  });

  it("no deja que un solo evento supere el paso del botón", () => {
    expect(wheelZoomStep(-5000, 0, 800)).toBe(1);
    expect(wheelZoomStep(5000, 0, 800)).toBe(-1);
  });

  it("respeta el delta de línea y limita el de página al paso del botón", () => {
    expect(Math.abs(wheelZoomStep(-3, 1, 800))).toBeCloseTo((3 * 16) / MAP_WHEEL_PX_PER_ZOOM);
    expect(Math.abs(wheelZoomStep(-1, 2, 800))).toBe(1);
  });
});
