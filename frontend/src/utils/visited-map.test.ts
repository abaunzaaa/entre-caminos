import { describe, expect, it } from "vitest";
import { latLngToWorld } from "./map-projection";
import {
  clusterVisitedStops,
  curvePath,
  fitVisitedBounds,
  journeySummary,
  orderJourney,
  placesLine,
  sharedPlaceLabel,
  spiderOffsets,
  visitMarkedLabel,
  visitYear,
  VISITED_FIT_MAX_ZOOM,
} from "./visited-map";

function projectFrame(
  latitude: number,
  longitude: number,
  frame: { latitude: number; longitude: number; zoom: number },
  width: number,
  height: number,
) {
  const origin = latLngToWorld(frame.latitude, frame.longitude, frame.zoom);
  const point = latLngToWorld(latitude, longitude, frame.zoom);
  return {
    x: width / 2 + (point.x - origin.x),
    y: height / 2 + (point.y - origin.y),
  };
}

describe("fitVisitedBounds", () => {
  const padding = { x: 80, y: 90 };

  it("no acerca una sola experiencia más allá del zoom máximo de encuadre", () => {
    const frame = fitVisitedBounds([{ latitude: 6.244, longitude: -75.581 }], 900, 640, padding);
    expect(frame.zoom).toBe(VISITED_FIT_MAX_ZOOM);
    expect(frame.latitude).toBeCloseTo(6.244, 1);
    expect(frame.longitude).toBeCloseTo(-75.581, 1);
  });

  it("abre el encuadre cuando los lugares se alejan y sigue mostrando todos", () => {
    const valley = [
      { latitude: 6.244, longitude: -75.581 },
      { latitude: 6.171, longitude: -75.58 },
      { latitude: 6.151, longitude: -75.616 },
    ];
    const opened = [
      ...valley,
      { latitude: 6.233, longitude: -75.2 },
      { latitude: 5.79, longitude: -75.79 },
    ];
    const width = 960;
    const height = 680;
    const near = fitVisitedBounds(valley, width, height, padding);
    const far = fitVisitedBounds(opened, width, height, padding);

    expect(far.zoom).toBeLessThan(near.zoom);
    expect(far.zoom).toBeGreaterThanOrEqual(5);
    expect(far.zoom).toBeLessThanOrEqual(VISITED_FIT_MAX_ZOOM);

    for (const point of opened) {
      const pos = projectFrame(point.latitude, point.longitude, far, width, height);
      expect(pos.x).toBeGreaterThan(8);
      expect(pos.x).toBeLessThan(width - 8);
      expect(pos.y).toBeGreaterThan(8);
      expect(pos.y).toBeLessThan(height - 8);
    }
  });
});

describe("recorrido visitado", () => {
  it("ordena por la fecha en que se marcó la visita", () => {
    const ordered = orderJourney([
      { id: "b", visitedAt: "2026-05-01T15:00:00.000Z" },
      { id: "a", visitedAt: "2026-01-01T15:00:00.000Z" },
      { id: "c", visitedAt: "2026-03-01T15:00:00.000Z" },
    ]);
    expect(ordered.map((stop) => stop.id)).toEqual(["a", "c", "b"]);
  });

  it("no dibuja línea con un solo punto y curva los tramos siguientes", () => {
    expect(curvePath([{ x: 10, y: 10 }])).toBe("");
    const path = curvePath([
      { x: 10, y: 20 },
      { x: 140, y: 40 },
      { x: 80, y: 180 },
    ]);
    expect(path.match(/Q/g)).toHaveLength(2);
  });

  it("agrupa fotos cercanas y separa las que están lejos", () => {
    const stops = [
      { id: "near-a", x: 10, y: 10 },
      { id: "near-b", x: 24, y: 16 },
      { id: "far", x: 220, y: 180 },
    ];
    const clusters = clusterVisitedStops(stops, (stop) => stop, 48);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].items.map((item) => item.id)).toEqual(["near-a", "near-b"]);
    expect(clusters[1].items.map((item) => item.id)).toEqual(["far"]);
  });

  it("abre una agrupación alrededor del punto", () => {
    const offsets = spiderOffsets(3, 40);
    expect(offsets).toHaveLength(3);
    expect(offsets[0].y).toBeLessThan(0);
    expect(spiderOffsets(1, 40)).toEqual([{ x: 0, y: 0 }]);
  });

  it("cuenta municipios reales y el último camino por fecha", () => {
    const summary = journeySummary([
      { id: "2", title: "Piedra", municipality: "Guatapé", department: "Antioquia", location: "", visitedAt: "2026-08-01T15:00:00.000Z" },
      { id: "1", title: "Café", municipality: "Medellín", department: "Antioquia", location: "", visitedAt: "2026-02-01T15:00:00.000Z" },
      { id: "3", title: "Otro café", municipality: "medellin", department: "Antioquia", location: "", visitedAt: "2026-04-01T15:00:00.000Z" },
    ]);
    expect(summary.places).toBe(3);
    expect(summary.municipalities).toBe(2);
    expect(summary.latestName).toBe("Guatapé");
    expect(sharedPlaceLabel([
      { municipality: "Medellín", location: "" },
      { municipality: "Medellin", location: "" },
    ])).toBe("Medellín");
    expect(placesLine(1, 1)).toBe("1 lugar recorrido · 1 municipio");
    expect(placesLine(12, 6)).toBe("12 lugares recorridos · 6 municipios");
  });

  it("solo muestra año y fecha cuando la marca de visita es válida", () => {
    const iso = "2026-06-15T15:00:00.000Z";
    expect(visitYear(iso)).toBe(new Date(iso).getFullYear());
    expect(visitMarkedLabel(iso)).toContain("Marcada el");
    expect(visitMarkedLabel(iso)).toContain(String(new Date(iso).getFullYear()));
    expect(visitYear("")).toBeNull();
    expect(visitMarkedLabel("no-fecha")).toBeNull();
  });
});
