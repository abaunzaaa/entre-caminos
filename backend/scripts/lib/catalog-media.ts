/**
 * Extrae public_id aproximado de URLs de Cloudinary (no hay columna public_id en experiences).
 * Formato típico: .../image/upload/v123/folder/name.jpg o .../upload/folder/name.png
 */
export function cloudinaryPublicIdFromUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("cloudinary.com")) {
      return null;
    }
    const marker = "/upload/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) {
      return null;
    }
    let rest = parsed.pathname.slice(idx + marker.length);
    // Quita transformaciones y versión v1234/
    rest = rest.replace(/^([^/]+,)*[^/]+\//, (segment) => (segment.includes(",") ? "" : segment));
    rest = rest.replace(/^v\d+\//, "");
    const withoutExt = rest.replace(/\.[a-zA-Z0-9]+$/, "");
    return withoutExt || null;
  } catch {
    return null;
  }
}

export function collectExperienceImageRefs(experience: {
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  stampImageUrl?: string | null;
}) {
  const urls = [
    experience.imageUrl,
    ...(Array.isArray(experience.imageUrls) ? experience.imageUrls : []),
    experience.stampImageUrl,
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  const unique = [...new Set(urls)];
  return unique.map((url) => ({
    url,
    publicId: cloudinaryPublicIdFromUrl(url),
    host: (() => {
      try {
        return new URL(url).host;
      } catch {
        return null;
      }
    })(),
  }));
}

export function hostOfDatabaseUrl(url?: string) {
  if (!url) {
    return "(vacía)";
  }
  const withoutProtocol = url.replace(/^postgres(ql)?:\/\//, "");
  const at = withoutProtocol.lastIndexOf("@");
  const hostPart = at >= 0 ? withoutProtocol.slice(at + 1) : withoutProtocol;
  return hostPart.split("/")[0] ?? hostPart;
}
