import {
  AVATAR_HAIR_COLORS,
  AVATAR_OUTFIT_COLORS,
  AVATAR_SKIN_TONES,
} from "../../data/onboarding";
import type { AvatarConfig } from "../../types";

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgb([r, g, b]: [number, number, number], a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgb([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

function colorOf(list: readonly { id: string; color: string }[], id: string, fallback: string) {
  return list.find((item) => item.id === id)?.color ?? fallback;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function fillEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
) {
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = fill;
  ctx.fill();
}

function radial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: [number, string][],
) {
  const gradient = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  return gradient;
}

export function paintAvatar(ctx: CanvasRenderingContext2D, size: number, config: AvatarConfig) {
  const skin = colorOf(AVATAR_SKIN_TONES, config.skinTone, "#d4a574");
  const hair = colorOf(AVATAR_HAIR_COLORS, config.hairColor, "#6b3f2a");
  const cloth = colorOf(AVATAR_OUTFIT_COLORS, config.outfitColor, "#294942");
  const cx = size / 2;
  const face = config.face === "round" ? 1.08 : config.face === "oval" ? 0.9 : 1;
  const headRx = size * 0.228 * face;
  const headRy = size * 0.248;
  const headY = size * 0.4;
  const eyes = config.eyes ?? "almond";
  const brows = config.eyebrows ?? "soft";
  const mouth = config.mouth ?? "soft-smile";

  ctx.clearRect(0, 0, size, size);

  const backdrop = ctx.createRadialGradient(cx, size * 0.42, size * 0.08, cx, size * 0.5, size * 0.5);
  backdrop.addColorStop(0, "#f7fbf8");
  backdrop.addColorStop(0.62, "#e7f0ea");
  backdrop.addColorStop(1, "#d7e4dc");
  ctx.fillStyle = backdrop;
  ctx.beginPath();
  ctx.arc(cx, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgb(hexToRgb("#1c332e"), 0.08);
  fillEllipse(ctx, cx, size * 0.9, size * 0.22, size * 0.035, rgb(hexToRgb("#1c332e"), 0.1));

  const torsoTop = size * 0.62;
  ctx.beginPath();
  if (config.outfit === "jacket") {
    ctx.moveTo(cx - size * 0.28, size);
    ctx.quadraticCurveTo(cx - size * 0.26, torsoTop, cx, torsoTop - size * 0.02);
    ctx.quadraticCurveTo(cx + size * 0.26, torsoTop, cx + size * 0.28, size);
  } else if (config.outfit === "shirt") {
    ctx.moveTo(cx - size * 0.22, size);
    ctx.quadraticCurveTo(cx - size * 0.2, torsoTop + size * 0.02, cx, torsoTop);
    ctx.quadraticCurveTo(cx + size * 0.2, torsoTop + size * 0.02, cx + size * 0.22, size);
  } else {
    ctx.moveTo(cx - size * 0.24, size);
    ctx.quadraticCurveTo(cx - size * 0.22, torsoTop, cx, torsoTop - size * 0.01);
    ctx.quadraticCurveTo(cx + size * 0.22, torsoTop, cx + size * 0.24, size);
  }
  ctx.closePath();
  const clothGrad = ctx.createLinearGradient(cx - size * 0.2, torsoTop, cx + size * 0.22, size);
  clothGrad.addColorStop(0, mix(cloth, "#ffffff", 0.22));
  clothGrad.addColorStop(0.45, cloth);
  clothGrad.addColorStop(1, mix(cloth, "#111111", 0.28));
  ctx.fillStyle = clothGrad;
  ctx.fill();

  if (config.outfit === "jacket") {
    ctx.strokeStyle = mix(cloth, "#ffffff", 0.35);
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.moveTo(cx, torsoTop + size * 0.02);
    ctx.lineTo(cx, size);
    ctx.stroke();
  }

  fillEllipse(ctx, cx, size * 0.58, size * 0.07, size * 0.06, mix(skin, "#000000", 0.08));
  fillEllipse(
    ctx,
    cx,
    size * 0.575,
    size * 0.062,
    size * 0.052,
    radial(ctx, cx - 4, size * 0.55, 2, size * 0.07, [
      [0, mix(skin, "#ffffff", 0.18)],
      [1, mix(skin, "#5c3a28", 0.12)],
    ]),
  );

  fillEllipse(ctx, cx - headRx * 0.92, headY + headRy * 0.12, size * 0.032, size * 0.048, mix(skin, "#5c3a28", 0.08));
  fillEllipse(ctx, cx + headRx * 0.92, headY + headRy * 0.12, size * 0.032, size * 0.048, mix(skin, "#5c3a28", 0.08));

  if (config.hairStyle === "wavy" || config.hairStyle === "bun") {
    paintHairBack(ctx, cx, headY, headRx, headRy, hair, config.hairStyle);
  }

  const head = radial(ctx, cx - headRx * 0.28, headY - headRy * 0.35, size * 0.02, headRy * 1.35, [
    [0, mix(skin, "#ffffff", 0.34)],
    [0.35, mix(skin, "#ffffff", 0.08)],
    [0.72, skin],
    [1, mix(skin, "#3b2418", 0.22)],
  ]);
  fillEllipse(ctx, cx, headY, headRx, headRy, head);

  ctx.globalCompositeOperation = "multiply";
  fillEllipse(ctx, cx, headY + headRy * 0.22, headRx * 0.78, headRy * 0.7, rgb(hexToRgb("#8d5a3b"), 0.08));
  ctx.globalCompositeOperation = "source-over";

  if (config.hairStyle !== "none") {
    paintHairFront(ctx, cx, headY, headRx, headRy, hair, config.hairStyle);
  }

  const eyeY = headY - headRy * 0.02;
  const eyeGap = headRx * 0.42;
  const eyeRx = eyes === "round" ? size * 0.028 : eyes === "lidded" ? size * 0.03 : size * 0.026;
  const eyeRy = eyes === "round" ? size * 0.03 : eyes === "lidded" ? size * 0.02 : size * 0.026;
  paintEye(ctx, cx - eyeGap, eyeY, eyeRx, eyeRy, eyes === "lidded");
  paintEye(ctx, cx + eyeGap, eyeY, eyeRx, eyeRy, eyes === "lidded");

  ctx.strokeStyle = mix(hair, "#2a1a12", 0.35);
  ctx.lineWidth = brows === "defined" ? size * 0.012 : size * 0.009;
  ctx.lineCap = "round";
  const browY = eyeY - eyeRy * 2.1;
  paintBrow(ctx, cx - eyeGap, browY, eyeRx * 2.2, brows);
  paintBrow(ctx, cx + eyeGap, browY, eyeRx * 2.2, brows);

  fillEllipse(ctx, cx, headY + headRy * 0.12, size * 0.018, size * 0.028, mix(skin, "#5c3a28", 0.12));
  fillEllipse(ctx, cx - 1, headY + headRy * 0.08, size * 0.01, size * 0.014, mix(skin, "#ffffff", 0.28));

  ctx.strokeStyle = mix("#8d5a3b", skin, 0.2);
  ctx.lineWidth = size * 0.01;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (mouth === "soft-smile") {
    ctx.arc(cx, headY + headRy * 0.38, size * 0.046, 0.15, Math.PI - 0.15);
  } else if (mouth === "calm") {
    ctx.arc(cx, headY + headRy * 0.4, size * 0.038, 0.25, Math.PI - 0.25);
  } else {
    ctx.moveTo(cx - size * 0.028, headY + headRy * 0.42);
    ctx.lineTo(cx + size * 0.028, headY + headRy * 0.42);
  }
  ctx.stroke();

  if (config.glasses === "round" || config.glasses === "thin") {
    ctx.strokeStyle = rgb(hexToRgb("#24352f"), 0.78);
    ctx.lineWidth = config.glasses === "thin" ? size * 0.008 : size * 0.01;
    const gRx = size * 0.048;
    const gRy = config.glasses === "thin" ? size * 0.036 : size * 0.046;
    ellipse(ctx, cx - eyeGap, eyeY, gRx, gRy);
    ctx.stroke();
    ellipse(ctx, cx + eyeGap, eyeY, gRx, gRy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - eyeGap + gRx, eyeY);
    ctx.lineTo(cx + eyeGap - gRx, eyeY);
    ctx.stroke();
  }

  if (config.accessory === "earring") {
    fillEllipse(ctx, cx - headRx * 0.98, headY + headRy * 0.42, size * 0.014, size * 0.014, "#c4a35a");
    fillEllipse(ctx, cx - headRx * 0.98, headY + headRy * 0.4, size * 0.006, size * 0.006, "#f3e0a8");
  }
}

function paintEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  lidded: boolean,
) {
  fillEllipse(ctx, x, y, rx * 1.35, ry * 1.2, "#f7f4ef");
  fillEllipse(ctx, x, y, rx * 0.78, ry * 0.9, "#3d2a1f");
  fillEllipse(ctx, x, y, rx * 0.32, ry * 0.38, "#1a120e");
  fillEllipse(ctx, x - rx * 0.28, y - ry * 0.28, rx * 0.18, ry * 0.18, "#ffffff");
  if (lidded) {
    ctx.strokeStyle = "rgba(60, 40, 28, 0.35)";
    ctx.lineWidth = ry * 0.35;
    ctx.beginPath();
    ctx.ellipse(x, y - ry * 0.55, rx * 1.2, ry * 0.45, 0, Math.PI, 0);
    ctx.stroke();
  }
}

function paintBrow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, style: string) {
  ctx.beginPath();
  if (style === "arched") {
    ctx.moveTo(x - width, y);
    ctx.quadraticCurveTo(x, y - width * 0.45, x + width, y);
  } else if (style === "defined") {
    ctx.moveTo(x - width, y);
    ctx.lineTo(x + width, y);
  } else {
    ctx.moveTo(x - width, y);
    ctx.quadraticCurveTo(x, y - width * 0.18, x + width, y);
  }
  ctx.stroke();
}

function paintHairBack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  headRx: number,
  headRy: number,
  hair: string,
  style: string,
) {
  const dark = mix(hair, "#000000", 0.25);
  const light = mix(hair, "#ffffff", 0.18);
  fillEllipse(
    ctx,
    cx,
    headY - headRy * 0.15,
    headRx * 1.18,
    headRy * 1.12,
    radial(ctx, cx, headY - headRy * 0.5, 8, headRx * 1.3, [
      [0, light],
      [0.55, hair],
      [1, dark],
    ]),
  );
  if (style === "wavy") {
    fillEllipse(ctx, cx - headRx * 1.05, headY + headRy * 0.15, headRx * 0.38, headRy * 0.7, hair);
    fillEllipse(ctx, cx + headRx * 1.05, headY + headRy * 0.15, headRx * 0.38, headRy * 0.7, hair);
  }
}

function paintHairFront(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  headRx: number,
  headRy: number,
  hair: string,
  style: string,
) {
  const dark = mix(hair, "#000000", 0.2);
  const light = mix(hair, "#ffffff", 0.2);
  if (style === "short" || style === "fade") {
    ctx.beginPath();
    ctx.ellipse(cx, headY - headRy * 0.42, headRx * 1.02, headRy * 0.72, 0, Math.PI, 0);
    ctx.fillStyle = radial(ctx, cx - 10, headY - headRy * 0.7, 4, headRx, [
      [0, light],
      [1, dark],
    ]);
    ctx.fill();
    return;
  }
  if (style === "bun") {
    fillEllipse(
      ctx,
      cx,
      headY - headRy * 1.08,
      headRx * 0.42,
      headRy * 0.38,
      radial(ctx, cx - 6, headY - headRy * 1.2, 4, headRx * 0.5, [
        [0, light],
        [1, dark],
      ]),
    );
    ctx.beginPath();
    ctx.ellipse(cx, headY - headRy * 0.38, headRx * 1.05, headRy * 0.7, 0, Math.PI * 1.05, -0.05);
    ctx.fillStyle = hair;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.ellipse(cx, headY - headRy * 0.28, headRx * 1.12, headRy * 0.82, 0, Math.PI * 1.08, -0.08);
  ctx.fillStyle = radial(ctx, cx - 12, headY - headRy * 0.7, 6, headRx * 1.2, [
    [0, light],
    [0.55, hair],
    [1, dark],
  ]);
  ctx.fill();
}
