import { describe, expect, it } from "vitest";
import { COLOMBIA_DECORATIVE, COLOMBIA_RING } from "./colombia-outline";

function inside(latitude: number, longitude: number) {
  let hits = false;
  for (let index = 0, previous = COLOMBIA_RING.length - 1; index < COLOMBIA_RING.length; previous = index, index += 1) {
    const [lat, lng] = COLOMBIA_RING[index];
    const [prevLat, prevLng] = COLOMBIA_RING[previous];
    const crosses = lat > latitude !== prevLat > latitude;
    const at = ((prevLng - lng) * (latitude - lat)) / (prevLat - lat) + lng;
    if (crosses && longitude < at) {
      hits = !hits;
    }
  }
  return hits;
}

describe("silueta de Colombia", () => {
  it("cierra el contorno decorativo", () => {
    expect(COLOMBIA_DECORATIVE.d.endsWith("Z")).toBe(true);
    expect(COLOMBIA_DECORATIVE.viewBox.startsWith("0 0 ")).toBe(true);
  });

  it("sigue el territorio: el interior queda dentro y el mar afuera", () => {
    expect(inside(6.24, -75.57)).toBe(true);
    expect(inside(4.71, -74.07)).toBe(true);
    expect(inside(6.23, -75.2)).toBe(true);
    expect(inside(5.79, -75.79)).toBe(true);
    expect(inside(4, -81)).toBe(false);
    expect(inside(10.2, -66)).toBe(false);
  });
});
