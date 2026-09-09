import { z } from "zod";
import {
  CONTACT_ALLY_TYPES,
  CONTACT_COMPANY_MAX,
  CONTACT_DISCOVER_REASONS,
  CONTACT_KINDS,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
} from "../config/constants.js";

const discoverReasons = new Set<string>(CONTACT_DISCOVER_REASONS);
const allyTypes = new Set<string>(CONTACT_ALLY_TYPES);

export const contactSchema = z
  .object({
    kind: z.enum([CONTACT_KINDS.POSIBLE_USUARIO, CONTACT_KINDS.ALIADO], {
      errorMap: () => ({ message: "Tipo de contacto no permitido" }),
    }),
    name: z
      .string({ required_error: "El nombre es obligatorio" })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(CONTACT_NAME_MAX, "El nombre es demasiado largo"),
    email: z
      .string({ required_error: "El correo es obligatorio" })
      .trim()
      .email("Correo electrónico inválido")
      .toLowerCase(),
    message: z
      .string({ required_error: "El comentario es obligatorio" })
      .trim()
      .min(1, "El comentario es obligatorio")
      .max(CONTACT_MESSAGE_MAX, "El comentario es demasiado largo"),
    reason: z.string().trim().max(120).optional(),
    company: z.string().trim().max(CONTACT_COMPANY_MAX).optional(),
    allyType: z.string().trim().max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === CONTACT_KINDS.POSIBLE_USUARIO && (!data.reason || !discoverReasons.has(data.reason))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Selecciona un motivo de contacto",
      });
    }

    if (data.kind === CONTACT_KINDS.ALIADO) {
      if (!data.company) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company"],
          message: "Ingresa el nombre de la empresa o experiencia",
        });
      }
      if (!data.allyType || !allyTypes.has(data.allyType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allyType"],
          message: "Selecciona el tipo de experiencia",
        });
      }
    }
  });

export type ContactInput = z.infer<typeof contactSchema>;
