import { z } from "zod";
import { CATEGORY_ICON_IDS, type CategoryIconId } from "../config/category-icons.js";

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
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const categoryUpdateSchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);
