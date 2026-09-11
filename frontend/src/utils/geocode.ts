import { findDepartment } from "../data/colombia-locations";

export type GeoPoint = { lat: number; lng: number };

export type GeocodeQuery = {
  address?: string;
  municipality?: string;
  department?: string;
};

export type GeocodeMatch = GeoPoint & {
  label: string;
};

export type ReverseGeocodeMatch = {
  lat: number;
  lng: number;
  address: string;
  municipality: string;
  department: string;
  label: string;
};

type MapboxFeature = {
  center?: [number, number];
  place_type?: string[];
  relevance?: number;
  place_name?: string;
  text?: string;
  address?: string;
  properties?: { accuracy?: string };
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  display_name?: string;
};

type ArcGisCandidate = {
  address?: string;
  score?: number;
  location?: { x?: number; y?: number };
  attributes?: {
    Addr_type?: string;
    Match_addr?: string;
    LongLabel?: string;
    StAddr?: string;
    City?: string;
    Region?: string;
    PlaceName?: string;
  };
};

const PRECISE_MAPBOX_TYPES = new Set(["address", "poi"]);
const COARSE_MAPBOX_TYPES = new Set(["neighborhood", "locality", "place", "region", "district", "country", "postcode"]);
const PRECISE_ARCGIS_TYPES = new Set([
  "pointaddress",
  "streetaddress",
  "poi",
  "poiname",
  "buildingname",
  "subaddress",
  "point address",
  "street address",
  "poi name",
  "building name",
]);
const COARSE_ARCGIS_TYPES = new Set([
  "streetname",
  "street name",
  "locality",
  "city",
  "neighborhood",
  "district",
  "admin",
  "subadmin",
  "territory",
  "postal",
]);
const proximityCache = new Map<string, GeoPoint>();

function readMapboxToken() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return typeof token === "string" ? token.trim() : "";
}

function asPoint(lat: number, lng: number): GeoPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function expandStreetAliases(value: string) {
  return value
    .replace(/\b(cll?|cl)\.?\b/gi, "Calle")
    .replace(/\b(cra|cr|kr)\.?\b/gi, "Carrera")
    .replace(/\b(av|ave)\.?\b/gi, "Avenida")
    .replace(/\b(tv|transv)\.?\b/gi, "Transversal")
    .replace(/\b(dg|diag)\.?\b/gi, "Diagonal");
}

function looksLikeStreetQuery(address: string) {
  return /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|vereda|km\b|#)/i.test(address);
}

function hasHouseNumber(address: string) {
  return /#\s*\d/i.test(address) || /\d+[a-z]?\s*-\s*\d+/i.test(address);
}

export function composeGeocodeQuery(query: GeocodeQuery) {
  return [query.address, query.municipality, query.department, "Colombia"]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

function addressQueryVariants(query: GeocodeQuery) {
  const street = query.address?.trim() ?? "";
  if (!street) {
    return [];
  }
  const composed = composeGeocodeQuery(query);
  const place = [query.municipality, query.department, "Colombia"].map((part) => part?.trim()).filter(Boolean).join(", ");
  const raw = expandStreetAliases(street);
  const variants = unique([
    composed,
    raw,
    raw.replace(/#/g, " "),
    raw.replace(/#/g, "").replace(/-/g, " "),
    raw.replace(/#/g, " ").replace(/-/g, " "),
  ]);
  return unique([
    composed,
    ...variants.map((item) => (item === composed ? item : place ? `${item}, ${place}` : `${item}, Colombia`)),
  ]);
}

function isPreciseMapboxFeature(feature: MapboxFeature, requireNumber: boolean) {
  const types = feature.place_type ?? [];
  if (!types.some((type) => PRECISE_MAPBOX_TYPES.has(type))) {
    return false;
  }
  if (types.some((type) => COARSE_MAPBOX_TYPES.has(type))) {
    return false;
  }
  const accuracy = feature.properties?.accuracy ?? "";
  if (accuracy === "street" || accuracy === "intersection") {
    return false;
  }
  if (requireNumber && types.includes("address") && !feature.address) {
    return false;
  }
  return (feature.relevance ?? 0) >= 0.5;
}

function isPreciseNominatimResult(item: NominatimResult, allowPoi: boolean) {
  const kind = `${item.addresstype ?? ""} ${item.type ?? ""} ${item.class ?? ""}`.toLowerCase();
  if (item.class === "highway" || item.addresstype === "road") {
    return false;
  }
  if (/(?:city|town|village|municipality|suburb|neighbourhood|neighborhood|quarter|state|administrative|boundary|county|region)/.test(kind)) {
    return false;
  }
  if (/(?:house|building|residential)/.test(kind)) {
    return true;
  }
  return allowPoi && /(?:tourism|amenity|attraction|museum|gallery|historic|shop|office)/.test(kind);
}

function arcgisType(candidate: ArcGisCandidate) {
  return (candidate.attributes?.Addr_type ?? "").trim().toLowerCase();
}

function isPreciseArcGisCandidate(candidate: ArcGisCandidate, requireNumber: boolean, allowPoi: boolean) {
  const type = arcgisType(candidate);
  if (COARSE_ARCGIS_TYPES.has(type)) {
    return false;
  }
  if (requireNumber && type === "streetname") {
    return false;
  }
  if ((type === "poi" || type === "poiname") && !allowPoi && requireNumber) {
    return false;
  }
  if (PRECISE_ARCGIS_TYPES.has(type)) {
    return (candidate.score ?? 0) >= (type === "poi" || type === "poiname" ? 60 : 85);
  }
  return allowPoi && (candidate.score ?? 0) >= 90;
}

function matchFromPoint(point: GeoPoint | null, label: string): GeocodeMatch | null {
  if (!point || !label.trim()) {
    return null;
  }
  return { ...point, label: label.trim() };
}

async function geocodeWithMapbox(
  query: string,
  token: string,
  requireNumber: boolean,
  proximity?: GeoPoint,
): Promise<GeocodeMatch | null> {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "co");
  url.searchParams.set("limit", "5");
  url.searchParams.set("language", "es");
  url.searchParams.set("autocomplete", "false");
  url.searchParams.set("types", "address,poi");
  if (proximity) {
    url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);
  }
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { features?: MapboxFeature[] };
  const ranked = (data.features ?? [])
    .filter((feature) => isPreciseMapboxFeature(feature, requireNumber) && Array.isArray(feature.center))
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
  const best = ranked[0];
  const point = best?.center ? asPoint(best.center[1], best.center[0]) : null;
  return matchFromPoint(point, best?.place_name || best?.text || query);
}

async function geocodeWithArcGis(
  query: string,
  requireNumber: boolean,
  allowPoi: boolean,
  proximity?: GeoPoint,
): Promise<GeocodeMatch | null> {
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  url.searchParams.set("f", "json");
  url.searchParams.set("singleLine", query);
  url.searchParams.set("countryCode", "COL");
  url.searchParams.set("maxLocations", "5");
  url.searchParams.set("outFields", "Addr_type,Match_addr,LongLabel,StAddr,City,Region,PlaceName,Score");
  if (proximity) {
    url.searchParams.set("location", `${proximity.lng},${proximity.lat}`);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { candidates?: ArcGisCandidate[] };
  const ranked = (data.candidates ?? [])
    .filter((candidate) => isPreciseArcGisCandidate(candidate, requireNumber, allowPoi) && candidate.location)
    .sort((a, b) => {
      const rank = (item: ArcGisCandidate) => {
        const type = arcgisType(item);
        if (type === "pointaddress") {
          return 3;
        }
        if (type === "poi") {
          return allowPoi ? 3 : 1;
        }
        return 2;
      };
      return rank(b) - rank(a) || (b.score ?? 0) - (a.score ?? 0);
    });
  const best = ranked[0];
  const point = best?.location ? asPoint(Number(best.location.y), Number(best.location.x)) : null;
  const label = best?.attributes?.LongLabel || best?.attributes?.PlaceName || best?.attributes?.Match_addr || best?.address || query;
  return matchFromPoint(point, label);
}

async function geocodeWithNominatim(query: GeocodeQuery, search: string): Promise<GeocodeMatch | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "co");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", search);
  const street = query.address?.trim() ?? "";
  const city = query.municipality?.trim() ?? "";
  const attempts = [url];
  if (street && city && looksLikeStreetQuery(street)) {
    const structured = new URL("https://nominatim.openstreetmap.org/search");
    structured.searchParams.set("format", "jsonv2");
    structured.searchParams.set("limit", "5");
    structured.searchParams.set("countrycodes", "co");
    structured.searchParams.set("addressdetails", "1");
    structured.searchParams.set("street", expandStreetAliases(street).replace(/#/g, " "));
    structured.searchParams.set("city", city);
    if (query.department?.trim()) {
      structured.searchParams.set("state", query.department.trim());
    }
    structured.searchParams.set("country", "Colombia");
    attempts.unshift(structured);
  }
  for (const request of attempts) {
    const response = await fetch(request.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) {
      continue;
    }
    const data = (await response.json()) as NominatimResult[];
    const best = data.find((item) => isPreciseNominatimResult(item, !looksLikeStreetQuery(street)) && item.lat && item.lon);
    const point = best?.lat && best.lon ? asPoint(Number(best.lat), Number(best.lon)) : null;
    const match = matchFromPoint(point, best?.display_name || search);
    if (match) {
      return match;
    }
  }
  return null;
}

async function geocodeExactQuery(query: GeocodeQuery, search: string, proximity?: GeoPoint): Promise<GeocodeMatch | null> {
  const street = query.address?.trim() ?? "";
  const requireNumber = hasHouseNumber(street);
  const allowPoi = !looksLikeStreetQuery(street) || !requireNumber;
  const arcgis = await geocodeWithArcGis(search, requireNumber, allowPoi, proximity);
  if (arcgis) {
    return arcgis;
  }
  const token = readMapboxToken();
  if (token) {
    const mapped = await geocodeWithMapbox(search, token, requireNumber, proximity);
    if (mapped) {
      return mapped;
    }
  }
  return geocodeWithNominatim(query, search);
}

async function resolveProximity(query: GeocodeQuery, fallback?: GeoPoint): Promise<GeoPoint | undefined> {
  const key = `${query.municipality?.trim() ?? ""}|${query.department?.trim() ?? ""}`;
  if (!query.municipality?.trim() && !query.department?.trim()) {
    return fallback;
  }
  const cached = proximityCache.get(key);
  if (cached) {
    return cached;
  }
  if (fallback && !query.municipality?.trim()) {
    proximityCache.set(key, fallback);
    return fallback;
  }
  const placeQuery = [query.municipality, query.department, "Colombia"].filter((part) => part?.trim()).join(", ");
  try {
    const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
    url.searchParams.set("f", "json");
    url.searchParams.set("singleLine", placeQuery);
    url.searchParams.set("countryCode", "COL");
    url.searchParams.set("maxLocations", "1");
    url.searchParams.set("outFields", "Addr_type,Score");
    const response = await fetch(url.toString());
    if (response.ok) {
      const data = (await response.json()) as { candidates?: ArcGisCandidate[] };
      const candidate = data.candidates?.[0];
      const point = candidate?.location ? asPoint(Number(candidate.location.y), Number(candidate.location.x)) : null;
      if (point) {
        proximityCache.set(key, point);
        return point;
      }
    }
  } catch {
    // Proximity is optional; the exact address search can still run.
  }
  if (fallback) {
    proximityCache.set(key, fallback);
  }
  return fallback;
}

export async function geocodeColombiaLocation(query: GeocodeQuery, proximity?: GeoPoint): Promise<GeocodeMatch | null> {
  const street = query.address?.trim() ?? "";
  if (!street) {
    return null;
  }
  const searches = addressQueryVariants(query);
  if (!searches.length) {
    return null;
  }
  try {
    const bias = await resolveProximity(query, proximity);
    for (const search of searches) {
      const match = await geocodeExactQuery(query, search, bias);
      if (match) {
        return match;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function geocodeColombia(query: string, proximity?: GeoPoint): Promise<GeocodeMatch | null> {
  return geocodeColombiaLocation({ address: query }, proximity);
}

type ArcGisReverseAddress = {
  Address?: string;
  ShortLabel?: string;
  LongLabel?: string;
  Match_addr?: string;
  StAddr?: string;
  Neighborhood?: string;
  District?: string;
  City?: string;
  Subregion?: string;
  Region?: string;
  PlaceName?: string;
  Postal?: string;
};

function cleanPlaceName(value?: string | null) {
  return (value ?? "")
    .replace(/\b(?:COL|Colombia)\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*|\s*,$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function departmentFromName(value?: string | null) {
  const name = cleanPlaceName(value);
  if (!name) {
    return "";
  }
  return findDepartment(name)?.name ?? "";
}

function streetFromReverse(address: ArcGisReverseAddress) {
  return cleanPlaceName(
    address.Address ||
      address.ShortLabel ||
      address.StAddr ||
      address.PlaceName ||
      address.Neighborhood ||
      address.District,
  );
}

function buildReverseMatch(
  lat: number,
  lng: number,
  parts: { street?: string; municipality?: string; department?: string; label?: string },
): ReverseGeocodeMatch {
  const department = departmentFromName(parts.department) || cleanPlaceName(parts.department);
  const municipality = cleanPlaceName(parts.municipality);
  const street =
    cleanPlaceName(parts.street) ||
    [municipality, department].filter(Boolean).join(", ") ||
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const label =
    cleanPlaceName(parts.label) ||
    [street, municipality, department].filter(Boolean).join(", ");
  return {
    lat,
    lng,
    address: street,
    municipality,
    department,
    label,
  };
}

async function reverseWithArcGis(lat: number, lng: number): Promise<ReverseGeocodeMatch | null> {
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode");
  url.searchParams.set("f", "json");
  url.searchParams.set("langCode", "es");
  url.searchParams.set("location", `${lng},${lat}`);
  url.searchParams.set("featureTypes", "PointAddress,StreetAddress,StreetName,POI");
  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { address?: ArcGisReverseAddress };
  if (!data.address) {
    return null;
  }
  return buildReverseMatch(lat, lng, {
    street: streetFromReverse(data.address),
    municipality: data.address.City,
    department: data.address.Region || data.address.Subregion,
    label: data.address.LongLabel || data.address.Match_addr,
  });
}

async function reverseWithMapbox(lat: number, lng: number, token: string): Promise<ReverseGeocodeMatch | null> {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "co");
  url.searchParams.set("language", "es");
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,poi,neighborhood,place,locality");
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      address?: string;
      place_type?: string[];
      context?: Array<{ id?: string; text?: string }>;
    }>;
  };
  const features = data.features ?? [];
  const best =
    features.find((item) => item.place_type?.includes("address")) ||
    features.find((item) => item.place_type?.includes("poi")) ||
    features[0];
  if (!best) {
    return null;
  }
  const context = best.context ?? [];
  const region = context.find((item) => item.id?.startsWith("region"))?.text;
  const place = context.find((item) => item.id?.startsWith("place"))?.text || context.find((item) => item.id?.startsWith("locality"))?.text;
  const street = best.address ? `${best.text} ${best.address}`.trim() : best.text;
  return buildReverseMatch(lat, lng, {
    street,
    municipality: place,
    department: region,
    label: best.place_name,
  });
}

async function reverseWithNominatim(lat: number, lng: number): Promise<ReverseGeocodeMatch | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    display_name?: string;
    address?: {
      road?: string;
      house_number?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
    };
  };
  const addr = data.address;
  if (!addr && !data.display_name) {
    return null;
  }
  const street = [addr?.road, addr?.house_number].filter(Boolean).join(" ") || addr?.neighbourhood || addr?.suburb;
  return buildReverseMatch(lat, lng, {
    street,
    municipality: addr?.city || addr?.town || addr?.village,
    department: addr?.state,
    label: data.display_name,
  });
}

export async function reverseGeocodeColombia(lat: number, lng: number): Promise<ReverseGeocodeMatch | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  try {
    const arcgis = await reverseWithArcGis(lat, lng);
    if (arcgis?.address) {
      return arcgis;
    }
    const token = readMapboxToken();
    if (token) {
      const mapped = await reverseWithMapbox(lat, lng, token);
      if (mapped?.address) {
        return mapped;
      }
    }
    return await reverseWithNominatim(lat, lng);
  } catch {
    return buildReverseMatch(lat, lng, {
      street: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
  }
}
