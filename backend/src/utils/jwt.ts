import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "./api-error.js";

const verifyOptions = { clockTolerance: 10 } as const;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  type: "access";
  iat?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
  remember?: boolean;
  iat?: number;
};

export function signAccessToken(payload: { sub: string; email: string; role: string }): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(userId: string, remember = true): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId, type: "refresh", remember }, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, verifyOptions) as AccessTokenPayload;
    if (payload.type !== "access") {
      throw ApiError.unauthorized("Token inválido");
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized("Token inválido o expirado");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, verifyOptions) as RefreshTokenPayload;
    if (payload.type !== "refresh") {
      throw ApiError.unauthorized("Sesión inválida");
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized("Sesión inválida");
  }
}
