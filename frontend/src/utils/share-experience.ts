import { showFavoriteToast } from "../services/favorites-sync";

export function experiencePublicPath(experienceId: string) {
  return `/explorar/${experienceId}`;
}

export function experiencePublicUrl(experienceId: string) {
  return new URL(experiencePublicPath(experienceId), window.location.origin).toString();
}

export async function shareExperience(experienceId: string, title: string) {
  const shareUrl = experiencePublicUrl(experienceId);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: shareUrl });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(shareUrl);
    showFavoriteToast("Enlace copiado correctamente");
  } catch {
    showFavoriteToast("No se pudo copiar el enlace", "error");
  }
}
