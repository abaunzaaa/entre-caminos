import scenicFallback from "../../assets/auth-scenic.jpg";
import { formatDepartmentMunicipality, parseStoredLocation } from "../../data/colombia-locations";
import { experienceImages, mediaUrl } from "../../utils/media";

export function experienceCoverUrl(
  experience: { imageUrl?: string | null; imageUrls?: string[] | null },
  width = 1600,
) {
  const cover = experienceImages(experience)[0];
  return cover ? mediaUrl(cover, width) : scenicFallback;
}

export function experienceGalleryUrls(
  experience: { imageUrl?: string | null; imageUrls?: string[] | null },
) {
  const images = experienceImages(experience);
  if (!images.length) {
    return [scenicFallback];
  }
  return images.map((url) => mediaUrl(url, 720));
}

export function municipalityLabel(location?: string | null) {
  if (!location?.trim()) {
    return "";
  }
  const parsed = parseStoredLocation(location);
  if (parsed.municipality?.trim()) {
    return parsed.municipality.trim();
  }
  return formatDepartmentMunicipality(location) || location;
}

const STREET_OR_VENUE =
  /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|vereda|km\b|#|hotel|hostal|recogid|encuentro|c[oó]mo llegar|direcci[oó]n)/i;

function shortLegacyMunicipality(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text || text.length > 48 || text.includes(",") || STREET_OR_VENUE.test(text)) {
    return "";
  }
  return text;
}

/** Municipality shown on the “Elegidos para ti” card. Does not use address or how-to-get-there. */
export function cardMunicipality(experience: {
  location?: string | null;
  locations?: Array<{ municipality?: string | null }> | null;
}) {
  const primary = experience.locations?.[0]?.municipality?.trim();
  if (primary) {
    return primary;
  }

  const legacy = shortLegacyMunicipality(parseStoredLocation(experience.location || "").municipality);
  if (legacy) {
    return legacy;
  }

  return shortLegacyMunicipality(experience.location);
}
