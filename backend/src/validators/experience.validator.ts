import { z } from "zod";
import { MIN_EXPERIENCE_IMAGES, MIN_EXPERIENCE_IMAGES_MESSAGE } from "../config/constants.js";

const experienceStatus = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED", "REJECTED"]);

const imageUrlValue = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("/uploads/") ||
      /^https?:\/\//i.test(value),
    "URL de imagen inválida",
  );

function countExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = Array.isArray(input.imageUrls)
    ? input.imageUrls.map((url) => url.trim()).filter(Boolean)
    : [];
  if (listed.length) {
    return listed.length;
  }
  const single = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  return single ? 1 : 0;
}

function requireMinExperienceImages(
  data: { imageUrl?: string | null; imageUrls?: string[] | null },
  ctx: z.RefinementCtx,
) {
  if (countExperienceImages(data) < MIN_EXPERIENCE_IMAGES) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imageUrls"],
      message: MIN_EXPERIENCE_IMAGES_MESSAGE,
    });
  }
}

function emptyToNull(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isValidExperienceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

const availabilitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EVERY_DAY") }),
  z.object({
    type: z.literal("WEEKDAYS"),
    days: z.array(z.enum(weekdays)).min(1, "Selecciona al menos un día"),
  }),
  z.object({
    type: z.literal("DATES"),
    dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")).min(1, "Agrega al menos una fecha"),
  }),
]);

const experienceFields = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
  description: z.string().trim().min(20, "La descripción debe tener al menos 20 caracteres"),
  categoryId: z.string().uuid("Categoría inválida"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  location: z.string().trim().min(2, "La ubicación es obligatoria").max(160),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  externalUrl: z.preprocess(
    emptyToNull,
    z
      .union([
        z
          .string()
          .trim()
          .max(500, "El enlace es demasiado largo")
          .transform(normalizeExternalUrl)
          .refine(isValidExperienceUrl, "Ingresa un enlace válido"),
        z.null(),
      ])
      .optional(),
  ),
  duration: z.preprocess(
    emptyToNull,
    z.string().trim().max(80, "La duración es demasiado larga").nullable().optional(),
  ),
  durationValue: z.preprocess(
    emptyToNull,
    z.union([
      z.coerce.number().int().min(1, "La duración debe ser un número positivo").max(999, "La duración es demasiado larga"),
      z.null(),
    ]).optional(),
  ),
  durationUnit: z.enum(["MINUTES", "HOURS", "DAYS"]).nullable().optional(),
  availability: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    availabilitySchema.nullable().optional(),
  ),
  howToGetThere: z.preprocess(
    emptyToNull,
    z.string().trim().max(2000, "Las indicaciones son demasiado largas").nullable().optional(),
  ),
  imageUrl: imageUrlValue.optional().nullable(),
  imageUrls: z.array(imageUrlValue).max(12).optional(),
  status: experienceStatus.optional(),
});

export const experienceSchema = experienceFields.superRefine((data, ctx) => {
  requireMinExperienceImages(data, ctx);
  if (data.durationValue != null && !data.durationUnit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["durationUnit"],
      message: "Selecciona la unidad de duración",
    });
  }
  if (data.durationUnit && data.durationValue == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["durationValue"],
      message: "Ingresa la duración en números",
    });
  }
});

export const experienceUpdateSchema = experienceFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  })
  .superRefine((data, ctx) => {
    if (data.durationValue != null && !data.durationUnit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationUnit"],
        message: "Selecciona la unidad de duración",
      });
    }
    if (data.durationUnit && data.durationValue == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationValue"],
        message: "Ingresa la duración en números",
      });
    }
    if (data.imageUrl === undefined && data.imageUrls === undefined) {
      return;
    }
    requireMinExperienceImages(data, ctx);
  });

export const experienceStatusSchema = z.object({
  status: experienceStatus,
});

export const experienceRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, "Describe el motivo del rechazo")
    .max(500, "El motivo es demasiado largo"),
});
