import { describe, expect, it } from "vitest";
import { WORLD_COVER_FRAME, assignMemorySlots, coordinatesToMapPosition, separateNearbyPins } from "./world-cover-position";

describe("coordinatesToMapPosition", () => {
  it("apoya los extremos del mundo en el marco de la ilustración", () => {
    expect(coordinatesToMapPosition(90, -180)).toEqual({
      xPercent: WORLD_COVER_FRAME.left,
      yPercent: WORLD_COVER_FRAME.top,
    });
    expect(coordinatesToMapPosition(-90, 180)).toEqual({
      xPercent: WORLD_COVER_FRAME.right,
      yPercent: WORLD_COVER_FRAME.bottom,
    });
  });

  it("deja Medellín sobre el noroeste de Sudamérica", () => {
    const point = coordinatesToMapPosition(6.244, -75.581);
    expect(point.xPercent).toBeGreaterThan(28);
    expect(point.xPercent).toBeLessThan(38);
    expect(point.yPercent).toBeGreaterThan(46);
    expect(point.yPercent).toBeLessThan(56);
  });
});

describe("assignMemorySlots", () => {
  it("reparte los primeros recuerdos en puestos fijos y separados", () => {
    const first = assignMemorySlots(6);
    const again = assignMemorySlots(6);
    expect(again).toEqual(first);
    expect(first).toHaveLength(6);
    for (let index = 0; index < first.length; index += 1) {
      for (let other = index + 1; other < first.length; other += 1) {
        const dx = (first[index].xPercent - first[other].xPercent) * 2.35;
        const dy = first[index].yPercent - first[other].yPercent;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(15);
      }
    }
  });

  it("sigue repartiendo cuando hay más experiencias que puestos", () => {
    const slots = assignMemorySlots(24);
    expect(slots).toHaveLength(24);
    expect(slots[0]).toEqual(assignMemorySlots(1)[0]);
  });
});
describe("separateNearbyPins", () => {
  it("no mueve un pin solo", () => {
    const [pin] = separateNearbyPins([{ xPercent: 30, yPercent: 50 }], 800, 400);
    expect(pin.offsetX).toBe(0);
    expect(pin.offsetY).toBe(0);
  });

  it("separa unos pocos píxeles a dos pins en el mismo punto", () => {
    const pins = separateNearbyPins(
      [
        { xPercent: 32, yPercent: 50 },
        { xPercent: 32, yPercent: 50 },
      ],
      900,
      420,
    );
    expect(Math.hypot(pins[0].offsetX, pins[0].offsetY)).toBeGreaterThan(0);
    expect(Math.hypot(pins[0].offsetX, pins[0].offsetY)).toBeLessThanOrEqual(12);
    expect(Math.hypot(pins[1].offsetX, pins[1].offsetY)).toBeLessThanOrEqual(12);
  });
});
