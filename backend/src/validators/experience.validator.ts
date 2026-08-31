import { z } from "zod";

const experienceStatus = z.enum(["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"]);

export const experienceSchema = z.object({
  title: z.string().trim().min(3, "El título es obligatorio").max(140),
  description: z.string().trim().min(20, "La descripción debe tener al menos 20 caracteres"),
  categoryId: z.string().uuid("Categoría inválida"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  location: z.string().trim().min(2, "La ubicación es obligatoria").max(160),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("/uploads/") ||
        /^https?:\/\//i.test(value),
      "URL de imagen inválida",
    )
    .optional()
    .nullable(),
  status: experienceStatus.optional(),
});

export const experienceUpdateSchema = experienceSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);

export const experienceStatusSchema = z.object({
  status: experienceStatus,
});
