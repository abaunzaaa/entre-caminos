import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ACCOUNT_REMOVED_MESSAGE, isAccountRemoved } from "../utils/account.js";
import { ApiError } from "../utils/api-error.js";
import { isAuthRevoked, setCachedAuthUser } from "../utils/auth-cache.js";
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

    if (isAuthRevoked(payload.sub, payload.iat)) {
      throw ApiError.unauthorized(ACCOUNT_REMOVED_MESSAGE);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        deletedAt: true,
        emailVerified: true,
        createdAt: true,
        phone: true,
        country: true,
        department: true,
        city: true,
        address: true,
        avatarUrl: true,
        role: {
          select: {
            name: true,
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!user || isAccountRemoved(user)) {
      throw ApiError.unauthorized(ACCOUNT_REMOVED_MESSAGE);
    }

    if (user.status !== "ACTIVE") {
      throw ApiError.unauthorized("Sesión inválida o usuario inactivo");
    }

    if (!user.emailVerified) {
      throw ApiError.unauthorized("Debes verificar tu correo antes de iniciar sesión.");
    }

    const permissions = user.role.permissions.map((item) => item.permission.name);
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions,
    };

    setCachedAuthUser(authUser, {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      role: user.role.name,
      createdAt: user.createdAt,
      phone: user.phone,
      country: user.country,
      department: user.department,
      city: user.city,
      address: user.address,
      avatarUrl: user.avatarUrl,
      permissions,
    });
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
