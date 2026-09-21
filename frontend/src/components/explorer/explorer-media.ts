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
  return images.map((url) => mediaUrl(url, 960));
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
