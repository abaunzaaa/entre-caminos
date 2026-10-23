import { latLngToWorld } from "../../utils/map-projection";

/** Contorno continental simplificado. [latitud, longitud]. No incluye islas. */
export const COLOMBIA_RING: Array<[number, number]> = [
  [12.4, -71.7],
  [12.22, -71.32],
  [11.62, -71.9],
  [11.72, -72.55],
  [11.28, -73.5],
  [11.22, -74.22],
  [11.02, -74.82],
  [10.42, -75.52],
  [9.55, -75.68],
  [9.05, -76.28],
  [8.42, -76.78],
  [8.62, -77.32],
  [7.45, -77.75],
  [6.85, -77.42],
  [5.55, -77.32],
  [4.5, -77.28],
  [3.88, -77.4],
  [2.85, -77.72],
  [1.82, -78.78],
  [1.42, -78.9],
  [1.05, -78.15],
  [0.55, -77.2],
  [0.12, -75.7],
  [-0.15, -74.7],
  [-1.05, -73.7],
  [-2.05, -71.4],
  [-3.35, -70.25],
  [-4.21, -69.94],
  [-2.55, -69.55],
  [-1.15, -69.92],
  [0.35, -69.15],
  [1.18, -66.95],
  [2.35, -67.75],
  [3.85, -67.15],
  [4.55, -67.85],
  [5.85, -67.48],
  [6.95, -67.5],
  [7.08, -70.72],
  [7.85, -72.2],
  [8.58, -72.45],
  [9.35, -72.88],
  [10.1, -73.22],
  [10.82, -73.02],
  [11.5, -72.32],
  [12.12, -71.85],
];

function ringPath(points: Array<{ x: number; y: number }>) {
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")} Z`;
}

function decorativeColombia() {
  const zoom = 3;
  const projected = COLOMBIA_RING.map(([latitude, longitude]) => latLngToWorld(latitude, longitude, zoom));
  const minX = Math.min(...projected.map((point) => point.x));
  const minY = Math.min(...projected.map((point) => point.y));
  const maxX = Math.max(...projected.map((point) => point.x));
  const maxY = Math.max(...projected.map((point) => point.y));
  const pad = 10;
  return {
    d: ringPath(projected.map((point) => ({ x: point.x - minX + pad, y: point.y - minY + pad }))),
    viewBox: `0 0 ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`,
  };
}

export const COLOMBIA_DECORATIVE = decorativeColombia();

export function colombiaMapPath(project: (latitude: number, longitude: number) => { x: number; y: number }) {
  return ringPath(COLOMBIA_RING.map(([latitude, longitude]) => project(latitude, longitude)));
}
