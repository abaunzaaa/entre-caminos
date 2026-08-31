import { z } from "zod";
import { passwordSchema } from "./auth.validator.js";
import { ROLES } from "../config/constants.js";

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: passwordSchema,
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN]).default(ROLES.ADMIN),
});

export const updateAdminSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN]).optional(),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1),
});

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]+$/, "Usa un identificador en MAYÚSCULAS (ej. EDITOR)"),
});

export const createPermissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z]+(\.[a-z_]+)+$/, "Usa el formato recurso.accion (ej. reports.view)"),
});
