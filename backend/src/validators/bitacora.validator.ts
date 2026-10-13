import { z } from "zod";

export const BITACORA_PAPERS = ["cream", "warm", "beige", "sage", "texture", "lined", "grid"] as const;
export const BITACORA_FONTS = ["playfair", "inter", "cormorant", "vibes", "allura", "caveat", "special", "nunito"] as const;
export const BITACORA_FRAMES = ["none", "polaroid", "wide", "cream"] as const;

const stickerId = z.string().regex(/^(viaje|papel|line|pastel)-[a-z0-9-]{1,40}$/, "Ese sticker no está disponible.");

const box = {
  id: z.string().uuid(),
  x: z.number().min(-0.3).max(1.2),
  y: z.number().min(-0.3).max(1.2),
  w: z.number().min(0.04).max(1.35),
  h: z.number().min(0.04).max(1.35),
  rotation: z.number().min(-360).max(360),
  z: z.number().int().min(0).max(500),
};

const photoElement = z.object({
  ...box,
  type: z.literal("photo"),
  props: z.object({
    assetId: z.string().uuid().nullable(),
    url: z.string().max(600),
    frame: z.enum(BITACORA_FRAMES),
    caption: z.string().max(80),
    cropX: z.number().min(-80).max(80),
    cropY: z.number().min(-80).max(80),
    cropScale: z.number().min(1).max(3),
  }),
});

const textElement = z.object({
  ...box,
  type: z.literal("text"),
  props: z.object({
    text: z.string().max(800),
    font: z.enum(BITACORA_FONTS),
    size: z.number().min(0.02).max(0.18),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]),
    italic: z.boolean(),
    align: z.enum(["left", "center", "right"]),
    lineHeight: z.number().min(0.9).max(2.2),
  }),
});

const stickerElement = z.object({
  ...box,
  type: z.literal("sticker"),
  props: z.object({
    stickerId,
  }),
});

export const bitacoraElementSchema = z.discriminatedUnion("type", [photoElement, textElement, stickerElement]);

export const saveBitacoraSchema = z.object({
  pages: z
    .array(
      z.object({
        id: z.string().uuid(),
        background: z.enum(BITACORA_PAPERS),
        experienceId: z.string().uuid().nullable(),
        elements: z.array(bitacoraElementSchema).max(50),
      }),
    )
    .max(40),
});

export type SaveBitacoraInput = z.infer<typeof saveBitacoraSchema>;
