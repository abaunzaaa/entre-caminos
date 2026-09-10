import { prisma } from "../database/prisma.js";
import {
  EMAIL_UNVERIFIED_LOGIN_MESSAGE,
  EMAIL_VERIFICATION_TTL_LABEL,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_LABEL,
  PASSWORD_RESET_TTL_MS,
  ROLES,
} from "../config/constants.js";
import { env } from "../config/env.js";
import { ACCOUNT_REMOVED_MESSAGE, isAccountRemoved } from "../utils/account.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";
import { clearAuthUserCache, getCachedProfile } from "../utils/auth-cache.js";
import { recordAudit } from "./audit.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";
import { persistUserAvatar, removeUserAvatarFiles } from "./upload.service.js";
import { createRawToken, hashToken } from "./token.service.js";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger.js";
import crypto from "node:crypto";

const userInclude = { role: true } as const;
const DUPLICATE_EMAIL = "Ya existe una cuenta asociada a este correo electrónico.";

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict(DUPLICATE_EMAIL);
  }

  const userRole = await prisma.role.findUnique({ where: { name: ROLES.USER } });
  if (!userRole) {
    logger.error("El rol USER no existe en la base de datos");
    throw new ApiError(500, "El registro no está disponible en este momento.", "INTERNAL_ERROR");
  }

  const passwordHash = await hashPassword(input.password);
  const { code, hash } = createVerificationCode();

  let user: Prisma.UserGetPayload<{ include: typeof userInclude }> | undefined;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: userRole.id,
        status: "ACTIVE",
        emailVerified: false,
        verificationCode: hash,
        verificationCodeExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
      include: userInclude,
    });
  } catch (error) {
    if (user) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict(DUPLICATE_EMAIL);
    }
    logger.error("Fallo al crear usuario", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw new ApiError(500, "No pudimos crear tu cuenta. Inténtalo de nuevo.", "INTERNAL_ERROR");
  }

  let verificationEmailSent = false;
  try {
    verificationEmailSent = await sendVerificationEmail(
      user.email,
      code,
      EMAIL_VERIFICATION_TTL_LABEL,
    );
  } catch {
    logger.error("El correo de verificación no se envió", { userId: user.id });
  }

  if (!verificationEmailSent && env.NODE_ENV !== "production") {
    logger.info("Código de verificación (solo no-producción)", { code });
  }

  try {
    await recordAudit({
      userId: user.id,
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
    });
  } catch {
    logger.error("No se pudo guardar la bitácora de registro", { userId: user.id });
  }

  return {
    user: {
      ...publicUser(user),
      permissions: [] as string[],
    },
    verificationEmailSent,
    ...(env.NODE_ENV === "test" ? { devCode: code } : {}),
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    include: userInclude,
  });

  if (!user) {
    throw ApiError.unauthorized("Credenciales incorrectas");
  }

  if (isAccountRemoved(user)) {
    throw ApiError.forbidden(ACCOUNT_REMOVED_MESSAGE);
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden("Tu cuenta está inactiva. Contacta a soporte.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Credenciales incorrectas");
  }

  if (!user.emailVerified) {
    throw ApiError.forbidden(EMAIL_UNVERIFIED_LOGIN_MESSAGE);
  }

  await recordAudit({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  return getProfile(user.id);
}

export async function getProfile(userId: string) {
  const cached = getCachedProfile(userId);
  if (cached) {
    return {
      id: cached.id,
      name: cached.name,
      email: cached.email,
      emailVerified: cached.emailVerified,
      status: cached.status,
      role: cached.role,
      createdAt: cached.createdAt,
      permissions: cached.permissions,
      phone: cached.phone ?? null,
      country: cached.country ?? null,
      department: cached.department ?? null,
      city: cached.city ?? null,
      address: cached.address ?? null,
      avatarUrl: cached.avatarUrl ?? null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      status: true,
      deletedAt: true,
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
          permissions: { select: { permission: { select: { name: true } } } },
        },
      },
    },
  });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.notFound("Usuario no encontrado");
  }

  return {
    ...publicUser(user),
    permissions: user.role.permissions.map((item) => item.permission.name),
  };
}

export async function updateMyProfile(
  userId: string,
  input: {
    name: string;
    phone?: string | null;
    country?: string | null;
    department?: string | null;
    city?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
  },
) {
  const name = input.name.trim();
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true, avatarUrl: true },
  });

  if (!existing || isAccountRemoved(existing)) {
    throw ApiError.notFound("Usuario no encontrado");
  }

  let avatarUrl = existing.avatarUrl ?? null;
  if (input.avatarUrl !== undefined) {
    if (input.avatarUrl === null) {
      await removeUserAvatarFiles(userId);
      avatarUrl = null;
    } else {
      avatarUrl = await persistUserAvatar(userId, input.avatarUrl);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });

  clearAuthUserCache(userId);

  await recordAudit({
    userId,
    action: "PROFILE_UPDATE",
    entity: "User",
    entityId: userId,
  });

  return getProfile(userId);
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user || isAccountRemoved(user)) {
    return genericResetResult();
  }

  const { raw, hash } = createRawToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      },
    }),
  ]);

  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(raw)}`;

  const sent = await sendPasswordResetEmail(user.email, resetUrl, PASSWORD_RESET_TTL_LABEL);
  if (!sent && env.SENDGRID_API_KEY) {
    throw new ApiError(500, "No pudimos enviar el correo. Inténtalo de nuevo.", "EMAIL_UNAVAILABLE");
  }

  if (!sent && env.NODE_ENV !== "production") {
    logger.info("SendGrid no envió el correo. Enlace de recuperación (solo no-producción)", { resetUrl });
  }

  return genericResetResult(raw);
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    throw ApiError.badRequest("El enlace de recuperación no es válido.");
  }
  if (record.usedAt) {
    throw ApiError.badRequest("Este enlace ya fue utilizado. Solicita uno nuevo.");
  }
  if (record.expiresAt < new Date()) {
    throw ApiError.badRequest("El enlace de recuperación expiró. Solicita uno nuevo.");
  }

  const owner = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { deletedAt: true },
  });
  if (!owner || isAccountRemoved(owner)) {
    throw ApiError.badRequest("El enlace de recuperación no es válido.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await recordAudit({
    userId: record.userId,
    action: "PASSWORD_RESET",
    entity: "User",
    entityId: record.userId,
  });
}

function genericResetResult(rawToken?: string) {
  return {
    accepted: true as const,
    ...(env.NODE_ENV === "test" && rawToken ? { devToken: rawToken } : {}),
  };
}

export async function verifyEmail(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    include: userInclude,
  });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.notFound("No encontramos una cuenta con ese correo electrónico.");
  }

  if (user.emailVerified) {
    return {
      ...publicUser(user),
      permissions: [] as string[],
    };
  }

  if (!user.verificationCode || !user.verificationCodeExpires) {
    throw ApiError.badRequest("No hay un código de verificación pendiente. Solicita uno nuevo.");
  }

  if (user.verificationCodeExpires < new Date()) {
    throw ApiError.badRequest("El código de verificación expiró. Solicita uno nuevo.");
  }

  const incomingHash = hashToken(code.trim());
  if (!codesMatch(user.verificationCode, incomingHash)) {
    throw ApiError.badRequest("El código de verificación es incorrecto.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    },
    include: userInclude,
  });

  clearAuthUserCache(user.id);

  await recordAudit({
    userId: user.id,
    action: "EMAIL_VERIFIED",
    entity: "User",
    entityId: user.id,
  });

  return {
    ...publicUser(updated),
    permissions: [] as string[],
  };
}

export async function resendVerificationCode(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.notFound("No encontramos una cuenta con ese correo electrónico.");
  }

  if (user.emailVerified) {
    throw ApiError.badRequest("Este correo ya está verificado.");
  }

  const { code, hash } = createVerificationCode();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode: hash,
      verificationCodeExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  const sent = await sendVerificationEmail(user.email, code, EMAIL_VERIFICATION_TTL_LABEL);
  if (!sent && env.SENDGRID_API_KEY) {
    throw new ApiError(500, "No pudimos enviar el correo. Inténtalo de nuevo.", "EMAIL_UNAVAILABLE");
  }

  if (!sent && env.NODE_ENV !== "production") {
    logger.info("Código de verificación reenviado (solo no-producción)", { code });
  }

  return {
    accepted: true as const,
    ...(env.NODE_ENV === "test" ? { devCode: code } : {}),
  };
}

function createVerificationCode() {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return { code, hash: hashToken(code) };
}

function codesMatch(storedHash: string, incomingHash: string) {
  const stored = Buffer.from(storedHash);
  const incoming = Buffer.from(incomingHash);
  if (stored.length !== incoming.length) {
    return false;
  }
  return crypto.timingSafeEqual(stored, incoming);
}
