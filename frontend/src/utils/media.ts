const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=70";

function withCloudinaryTransform(url: string, width: number) {
  if (!url.includes("/upload/") || !/res\.cloudinary\.com|cloudinary/i.test(url)) {
    return url;
  }
  if (/\/upload\/(?:[^/]+,)*?(?:f_auto|q_auto|w_\d+)/.test(url)) {
    return url;
  }
  return url.replace("/upload/", `/upload/f_auto,q_auto:eco,c_limit,w_${width}/`);
}

export function mediaUrl(url?: string | null, width = 960) {
  if (!url) {
    return PLACEHOLDER;
  }
  let resolved = url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    resolved = url;
  } else if (url.startsWith("/")) {
    const api = import.meta.env.VITE_API_URL as string | undefined;
    // Absolute API host → prefix origin. Relative `/api` → keep path (Vite proxies `/uploads`).
    if (api && /^https?:\/\//i.test(api)) {
      try {
        resolved = `${new URL(api).origin}${url}`;
      } catch {
        resolved = url;
      }
    } else {
      resolved = url;
    }
  }
  return withCloudinaryTransform(resolved, width);
}

/** Alias para thumbnails / galerías con ancho acotado. */
export function optimizedMediaUrl(url?: string | null, width = 640) {
  return mediaUrl(url, width);
}

export function experienceImages(experience: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = (experience.imageUrls ?? []).map((url) => url.trim()).filter(Boolean);
  if (listed.length) {
    return listed;
  }
  return experience.imageUrl ? [experience.imageUrl] : [];
}
