import { z } from "zod";
import { CATEGORY_ICON_IDS, type CategoryIconId } from "../config/category-icons.js";

const categoryStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const categorySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || value === "" || CATEGORY_ICON_IDS.includes(value as CategoryIconId),
      { message: "Icono no válido" },
    ),
});

export const categoryUpdateSchema = categorySchema
  .partial()
  .extend({
    status: categoryStatus.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const categoryRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Debes ingresar un motivo para rechazar la categoría.")
    .max(500),
});
