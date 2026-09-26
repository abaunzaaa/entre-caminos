import { paintAvatar } from "../components/onboarding/avatar-paint";
import { composedAvatarLayers } from "../components/onboarding/AvatarPreview";
import type { AvatarConfig } from "../types";

const cache = new Map<string, string>();

function cacheKey(config: AvatarConfig, size: number) {
  return `${size}:${JSON.stringify(config)}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer una capa del avatar"));
    image.src = src;
  });
}

export async function snapshotAvatarConfig(config: AvatarConfig, size = 256) {
  const key = cacheKey(config, size);
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  if (typeof document === "undefined") {
    throw new Error("El avatar ilustrado necesita el navegador");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo dibujar el avatar");
  }

  const layers = composedAvatarLayers(config);
  const canCompose = ["skin", "eyes", "outfit"].every((id) => layers.some((layer) => layer.id === id));
  if (canCompose) {
    for (const layer of layers) {
      const image = await loadImage(layer.src);
      context.drawImage(image, 0, 0, size, size);
    }
  } else {
    paintAvatar(context, size, config);
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  cache.set(key, dataUrl);
  return dataUrl;
}
