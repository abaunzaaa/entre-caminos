/** Radio por defecto para “cerca de ti”. Se puede ampliar con el query `radiusKm`. */
export const DEFAULT_NEARBY_RADIUS_KM = 50;

/** Tope para que un radio pedido no recorra el país entero. */
export const MAX_NEARBY_RADIUS_KM = 200;

/** Máximo de experiencias que devolvemos en una búsqueda, las más cercanas primero. */
export const MAX_NEARBY_RESULTS = 80;

const EARTH_RADIUS_KM = 6371;

export function coordinate(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Rechaza coordenadas vacías y el punto 0,0, que en este proyecto no representa una ubicación real. */
export function isValidCoordinate(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function resolveRadiusKm(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_NEARBY_RADIUS_KM;
  }
  return Math.min(value, MAX_NEARBY_RADIUS_KM);
}

export function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Caja aproximada para acotar la consulta antes de medir la distancia real. */
export function searchBounds(latitude: number, longitude: number, radiusKm: number) {
  const latDelta = radiusKm / 110.574;
  const cos = Math.cos((latitude * Math.PI) / 180);
  const lngDelta = radiusKm / (111.32 * Math.max(0.2, Math.abs(cos)));
  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLng: Math.max(-180, longitude - lngDelta),
    maxLng: Math.min(180, longitude + lngDelta),
  };
}

export type NearbyCandidate = {
  title?: string;
  latitude?: unknown;
  longitude?: unknown;
  locations?: Array<{
    latitude?: unknown;
    longitude?: unknown;
    department?: string | null;
    municipality?: string | null;
  }>;
};

export type NearbyMatch<T> = {
  item: T;
  latitude: number;
  longitude: number;
  distanceKm: number;
  locations: Array<{ department: string; municipality: string }>;
};

function candidatePins(item: NearbyCandidate) {
  const pins: Array<{ latitude: number; longitude: number }> = [];
  function push(latitude: number | null, longitude: number | null) {
    if (latitude == null || longitude == null || !isValidCoordinate(latitude, longitude)) {
      return;
    }
    const duplicate = pins.some(
      (pin) => Math.abs(pin.latitude - latitude) < 0.00001 && Math.abs(pin.longitude - longitude) < 0.00001,
    );
    if (!duplicate) {
      pins.push({ latitude, longitude });
    }
  }

  push(coordinate(item.latitude), coordinate(item.longitude));
  for (const place of item.locations ?? []) {
    push(coordinate(place.latitude), coordinate(place.longitude));
  }
  return pins;
}

function labelLocations(item: NearbyCandidate, pin: { latitude: number; longitude: number }) {
  const places = item.locations ?? [];
  let matchedIndex = -1;
  let matchedDistance = 3;
  places.forEach((place, index) => {
    const lat = coordinate(place.latitude);
    const lng = coordinate(place.longitude);
    if (lat == null || lng == null) {
      return;
    }
    const distance = distanceKm(pin.latitude, pin.longitude, lat, lng);
    if (distance <= matchedDistance) {
      matchedDistance = distance;
      matchedIndex = index;
    }
  });
  const ordered = matchedIndex > 0
    ? [places[matchedIndex], ...places.filter((_, index) => index !== matchedIndex)]
    : places;
  return ordered
    .map((place) => ({
      department: place.department?.trim() || "",
      municipality: place.municipality?.trim() || "",
    }))
    .filter((place) => place.department || place.municipality);
}

/**
 * Elige experiencias con coordenadas reales dentro del radio.
 * La distancia se calcula una sola vez, en el backend.
 */
export function selectNearbyExperiences<T extends NearbyCandidate>(
  items: T[],
  origin: { latitude: number; longitude: number },
  radiusKm: number,
) {
  const matches: Array<NearbyMatch<T>> = [];
  for (const item of items) {
    let pin: { latitude: number; longitude: number; distance: number } | null = null;
    for (const candidate of candidatePins(item)) {
      const distance = distanceKm(origin.latitude, origin.longitude, candidate.latitude, candidate.longitude);
      if (distance > radiusKm) {
        continue;
      }
      if (!pin || distance < pin.distance) {
        pin = { ...candidate, distance };
      }
    }
    if (!pin) {
      continue;
    }
    matches.push({
      item,
      latitude: pin.latitude,
      longitude: pin.longitude,
      distanceKm: Math.round(pin.distance * 100) / 100,
      locations: labelLocations(item, pin),
    });
  }

  matches.sort((left, right) => {
    if (left.distanceKm !== right.distanceKm) {
      return left.distanceKm - right.distanceKm;
    }
    return (left.item.title ?? "").localeCompare(right.item.title ?? "", "es");
  });

  return matches.slice(0, MAX_NEARBY_RESULTS);
}
