import crypto from "node:crypto";
import type { CookieOptions, Response } from "express";
import { COOKIE_NAMES } from "../config/constants.js";
import { env, isProduction } from "../config/env.js";
import { durationToMs } from "../utils/duration.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import type { RoleName } from "../config/constants.js";

const ACCESS_MAX_AGE_MS = durationToMs(env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000);
const REFRESH_MAX_AGE_MS = durationToMs(env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);

const cookieBase: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE || isProduction,
  path: "/",
};

export function setAuthCookies(
  res: Response,
  user: { id: string; email: string; role: RoleName },
  options?: { remember?: boolean },
) {
  const remember = options?.remember !== false;
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id, remember);

  res.cookie(COOKIE_NAMES.ACCESS, accessToken, {
    ...cookieBase,
    ...(remember ? { maxAge: ACCESS_MAX_AGE_MS } : {}),
  });
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, {
    ...cookieBase,
    ...(remember ? { maxAge: REFRESH_MAX_AGE_MS } : {}),
  });

  return { accessToken, refreshToken };
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS, cookieBase);
  res.clearCookie(COOKIE_NAMES.REFRESH, cookieBase);
}

export function createRawToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
