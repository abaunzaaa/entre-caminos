import { cardMunicipality } from "../components/explorer/explorer-media";
import { latLngToWorld, worldToLatLng } from "./map-projection";

/** Misma vista general de Colombia que el mapa de explorar. Solo antes de medir el lienzo. */
export const VISITED_OVERVIEW = { latitude: 4.570868, longitude: -74.297333, zoom: 6 };

export const VISITED_MIN_ZOOM = 5;
/** Exploración manual: barrio, no calle a pantalla completa. */
export const VISITED_MAX_ZOOM = 12;
/** Una sola experiencia, o varias muy juntas, no entran a nivel de calle. */
export const VISITED_FIT_MAX_ZOOM = 11;

export type VisitedFrame = {
  latitude: number;
  longitude: number;
  zoom: number;
};

export type VisitedPadding = {
  x: number;
  y: number;
};

type LngLat = {
  latitude: number;
  longitude: number;
};

type PlaceFields = {
  municipality?: string | null;
  department?: string | null;
  location?: string | null;
};

export function isMappable<T extends { latitude: number | null; longitude: number | null }>(
  stop: T,
): stop is T & { latitude: number; longitude: number } {
  return stop.latitude != null && stop.longitude != null && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude);
}

export function orderJourney<T extends { id: string; visitedAt: string }>(stops: T[]) {
  return [...stops].sort((a, b) => {
    const left = Date.parse(a.visitedAt);
    const right = Date.parse(b.visitedAt);
    const leftOk = Number.isFinite(left);
    const rightOk = Number.isFinite(right);
    if (leftOk && rightOk && left !== right) {
      return left - right;
    }
    if (leftOk !== rightOk) {
      return leftOk ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
}

export function stopPlaceName(stop: PlaceFields) {
  const direct = stop.municipality?.trim() ?? "";
  if (direct) {
    return direct;
  }
  return cardMunicipality({
    location: stop.location,
    locations: [{ municipality: stop.municipality }],
  });
}

function foldPlace(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function journeySummary<T extends PlaceFields & { id: string; title: string; visitedAt: string }>(stops: T[]) {
  const names = new Set<string>();
  for (const stop of stops) {
    const key = foldPlace(stopPlaceName(stop));
    if (key) {
      names.add(key);
    }
  }
  const ordered = orderJourney(stops);
  const latest = ordered[ordered.length - 1];
  const latestName = latest ? stopPlaceName(latest) || latest.title.trim() : "";
  return {
    places: stops.length,
    municipalities: names.size,
    latestName,
  };
}

export function visitYear(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return null;
  }
  return new Date(time).getFullYear();
}

export function visitMarkedLabel(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return null;
  }
  const formatted = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(time));
  return `Marcada el ${formatted}`;
}

export function sharedPlaceLabel(stops: PlaceFields[]) {
  const names = stops.map((stop) => stopPlaceName(stop)).filter(Boolean);
  if (!names.length) {
    return "";
  }
  const folded = foldPlace(names[0]);
  return names.every((name) => foldPlace(name) === folded) ? names[0] : "";
}

export function sharedVisitYear(stops: Array<{ visitedAt: string }>) {
  const years = stops.map((stop) => visitYear(stop.visitedAt));
  if (years.some((year) => year == null)) {
    return null;
  }
  const first = years[0];
  return years.every((year) => year === first) ? first ?? null : null;
}

function paddedBounds(points: LngLat[], ratio = 0.22) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }
  const latPad = Math.max((maxLat - minLat) * ratio, 0.012);
  const lngPad = Math.max((maxLng - minLng) * ratio, 0.012);
  return {
    minLat: Math.max(-85, minLat - latPad),
    maxLat: Math.min(85, maxLat + latPad),
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function spanAtZoom(bounds: ReturnType<typeof paddedBounds>, zoom: number) {
  const northWest = latLngToWorld(bounds.maxLat, bounds.minLng, zoom);
  const southEast = latLngToWorld(bounds.minLat, bounds.maxLng, zoom);
  return {
    width: Math.abs(southEast.x - northWest.x),
    height: Math.abs(southEast.y - northWest.y),
    northWest,
    southEast,
  };
}

export function fitVisitedBounds(
  points: LngLat[],
  width: number,
  height: number,
  padding: VisitedPadding,
  geographicPad = 0.22,
): VisitedFrame {
  if (!points.length || width < 40 || height < 40) {
    return VISITED_OVERVIEW;
  }

  const padX = Math.min(padding.x, width * 0.28);
  const padY = Math.min(padding.y, height * 0.28);
  const availableWidth = Math.max(32, width - padX * 2);
  const availableHeight = Math.max(32, height - padY * 2);
  const bounds = paddedBounds(points, geographicPad);
  let zoom = VISITED_MIN_ZOOM;

  for (let candidate = VISITED_FIT_MAX_ZOOM; candidate >= VISITED_MIN_ZOOM; candidate -= 1) {
    const span = spanAtZoom(bounds, candidate);
    if (span.width <= availableWidth && span.height <= availableHeight) {
      zoom = candidate;
      break;
    }
  }

  const span = spanAtZoom(bounds, zoom);
  const center = worldToLatLng((span.northWest.x + span.southEast.x) / 2, (span.northWest.y + span.southEast.y) / 2, zoom);
  return { latitude: center.lat, longitude: center.lng, zoom };
}

export type ScreenPoint = { x: number; y: number };

export function clusterVisitedStops<T extends { id: string }>(
  stops: T[],
  project: (stop: T) => ScreenPoint,
  thresholdPx: number,
) {
  const clusters: Array<{ id: string; anchor: T; items: T[]; x: number; y: number }> = [];
  for (const stop of stops) {
    const pos = project(stop);
    const existing = clusters.find((cluster) => Math.hypot(cluster.x - pos.x, cluster.y - pos.y) < thresholdPx);
    if (existing) {
      existing.items.push(stop);
    } else {
      clusters.push({ id: stop.id, anchor: stop, items: [stop], x: pos.x, y: pos.y });
    }
  }
  return clusters.map(({ id, anchor, items }) => ({ id, anchor, items }));
}

export function spiderOffsets(count: number, radius: number) {
  if (count <= 1) {
    return [{ x: 0, y: 0 }];
  }
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function curvePath(points: ScreenPoint[]) {
  if (points.length < 2) {
    return "";
  }
  let path = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 2) {
      continue;
    }
    const bend = Math.min(28, length * 0.16) * (index % 2 === 0 ? 1 : -1);
    const cx = (from.x + to.x) / 2 + (-dy / length) * bend;
    const cy = (from.y + to.y) / 2 + (dx / length) * bend;
    path += `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)} `;
  }
  return path.trim();
}

export function formatMapCoordinate(latitude: number, longitude: number) {
  const lat = `${Math.abs(latitude).toFixed(3)}° ${latitude >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(longitude).toFixed(3)}° ${longitude >= 0 ? "E" : "O"}`;
  return `${lat} · ${lng}`;
}

export function placesLine(places: number, municipalities: number) {
  const placeLabel = places === 1 ? "1 lugar recorrido" : `${places} lugares recorridos`;
  if (municipalities <= 0) {
    return placeLabel;
  }
  const municipalityLabel = municipalities === 1 ? "1 municipio" : `${municipalities} municipios`;
  return `${placeLabel} · ${municipalityLabel}`;
}
