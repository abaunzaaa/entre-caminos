import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import type { AuthUser } from "../models/auth-user.js";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  const cookieToken = req.cookies?.[COOKIE_NAMES.ACCESS];
  return typeof cookieToken === "string" ? cookieToken : null;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw ApiError.unauthorized("Token de acceso requerido");
    }

    const payload = verifyAccessToken(token);
    if (payload.type !== "access") {
      throw ApiError.unauthorized("Token inválido");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw ApiError.unauthorized("Sesión inválida o usuario inactivo");
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.name),
    };

    req.user = authUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized("Token inválido o expirado"));
  }
}
