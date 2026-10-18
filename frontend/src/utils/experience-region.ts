import {
  COLOMBIA_DEPARTMENTS,
  findDepartment,
  findMunicipality,
  formatDepartmentMunicipality,
} from "../data/colombia-locations";

const STREET_PLACE = /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|vereda|km\b|#)/i;

function joinPlace(department?: string | null, municipality?: string | null) {
  const dept = department?.trim() || "";
  const city = municipality?.trim() || "";
  if (dept && city) {
    return `${dept} · ${city}`;
  }
  return dept || city;
}

/** Misma decisión que las tarjetas del mapa en inicio: solo departamento y municipio. */
export function mapCardPlace(experience: {
  location?: string | null;
  locations?: Array<{ department?: string | null; municipality?: string | null }> | null;
}) {
  const stored = experience.locations?.find((item) => item.department?.trim() || item.municipality?.trim());
  if (stored) {
    return joinPlace(stored.department, stored.municipality);
  }

  const location = (experience.location ?? "").replace(/\([^)]*\)/g, " ").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  const formatted = formatDepartmentMunicipality(location);
  if (formatted) {
    return formatted;
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !STREET_PLACE.test(part));
  let department = "";
  const cityParts: string[] = [];
  for (const part of parts) {
    const match = findDepartment(part);
    if (match) {
      department = match.name;
    } else {
      cityParts.push(part);
    }
  }

  if (department) {
    const city = cityParts.map((part) => findMunicipality(department, part)).find(Boolean) ?? "";
    return joinPlace(department, city);
  }

  for (const part of cityParts) {
    const matches = COLOMBIA_DEPARTMENTS.flatMap((item) => {
      const city = findMunicipality(item.name, part);
      return city ? [{ department: item.name, city }] : [];
    });
    if (matches.length === 1) {
      return joinPlace(matches[0].department, matches[0].city);
    }
    if (matches.length > 1) {
      return matches[0].city;
    }
  }

  return "";
}
