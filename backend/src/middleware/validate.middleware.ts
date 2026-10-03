import type { NextFunction, Request, Response } from "express";
import { ZodSchema, type ZodIssue } from "zod";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

const TECHNICAL_VALIDATION = /invalid|expected|required|received|unrecognized|discriminator/i;

export function toPublicValidationDetails(issues: ZodIssue[], source = "body") {
  return issues.map((issue) => {
    const field = issue.path.map(String).join(".") || source;
    return { field, message: publicValidationMessage(field, issue.message) };
  });
}

function publicValidationMessage(field: string, message: string) {
  if (/[áéíóúñ¿¡]/i.test(message) || !TECHNICAL_VALIDATION.test(message)) {
    return message;
  }
  if (field.startsWith("companyContact")) {
    return "Ingresa el contacto de la empresa.";
  }
  if (field.startsWith("availability")) {
    return "Revisa la disponibilidad seleccionada.";
  }
  if (field === "location" || field.startsWith("latitude") || field.startsWith("longitude")) {
    return "Agrega una ubicación válida.";
  }
  if (field.startsWith("externalUrl")) {
    return "Ingresa un enlace válido.";
  }
  if (field === "history" || /must contain at most|too big/i.test(message)) {
    return "Hubo un problema al procesar tu mensaje. Inténtalo nuevamente.";
  }
  return "Revisa los datos del formulario.";
}

export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      logger.warn("Validación rechazada", {
        source,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      const details = toPublicValidationDetails(result.error.issues, source);
      const message = details[0]?.message ?? "Revisa los datos del formulario.";

      return next(ApiError.unprocessable(message, details));
    }

    req[source] = result.data as never;
    return next();
  };
