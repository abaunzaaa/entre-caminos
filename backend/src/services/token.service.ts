import crypto from "node:crypto";
import type { Response } from "express";
import { COOKIE_NAMES } from "../config/constants.js";
import { env, isProduction } from "../config/env.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import type { RoleName } from "../config/constants.js";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.COOKIE_SECURE || isProduction,
  path: "/",
};

export function setAuthCookies(
  res: Response,
  user: { id: string; email: string; role: RoleName },
) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id);

  res.cookie(COOKIE_NAMES.ACCESS, accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(COOKIE_NAMES.REFRESH, refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS, { path: "/" });
  res.clearCookie(COOKIE_NAMES.REFRESH, { path: "/" });
}

export function createRawToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
