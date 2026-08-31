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

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Token inválido"),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, "Token inválido"),
});
