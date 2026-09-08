import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { COOKIE_NAMES, PASSWORD_RESET_GENERIC_MESSAGE, type RoleName } from "../config/constants.js";
import { ACCOUNT_REMOVED_MESSAGE, isAccountRemoved } from "../utils/account.js";
import * as authService from "../services/auth.service.js";
import { clearAuthCookies, setAuthCookies } from "../services/token.service.js";
import { isAuthRevoked } from "../utils/auth-cache.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import { ApiError } from "../utils/api-error.js";
import { publicUser } from "../utils/serializers.js";

export async function register(req: Request, res: Response) {
  const { user, verificationEmailSent } = await authService.registerUser(req.body);
  const tokens = setAuthCookies(res, {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
  });

  return res.status(201).json({
    success: true,
    message: "Cuenta creada correctamente",
    data: {
      user,
      accessToken: tokens.accessToken,
      verificationEmailSent,
    },
  });
}

export async function login(req: Request, res: Response) {
  const user = await authService.loginUser(req.body);
  const tokens = setAuthCookies(res, {
    id: user.id,
    email: user.email,
    role: user.role as RoleName,
  });

  return res.json({
    success: true,
    message: "Sesión iniciada",
    data: { user, accessToken: tokens.accessToken },
  });
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookies(res);
  return res.json({ success: true, message: "Sesión cerrada" });
}

export async function me(req: Request, res: Response) {
  const profile = await authService.getProfile(req.user!.id);
  return res.json({ success: true, data: { user: profile } });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAMES.REFRESH] as string | undefined;
  if (!token) {
    throw ApiError.unauthorized("Refresh token requerido");
  }

  const payload = verifyRefreshToken(token);
  if (payload.type !== "refresh") {
    throw ApiError.unauthorized("Sesión inválida");
  }

  if (isAuthRevoked(payload.sub, payload.iat)) {
    throw ApiError.unauthorized(ACCOUNT_REMOVED_MESSAGE);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.unauthorized(ACCOUNT_REMOVED_MESSAGE);
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.unauthorized("Sesión inválida");
  }

  const serialized = publicUser(user);
  const tokens = setAuthCookies(res, {
    id: serialized.id,
    email: serialized.email,
    role: serialized.role as RoleName,
  });

  return res.json({
    success: true,
    data: { user: serialized, accessToken: tokens.accessToken },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.requestPasswordReset(req.body.email);
  return res.json({
    success: true,
    message: PASSWORD_RESET_GENERIC_MESSAGE,
    data: result,
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.password);
  return res.json({
    success: true,
    message: "Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.",
  });
}

export async function verifyEmail(req: Request, res: Response) {
  await authService.verifyEmail(req.body.token);
  return res.json({ success: true, message: "Correo verificado" });
}
