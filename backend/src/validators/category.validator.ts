import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const categoryUpdateSchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);
