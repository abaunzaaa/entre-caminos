import { z } from "zod";
import { JOURNEY_BACKGROUNDS, JOURNEY_STICKERS, JOURNEY_THEMES } from "../utils/journey-rules.js";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha válida.");

export const createPlanSchema = z.object({
  experienceId: z.string().uuid("Elige una experiencia del catálogo."),
  plannedAt: z.string().min(8, "Elige fecha y hora."),
});

export const updatePlanSchema = z.object({
  plannedAt: z.string().min(8, "Elige fecha y hora."),
});

export const themeSchema = z.object({
  theme: z.enum(JOURNEY_THEMES),
});

export const decorationSchema = z.object({
  kind: z.enum(["sticker", "note"]),
  stickerKey: z.enum(JOURNEY_STICKERS).nullable().optional(),
  text: z.string().max(280).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  day: day.nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
});

export const decorationPatchSchema = decorationSchema.partial();

export const memorySchema = z.object({
  title: z.string().trim().min(2, "Escribe un título.").max(120),
  happenedOn: day,
  story: z.string().max(4000).optional(),
  background: z.enum(JOURNEY_BACKGROUNDS).optional(),
  experienceId: z.string().uuid().nullable().optional(),
  planId: z.string().uuid().nullable().optional(),
  attended: z.boolean().optional(),
});

export const stickerSchema = z.object({
  stickerKey: z.enum(JOURNEY_STICKERS),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
});
