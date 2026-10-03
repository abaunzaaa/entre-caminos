import { parseStoredLocation, composeLocation } from "../data/colombia-locations";
import { parseAvailability, type ExperienceAvailability } from "./experience-details";
import type { Experience } from "../types";

export type PlaceGeocodeStatus = "idle" | "searching" | "exact" | "missing" | "manual";

export type ExperiencePlaceDraft = {
  key: string;
  id?: string;
  department: string;
  municipality: string;
  address: string;
  latitude: string;
  longitude: string;
  geocodeStatus: PlaceGeocodeStatus;
  geocodedLabel: string;
  howToGetThere: string;
  availability: ExperienceAvailability;
};

type StoredPlace = {
  id?: string;
  department?: string | null;
  municipality?: string | null;
  address?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  howToGetThere?: string | null;
  availability?: unknown;
};

let placeKey = 0;

function nextKey() {
  placeKey += 1;
  return `place-${placeKey}`;
}

function coord(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "";
  }
  return String(value);
}

export function emptyPlace(): ExperiencePlaceDraft {
  return {
    key: nextKey(),
    department: "",
    municipality: "",
    address: "",
    latitude: "",
    longitude: "",
    geocodeStatus: "idle",
    geocodedLabel: "",
    howToGetThere: "",
    availability: { type: "EVERY_DAY", times: [] },
  };
}

function draftFrom(input: {
  key?: string;
  id?: string;
  department: string;
  municipality: string;
  address: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  howToGetThere?: string | null;
  availability?: unknown;
  geocodeStatus?: PlaceGeocodeStatus;
}): ExperiencePlaceDraft {
  const latitude = coord(input.latitude);
  const longitude = coord(input.longitude);
  return {
    key: input.key || input.id || nextKey(),
    id: input.id,
    department: input.department,
    municipality: input.municipality,
    address: input.address,
    latitude,
    longitude,
    geocodeStatus: input.geocodeStatus ?? (latitude && longitude ? "manual" : "idle"),
    geocodedLabel: "",
    howToGetThere: input.howToGetThere ?? "",
    availability: parseAvailability(input.availability),
  };
}

export function placesFromExperience(experience: Experience): ExperiencePlaceDraft[] {
  const rows = Array.isArray(experience.locations) ? experience.locations : [];
  if (!rows.length) {
    const parsed = parseStoredLocation(experience.location || "");
    return [
      draftFrom({
        ...parsed,
        latitude: experience.latitude,
        longitude: experience.longitude,
        howToGetThere: experience.howToGetThere,
        availability: experience.availability,
      }),
    ];
  }
  return rows.map((row) => {
    const stored = row as StoredPlace;
    const parsed =
      stored.department?.trim() || stored.municipality?.trim()
        ? {
            department: stored.department?.trim() ?? "",
            municipality: stored.municipality?.trim() ?? "",
            address: stored.address?.trim() ?? "",
          }
        : parseStoredLocation(stored.address || experience.location || "");
    return draftFrom({
      id: stored.id,
      ...parsed,
      latitude: stored.latitude,
      longitude: stored.longitude,
      howToGetThere: stored.howToGetThere,
      availability: stored.availability,
    });
  });
}

export function placeTabLabel(place: ExperiencePlaceDraft, index: number, places: ExperiencePlaceDraft[]) {
  const city = place.municipality.trim();
  if (!city) {
    return `Ubicación ${index + 1}`;
  }
  const sameCity = places.filter((item) => item.municipality.trim() === city);
  if (sameCity.length < 2) {
    return city;
  }
  const nth = places.slice(0, index + 1).filter((item) => item.municipality.trim() === city).length;
  return `${city} ${nth}`;
}

function scheduleHasContent(availability: ExperienceAvailability) {
  if (availability.type === "COMING_SOON") {
    return true;
  }
  if (availability.type === "WEEKDAYS") {
    return availability.days.length > 0 || availability.times.length > 0;
  }
  if (availability.type === "DATES") {
    return availability.dates.length > 0 || availability.times.length > 0;
  }
  return availability.times.length > 0;
}

export function placeHasContent(place: ExperiencePlaceDraft) {
  return Boolean(
    place.id ||
      place.department ||
      place.municipality ||
      place.address.trim() ||
      place.howToGetThere.trim() ||
      place.latitude ||
      place.longitude ||
      scheduleHasContent(place.availability),
  );
}

export function projectExperience(experience: Experience, place: ExperiencePlaceDraft): Experience {
  const location = composeLocation(place.address, place.municipality, place.department);
  return {
    ...experience,
    location: location || experience.location,
    latitude: place.latitude ? Number(place.latitude) : null,
    longitude: place.longitude ? Number(place.longitude) : null,
    availability: place.availability,
    howToGetThere: place.howToGetThere.trim() || null,
  };
}
