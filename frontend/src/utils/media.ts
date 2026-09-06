const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";

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
