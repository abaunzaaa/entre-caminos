import type { Request, Response } from "express";
import { prisma } from "../database/prisma.js";
import { COOKIE_NAMES, PASSWORD_RESET_GENERIC_MESSAGE, type RoleName } from "../config/constants.js";
import { env } from "../config/env.js";
import { ACCOUNT_REMOVED_MESSAGE, isAccountRemoved } from "../utils/account.js";
import * as authService from "../services/auth.service.js";
import { clearAuthCookies, setAuthCookies } from "../services/token.service.js";
import {
  buildAuthorizationUrl,
  exchangeOAuthCode,
  isOAuthConfigured,
  loginOrRegisterOAuth,
  parseAppleUserName,
  readOAuthState,
  signOAuthState,
  type OAuthProviderSlug,
} from "../services/oauth.service.js";
import { isAuthRevoked } from "../utils/auth-cache.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import { ApiError } from "../utils/api-error.js";
import { publicUser } from "../utils/serializers.js";

export async function register(req: Request, res: Response) {
  const { user, verificationEmailSent, devCode } = await authService.registerUser(req.body);

  return res.status(201).json({
    success: true,
    message: "Cuenta creada correctamente",
    data: {
      user,
      verificationEmailSent,
      ...(devCode ? { devCode } : {}),
    },
  });
}

export async function login(req: Request, res: Response) {
  const user = await authService.loginUser(req.body);
  const remember = Boolean(req.body.remember);
  const tokens = setAuthCookies(
    res,
    {
      id: user.id,
      email: user.email,
      role: user.role as RoleName,
    },
    { remember },
  );

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

  if (!user.emailVerified) {
    clearAuthCookies(res);
    throw ApiError.unauthorized("Debes verificar tu correo antes de iniciar sesión.");
  }

  const serialized = publicUser(user);
  const remember = payload.remember !== false;
  const tokens = setAuthCookies(
    res,
    {
      id: serialized.id,
      email: serialized.email,
      role: serialized.role as RoleName,
    },
    { remember },
  );

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
  const user = await authService.verifyEmail(req.body.email, req.body.code);
  const tokens = setAuthCookies(
    res,
    {
      id: user.id,
      email: user.email,
      role: user.role as RoleName,
    },
    { remember: true },
  );

  return res.json({
    success: true,
    message: "Correo verificado. Continúa con tu perfil.",
    data: { user, accessToken: tokens.accessToken },
  });
}

export async function resendVerificationCode(req: Request, res: Response) {
  const result = await authService.resendVerificationCode(req.body.email);
  return res.json({
    success: true,
    message: "Si el correo está registrado, enviaremos un nuevo código.",
    data: result,
  });
}

function oauthFrontendRedirect(path: string, params?: Record<string, string>) {
  const url = new URL(path, env.FRONTEND_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function oauthStart(req: Request, res: Response) {
  const provider = req.params.provider as OAuthProviderSlug;
  if (!["google", "apple", "microsoft"].includes(provider)) {
    return res.redirect(oauthFrontendRedirect("/login", { oauthError: "Proveedor no válido." }));
  }
  if (!isOAuthConfigured(provider)) {
    return res.redirect(
      oauthFrontendRedirect("/login", {
        oauthError: "Este inicio de sesión no está configurado todavía.",
      }),
    );
  }
  const remember = req.query.remember === "1" || req.query.remember === "true";
  const state = signOAuthState(remember);
  return res.redirect(buildAuthorizationUrl(provider, state));
}

export async function oauthCallback(req: Request, res: Response) {
  const provider = req.params.provider as OAuthProviderSlug;
  if (!["google", "apple", "microsoft"].includes(provider)) {
    return res.redirect(oauthFrontendRedirect("/login", { oauthError: "Proveedor no válido." }));
  }

  const code = String(req.body?.code ?? req.query.code ?? "");
  const state = String(req.body?.state ?? req.query.state ?? "");
  const oauthError = String(req.body?.error ?? req.query.error ?? "");
  if (oauthError || !code) {
    return res.redirect(
      oauthFrontendRedirect("/login", {
        oauthError: "No pudimos completar el inicio de sesión.",
      }),
    );
  }

  try {
    const { remember } = readOAuthState(state);
    const appleName = parseAppleUserName(req.body?.user);
    const profile = await exchangeOAuthCode(provider, code, appleName);
    const result = await loginOrRegisterOAuth(profile);
    setAuthCookies(
      res,
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role as RoleName,
      },
      { remember },
    );
    return res.redirect(
      oauthFrontendRedirect("/auth/callback", {
        remember: remember ? "1" : "0",
        next: result.created ? "onboarding" : "app",
      }),
    );
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "No pudimos completar el inicio de sesión.";
    return res.redirect(oauthFrontendRedirect("/login", { oauthError: message }));
  }
}
