import { z } from "zod";
import { PASSWORD_POLICY } from "../config/constants.js";

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_POLICY)
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un símbolo");

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: "El nombre es obligatorio" })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre es demasiado largo"),
    email: z
      .string({ required_error: "El correo es obligatorio" })
      .trim()
      .email("Correo electrónico inválido")
      .toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirma tu contraseña" }).min(1, "Confirma tu contraseña"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "Debes aceptar los términos y condiciones" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").toLowerCase(),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "El enlace de recuperación no es válido"),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirma tu contraseña" }).min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").toLowerCase(),
  code: z
    .string({ required_error: "El código es obligatorio" })
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido").toLowerCase(),
});

const optionalProfileText = (max: number, tooLong: string) =>
  z
    .string()
    .max(max, tooLong)
    .nullish()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    });

export function isValidColombianPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  const national = compact.startsWith("+57") ? compact.slice(3) : compact;
  return /^3\d{9}$/.test(national) || /^60\d{8}$/.test(national);
}

export const updateProfileSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre es demasiado largo"),
  phone: optionalProfileText(20, "El teléfono es demasiado largo").refine(
    (value) => value === undefined || value === null || isValidColombianPhone(value),
    "Ingresa un teléfono colombiano válido. Ejemplo: 300 123 4567",
  ),
  country: optionalProfileText(80, "El país es demasiado largo"),
  department: optionalProfileText(80, "El departamento es demasiado largo"),
  city: optionalProfileText(80, "La ciudad es demasiado larga"),
  address: optionalProfileText(160, "La dirección es demasiado larga"),
  avatarUrl: z
    .string()
    .max(700000, "La foto de perfil es demasiado pesada")
    .nullish()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine((value) => {
      if (value === undefined || value === null) {
        return true;
      }
      if (value.startsWith("data:image/jpeg;base64,")) {
        return true;
      }
      if (value.startsWith("data:image/jpg;base64,")) {
        return true;
      }
      if (value.startsWith("data:image/png;base64,")) {
        return true;
      }
      if (value.startsWith("data:image/webp;base64,")) {
        return true;
      }
      return /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/.test(value) || /^https:\/\//i.test(value);
    }, "La foto de perfil no es válida"),
});
