import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";
import { toPublicValidationDetails } from "./validate.middleware.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    const details = toPublicValidationDetails(err.issues);
    return res.status(422).json({
      success: false,
      error: {
        code: "UNPROCESSABLE_ENTITY",
        message: details[0]?.message ?? "Revisa los datos del formulario.",
        details,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Ya existe una cuenta asociada a este correo electrónico.",
        },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Recurso no encontrado" },
      });
    }
    if (err.code === "P2028") {
      logger.error("Unhandled error", { code: err.code });
      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "No pudimos guardar los cambios a tiempo. Inténtalo de nuevo.",
        },
      });
    }
    if (err.code === "P2000" || err.code === "P2003" || err.code === "P2011" || err.code === "P2021" || err.code === "P2022") {
      logger.error("Unhandled error", { code: err.code });
      return res.status(422).json({
        success: false,
        error: {
          code: "UNPROCESSABLE_ENTITY",
          message: "Revisa los datos de la experiencia.",
        },
      });
    }
    logger.error("Unhandled error", { code: err.code });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error("Unhandled error", { name: err.name });
    return res.status(422).json({
      success: false,
      error: {
        code: "UNPROCESSABLE_ENTITY",
        message: "Revisa los datos de la experiencia.",
      },
    });
  }

  logger.error("Unhandled error", {
    name: err instanceof Error ? err.name : "unknown",
  });

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "No pudimos completar la solicitud. Inténtalo de nuevo.",
    },
  });
}
