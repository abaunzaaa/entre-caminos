import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AuthProvider } from "@prisma/client";
import { env } from "../config/env.js";
import { EMAIL_INACTIVE_LOGIN_MESSAGE, ROLES } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import { ACCOUNT_REMOVED_MESSAGE, isAccountRemoved } from "../utils/account.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";
import { recordAudit } from "./audit.service.js";
import { logger } from "../utils/logger.js";

export type OAuthProviderSlug = "google";

type OAuthState = {
  remember: boolean;
  type: "oauth_state";
};

type OAuthProfile = {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
};

function oauthRedirectBase() {
  return (env.OAUTH_REDIRECT_BASE || env.FRONTEND_URL).replace(/\/$/, "");
}

export function oauthCallbackUrl(provider: OAuthProviderSlug = "google") {
  return `${oauthRedirectBase()}/api/auth/${provider}/callback`;
}

export function isOAuthConfigured(provider: OAuthProviderSlug = "google") {
  return provider === "google" && Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function signOAuthState(remember: boolean) {
  return jwt.sign({ remember, type: "oauth_state" } satisfies OAuthState, env.JWT_ACCESS_SECRET, {
    expiresIn: "10m",
  });
}

export function readOAuthState(state: string | undefined) {
  if (!state) {
    throw ApiError.unauthorized("Sesión de autenticación inválida");
  }
  try {
    const payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as OAuthState;
    if (payload.type !== "oauth_state") {
      throw ApiError.unauthorized("Sesión de autenticación inválida");
    }
    return { remember: Boolean(payload.remember) };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized("Sesión de autenticación inválida");
  }
}

export function buildAuthorizationUrl(_provider: OAuthProviderSlug, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", oauthCallbackUrl("google"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeGoogle(code: string): Promise<OAuthProfile> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: oauthCallbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });
  const payload = (await response.json()) as { access_token?: string; id_token?: string };
  if (!response.ok || !payload.access_token) {
    throw ApiError.unauthorized("No pudimos validar la cuenta de Google.");
  }
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${payload.access_token}` },
  });
  const profile = (await profileResponse.json()) as { sub?: string; email?: string; name?: string };
  if (!profileResponse.ok || !profile.sub || !profile.email) {
    throw ApiError.unauthorized("Google no devolvió un correo válido.");
  }
  return {
    provider: "GOOGLE",
    providerAccountId: profile.sub,
    email: profile.email.trim().toLowerCase(),
    name: (profile.name || profile.email.split("@")[0]).trim(),
  };
}

export async function exchangeOAuthCode(_provider: OAuthProviderSlug, code: string) {
  return exchangeGoogle(code);
}

export async function loginOrRegisterOAuth(profile: OAuthProfile) {
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: { include: { role: true } } },
  });

  if (existingLink) {
    if (isAccountRemoved(existingLink.user) || existingLink.user.status !== "ACTIVE") {
      throw ApiError.forbidden(
        existingLink.user.status !== "ACTIVE"
          ? EMAIL_INACTIVE_LOGIN_MESSAGE
          : ACCOUNT_REMOVED_MESSAGE,
      );
    }
    if (!existingLink.user.emailVerified) {
      await prisma.user.update({
        where: { id: existingLink.user.id },
        data: { emailVerified: true, verificationCode: null, verificationCodeExpires: null },
      });
    }
    await recordAudit({
      userId: existingLink.user.id,
      action: "LOGIN",
      entity: "User",
      entityId: existingLink.user.id,
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: existingLink.user.id },
      include: { role: true },
    });
    return { user: publicUser(user), created: false };
  }

  const email = profile.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (existingUser) {
    if (isAccountRemoved(existingUser) || existingUser.status !== "ACTIVE") {
      throw ApiError.forbidden(
        existingUser.status !== "ACTIVE"
          ? EMAIL_INACTIVE_LOGIN_MESSAGE
          : ACCOUNT_REMOVED_MESSAGE,
      );
    }
    await prisma.oAuthAccount.create({
      data: {
        userId: existingUser.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    });
    if (!existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true, verificationCode: null, verificationCodeExpires: null },
      });
    }
    await recordAudit({
      userId: existingUser.id,
      action: "LOGIN",
      entity: "User",
      entityId: existingUser.id,
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: existingUser.id },
      include: { role: true },
    });
    return { user: publicUser(user), created: false };
  }

  const userRole = await prisma.role.findUnique({ where: { name: ROLES.USER } });
  if (!userRole) {
    throw new ApiError(500, "El registro no está disponible en este momento.", "INTERNAL_ERROR");
  }

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const created = await prisma.user.create({
    data: {
      name: profile.name.slice(0, 80) || email.split("@")[0],
      email,
      passwordHash,
      roleId: userRole.id,
      status: "ACTIVE",
      emailVerified: true,
      oauthAccounts: {
        create: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
    },
    include: { role: true },
  });

  await recordAudit({
    userId: created.id,
    action: "REGISTER",
    entity: "User",
    entityId: created.id,
  });

  logger.info("Usuario creado con proveedor externo", { provider: profile.provider, userId: created.id });
  return { user: publicUser(created), created: true };
}
