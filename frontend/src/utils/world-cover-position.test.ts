import { describe, expect, it } from "vitest";
import { WORLD_COVER_FRAME, assignMemorySlots, coordinatesToMapPosition, placeVisitedPins, separateNearbyPins } from "./world-cover-position";

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

describe("placeVisitedPins", () => {
  const medellin = { id: "medellin", latitude: 6.2442, longitude: -75.5812 };
  const sabaneta = { id: "sabaneta", latitude: 6.1515, longitude: -75.6166 };
  const carmen = { id: "carmen", latitude: 6.0825, longitude: -75.3347 };
  const bello = { id: "bello", latitude: 6.337, longitude: -75.558 };

  it("deja a Sabaneta al sur y a El Carmen hacia el suroriente de Medellín", () => {
    const [home, south, southeast, north] = placeVisitedPins([medellin, sabaneta, carmen, bello]);
    expect(south.yPercent).toBeGreaterThan(home.yPercent + 6);
    expect(north.yPercent).toBeLessThan(home.yPercent - 4);
    expect(southeast.xPercent).toBeGreaterThan(home.xPercent + 8);
    expect(southeast.yPercent).toBeGreaterThan(home.yPercent + 4);
  });

  it("separa experiencias de la misma ciudad sin sacarlas de la zona", () => {
    const pins = placeVisitedPins([
      { id: "a", latitude: 6.2442, longitude: -75.5812 },
      { id: "b", latitude: 6.2442, longitude: -75.5812 },
      { id: "c", latitude: 6.247, longitude: -75.579 },
      { id: "d", latitude: 6.241, longitude: -75.584 },
    ]);
    const again = placeVisitedPins([
      { id: "a", latitude: 6.2442, longitude: -75.5812 },
      { id: "b", latitude: 6.2442, longitude: -75.5812 },
      { id: "c", latitude: 6.247, longitude: -75.579 },
      { id: "d", latitude: 6.241, longitude: -75.584 },
    ]);
    expect(again).toEqual(pins);
    for (let index = 0; index < pins.length; index += 1) {
      for (let other = index + 1; other < pins.length; other += 1) {
        const dx = (pins[index].xPercent - pins[other].xPercent) * 1.65;
        const dy = pins[index].yPercent - pins[other].yPercent;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(6);
      }
      expect(pins[index].xPercent).toBeGreaterThan(30);
      expect(pins[index].xPercent).toBeLessThan(76);
      expect(pins[index].yPercent).toBeGreaterThan(28);
      expect(pins[index].yPercent).toBeLessThan(74);
    }
  });

  it("deja la cabalgata de Caldas claramente más al sur que el taller de flores", () => {
    const taller = { id: "taller-flores", latitude: 6.2442, longitude: -75.5812 };
    const cabalgata = { id: "cabalgata-caldas", latitude: 6.0910202, longitude: -75.638654 };
    const [flores, caldas] = placeVisitedPins([taller, cabalgata]);
    expect(caldas.yPercent - flores.yPercent).toBeGreaterThan(18);
    expect(caldas.yPercent - flores.yPercent).toBeLessThan(28);
    expect(caldas.xPercent).toBeLessThan(flores.xPercent);
  });

  it("deja el oriente cerca de Medellín y separa Caldas de El Carmen", () => {
    const medellin = { id: "medellin", latitude: 6.2442, longitude: -75.5812 };
    const rionegro = { id: "rionegro", latitude: 6.1877036, longitude: -75.4096427 };
    const carmen = { id: "carmen", latitude: 6.0893921, longitude: -75.3375161 };
    const caldas = { id: "caldas", latitude: 6.0910202, longitude: -75.638654 };
    const donmatias = { id: "donmatias", latitude: 6.4856, longitude: -75.3958 };
    const [home, east, southeast, southwest, north] = placeVisitedPins([medellin, rionegro, carmen, caldas, donmatias]);
    expect(east.xPercent - home.xPercent).toBeGreaterThan(6);
    expect(east.xPercent - home.xPercent).toBeLessThan(12);
    expect(southeast.xPercent).toBeGreaterThan(east.xPercent);
    expect(southeast.xPercent - home.xPercent).toBeLessThan(26);
    expect(southwest.xPercent).toBeLessThan(home.xPercent);
    expect(southwest.yPercent).toBeGreaterThan(home.yPercent);
    expect(north.yPercent).toBeLessThan(home.yPercent);
    expect(southeast.xPercent - southwest.xPercent).toBeGreaterThan(14);
  });

  it("conserva el orden vertical del valle aunque los pins se separen", () => {
    const pins = placeVisitedPins([
      { id: "medellin", latitude: 6.2442, longitude: -75.5812 },
      { id: "envigado", latitude: 6.1734018, longitude: -75.5663361 },
      { id: "sabaneta", latitude: 6.1515736, longitude: -75.6154278 },
      { id: "caldas", latitude: 6.0910202, longitude: -75.638654 },
      { id: "medellin-b", latitude: 6.2442, longitude: -75.5812 },
      { id: "medellin-c", latitude: 6.2442, longitude: -75.5812 },
    ]);
    expect(pins[0].yPercent).toBeLessThan(pins[1].yPercent);
    expect(pins[1].yPercent).toBeLessThan(pins[2].yPercent);
    expect(pins[2].yPercent).toBeLessThan(pins[3].yPercent);
    const homeSouth = Math.max(pins[0].yPercent, pins[4].yPercent, pins[5].yPercent);
    expect(pins[3].yPercent - homeSouth).toBeGreaterThan(14);
    expect(homeSouth).toBeLessThan(60);
    expect(pins[3].yPercent - pins[2].yPercent).toBeGreaterThan(pins[2].yPercent - pins[1].yPercent);
    expect(pins[4].yPercent).toBeLessThan(pins[3].yPercent - 12);
    expect(pins[5].yPercent).toBeLessThan(pins[3].yPercent - 12);
  });

  it("no pega los pins a los bordes", () => {
    const pins = placeVisitedPins([
      medellin,
      { id: "santa-marta", latitude: 11.24, longitude: -74.21 },
      { id: "leticia", latitude: -4.22, longitude: -69.94 },
    ]);
    for (const pin of pins) {
      expect(pin.xPercent).toBeGreaterThanOrEqual(22);
      expect(pin.xPercent).toBeLessThanOrEqual(84);
      expect(pin.yPercent).toBeGreaterThanOrEqual(22);
      expect(pin.yPercent).toBeLessThanOrEqual(78);
    }
    expect(pins[1].yPercent).toBeLessThan(pins[0].yPercent);
    expect(pins[2].yPercent).toBeGreaterThan(pins[0].yPercent);
  });
});
