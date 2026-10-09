export type PaperId = "cream" | "warm" | "beige" | "sage" | "texture" | "lined" | "grid";
export type FrameId = "none" | "polaroid" | "wide" | "cream";
export type FontId = "playfair" | "inter" | "cormorant" | "vibes" | "allura" | "caveat" | "special" | "nunito";
export type TextAlign = "left" | "center" | "right";
export type TextWeight = 400 | 500 | 600 | 700;
export type ToolId = "photos" | "stickers" | "text" | "papers" | "elements" | "pages";
export type TemplateId = "blank" | "hero" | "collage" | "polaroids" | "note" | "diary";

export type PhotoProps = {
  assetId: string | null;
  url: string;
  frame: FrameId;
  caption: string;
  cropX: number;
  cropY: number;
  cropScale: number;
};

export type TextProps = {
  text: string;
  font: FontId;
  size: number;
  color: string;
  weight: TextWeight;
  italic: boolean;
  align: TextAlign;
  lineHeight: number;
};

export type StickerProps = {
  stickerId: string;
};

type Box = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
};

export type PhotoElement = Box & { type: "photo"; props: PhotoProps };
export type TextElement = Box & { type: "text"; props: TextProps };
export type StickerElement = Box & { type: "sticker"; props: StickerProps };
export type BitElement = PhotoElement | TextElement | StickerElement;

export type PageDoc = {
  id: string;
  background: PaperId;
  experienceId: string | null;
  elements: BitElement[];
};

export type BitacoraAsset = { id: string; url: string };

export type BitacoraBundle = {
  bitacora: { id: string; updatedAt: string };
  pages: PageDoc[];
  assets: BitacoraAsset[];
};

export const PAGE_ASPECT = 0.72;

export const PAPERS: Array<{ id: PaperId; label: string }> = [
  { id: "cream", label: "Crema clásico" },
  { id: "warm", label: "Blanco cálido" },
  { id: "beige", label: "Beige" },
  { id: "sage", label: "Verde suave" },
  { id: "texture", label: "Textura" },
  { id: "lined", label: "Líneas" },
  { id: "grid", label: "Cuadrícula" },
];

export const FONTS: Array<{ id: FontId; label: string; sample: string }> = [
  { id: "playfair", label: "Editorial", sample: "Playfair" },
  { id: "cormorant", label: "Serif", sample: "Cormorant" },
  { id: "inter", label: "Moderna", sample: "Inter" },
  { id: "nunito", label: "Cercana", sample: "Nunito" },
  { id: "vibes", label: "Manuscrita", sample: "Vibes" },
  { id: "allura", label: "Firma", sample: "Allura" },
  { id: "caveat", label: "Diario", sample: "Caveat" },
  { id: "special", label: "Máquina", sample: "Elite" },
];

export const TEXT_COLORS = ["#2c2824", "#3d4a38", "#6d5344", "#8d4b4b", "#1e3d36", "#8a7048", "#355c7d"];

export const TEMPLATES: Array<{ id: TemplateId; label: string; hint: string }> = [
  { id: "blank", label: "Página en blanco", hint: "Empieza desde cero" },
  { id: "hero", label: "Fotografía protagonista", hint: "Una imagen grande" },
  { id: "collage", label: "Collage de dos fotos", hint: "Dos recuerdos juntos" },
  { id: "polaroids", label: "Tres polaroids", hint: "Instantáneas sueltas" },
  { id: "note", label: "Fotografía con nota", hint: "Imagen y letra" },
  { id: "diary", label: "Diario de viaje", hint: "Título, nota y foto" },
];

export function uid() {
  return crypto.randomUUID();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function box(partial: Partial<Box> & Pick<Box, "x" | "y" | "w" | "h">): Box {
  return {
    id: partial.id ?? uid(),
    x: partial.x,
    y: partial.y,
    w: partial.w,
    h: partial.h,
    rotation: partial.rotation ?? 0,
    z: partial.z ?? 1,
  };
}

export function emptyPhoto(partial: Partial<Box> & Pick<Box, "x" | "y" | "w" | "h">, frame: FrameId = "polaroid"): PhotoElement {
  return {
    ...box(partial),
    type: "photo",
    props: { assetId: null, url: "", frame, caption: "", cropX: 0, cropY: 0, cropScale: 1 },
  };
}

export function makeText(
  partial: Partial<Box> & Pick<Box, "x" | "y" | "w" | "h">,
  props: Partial<TextProps> & Pick<TextProps, "text" | "font" | "size">,
): TextElement {
  return {
    ...box(partial),
    type: "text",
    props: {
      text: props.text,
      font: props.font,
      size: props.size,
      color: props.color ?? "#3d4a38",
      weight: props.weight ?? 500,
      italic: props.italic ?? false,
      align: props.align ?? "left",
      lineHeight: props.lineHeight ?? 1.25,
    },
  };
}

export function makeSticker(stickerId: string, x: number, y: number, z: number): StickerElement {
  return {
    ...box({ x, y, w: 0.28, h: 0.2, z, rotation: (z % 2 === 0 ? -6 : 5) }),
    type: "sticker",
    props: { stickerId },
  };
}

export function nextZ(elements: BitElement[]) {
  return elements.reduce((max, element) => Math.max(max, element.z), 0) + 1;
}

export function normalizeLayers(elements: BitElement[], id: string, direction: "front" | "back") {
  const ordered = [...elements].sort((a, b) => a.z - b.z);
  const index = ordered.findIndex((element) => element.id === id);
  if (index < 0) {
    return elements;
  }
  const swapWith = direction === "front" ? index + 1 : index - 1;
  if (swapWith < 0 || swapWith >= ordered.length) {
    return elements;
  }
  const copy = ordered.slice();
  const current = copy[index];
  copy[index] = copy[swapWith];
  copy[swapWith] = current;
  return copy.map((element, layer) => ({ ...element, z: layer + 1 }));
}
