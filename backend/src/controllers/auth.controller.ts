import type { Request, Response } from "express";
import { COOKIE_NAMES, type RoleName } from "../config/constants.js";
import * as authService from "../services/auth.service.js";
import { clearAuthCookies, setAuthCookies } from "../services/token.service.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import { prisma } from "../database/prisma.js";
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
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  });

  if (!user || user.status !== "ACTIVE") {
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
    message: "Si el correo existe, enviaremos instrucciones de recuperación.",
    data: result,
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.password);
  return res.json({ success: true, message: "Contraseña actualizada. Ya puedes iniciar sesión." });
}

export async function verifyEmail(req: Request, res: Response) {
  await authService.verifyEmail(req.body.token);
  return res.json({ success: true, message: "Correo verificado" });
}
