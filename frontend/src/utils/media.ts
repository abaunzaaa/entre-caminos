const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";

/** Resize/compress Cloudinary delivery URLs for faster admin thumbnails and galleries. */
export function optimizedMediaUrl(url?: string | null, width = 960) {
  const resolved = mediaUrl(url);
  if (!/res\.cloudinary\.com\//i.test(resolved) || /\/upload\/(?:[^/]+,)*f_auto/.test(resolved)) {
    return resolved;
  }
  return resolved.replace("/upload/", `/upload/f_auto,q_auto:eco,c_limit,w_${width}/`);
}

export function mediaUrl(url?: string | null) {
  if (!url) {
    return PLACEHOLDER;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    const api = import.meta.env.VITE_API_URL as string | undefined;
    if (api) {
      try {
        return `${new URL(api).origin}${url}`;
      } catch {
        return url;
      }
    }
  }
  return url;
}

export function experienceImages(experience: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = (experience.imageUrls ?? []).map((url) => url.trim()).filter(Boolean);
  if (listed.length) {
    return listed;
  }
  return experience.imageUrl ? [experience.imageUrl] : [];
}
