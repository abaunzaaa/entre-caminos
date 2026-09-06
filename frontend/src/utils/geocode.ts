export type GeoPoint = { lat: number; lng: number };

function readMapboxToken() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return typeof token === "string" ? token.trim() : "";
}

async function geocodeWithMapbox(query: string, token: string): Promise<GeoPoint | null> {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "co");
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "es");
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { features?: Array<{ center?: [number, number] }> };
  const center = data.features?.[0]?.center;
  if (!center) {
    return null;
  }
  return { lng: center[0], lat: center[1] };
}

async function geocodeWithNominatim(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "co");
  url.searchParams.set("q", query);
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = data[0];
  if (!first?.lat || !first.lon) {
    return null;
  }
  return { lat: Number(first.lat), lng: Number(first.lon) };
}

export async function geocodeColombia(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return null;
  }
  try {
    const token = readMapboxToken();
    if (token) {
      const mapped = await geocodeWithMapbox(trimmed, token);
      if (mapped) {
        return mapped;
      }
    }
    return await geocodeWithNominatim(`${trimmed}, Colombia`);
  } catch {
    return null;
  }
}
