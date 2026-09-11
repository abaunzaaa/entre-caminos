import { useEffect, useRef } from "react";
import type { AvatarConfig } from "../../types";
import { paintAvatar } from "./avatar-paint";

const packagedLayers = import.meta.glob("../../assets/avatars/v2/**/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const hasPackagedAvatarAssets = Object.keys(packagedLayers).length > 0;

function packagedLayer(relative: string) {
  const needle = `/avatars/v2/${relative}`.replaceAll("\\", "/");
  const match = Object.entries(packagedLayers).find(([key]) => key.replaceAll("\\", "/").endsWith(needle));
  return match?.[1] ?? null;
}

function layerSrc(relative: string) {
  return packagedLayer(`${relative}.png`) ?? packagedLayer(`${relative}.webp`);
}

export function composedAvatarLayers(config: AvatarConfig) {
  const hair =
    config.hairStyle === "none" ? null : layerSrc(`hair/${config.hairStyle}/${config.hairColor}`);
  return [
    { id: "skin", src: layerSrc(`skin/${config.skinTone}`) },
    { id: "face", src: layerSrc(`face/${config.face}`) },
    { id: "eyes", src: layerSrc(`eyes/${config.eyes ?? "almond"}`) },
    { id: "eyebrows", src: layerSrc(`eyebrows/${config.eyebrows ?? "soft"}`) },
    { id: "mouth", src: layerSrc(`mouths/${config.mouth ?? "soft-smile"}`) },
    hair ? { id: "hair", src: hair } : null,
    { id: "outfit", src: layerSrc(`outfit/${config.outfit}/${config.outfitColor}`) },
    config.glasses && config.glasses !== "none" ? { id: "glasses", src: layerSrc(`glasses/${config.glasses}`) } : null,
    config.accessory && config.accessory !== "none"
      ? { id: "accessory", src: layerSrc(`accessory/${config.accessory}`) }
      : null,
  ].filter((layer): layer is { id: string; src: string } => Boolean(layer?.src));
}

export function AvatarPreview({
  config,
  size = 260,
  label,
}: {
  config: AvatarConfig;
  size?: number;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layers = composedAvatarLayers(config);
  const canCompose = ["skin", "eyes", "outfit"].every((id) => layers.some((layer) => layer.id === id));

  useEffect(() => {
    if (canCompose) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintAvatar(ctx, size, config);
  }, [canCompose, config, size]);

  return (
    <div className="onboarding-avatar-stage" style={{ width: size, height: size }}>
      {canCompose ? (
        <div className="onboarding-avatar-layers" role="img" aria-label={label ?? "Vista previa del avatar"}>
          {layers.map((layer) => (
            <img key={layer.id} src={layer.src} alt="" />
          ))}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="onboarding-avatar-canvas"
          style={{ width: size, height: size }}
          role="img"
          aria-label={label ?? "Vista previa del avatar"}
        />
      )}
    </div>
  );
}
