import { prisma } from "../database/prisma.js";
import {
  EMAIL_INACTIVE_LOGIN_MESSAGE,
  EMAIL_UNVERIFIED_LOGIN_MESSAGE,
  EMAIL_VERIFICATION_TTL_LABEL,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_LABEL,
  PASSWORD_RESET_TTL_MS,
  ROLES,
} from "../config/constants.js";
import { env } from "../config/env.js";
import { archivedAccountEmail, isAccountRemoved } from "../utils/account.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";
import { clearAuthUserCache, getCachedProfile, revokeAuthUser } from "../utils/auth-cache.js";
import { getOnboardingProfile } from "./onboarding.service.js";
import { recordAudit } from "./audit.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";
import { destroyStoredImage, persistUserAvatar, removeUserAvatarFiles } from "./upload.service.js";
import { createRawToken, hashToken } from "./token.service.js";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger.js";
import crypto from "node:crypto";

const userInclude = { role: true } as const;
const DUPLICATE_EMAIL = "Ya existe una cuenta asociada a este correo electrónico.";

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (existing && (!isAccountRemoved(existing) || existing.role.name !== ROLES.USER)) {
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
    user = await prisma.$transaction(async (tx) => {
      if (existing?.deletedAt) {
        await tx.user.update({
          where: { id: existing.id },
          data: { email: archivedAccountEmail(existing.id) },
        });
      }
      return tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          roleId: userRole.id,
          status: "ACTIVE",
          emailVerified: false,
          verificationCode: hash,
          verificationCodeExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
          profile: { create: {} },
        },
        include: userInclude,
      });
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

  if (!user || isAccountRemoved(user)) {
    throw ApiError.unauthorized("Credenciales incorrectas");
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden(EMAIL_INACTIVE_LOGIN_MESSAGE);
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
  const onboarding = await getOnboardingProfile(userId);
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
      mustChangePassword: Boolean(cached.mustChangePassword),
      profile: onboarding,
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
      mustChangePassword: true,
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
    profile: onboarding,
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
  if (!sent && env.NODE_ENV === "production") {
    throw new ApiError(500, "No pudimos enviar el correo. Inténtalo de nuevo.", "EMAIL_UNAVAILABLE");
  }

  if (!sent && env.NODE_ENV !== "production") {
    // Development-only: email provider unavailable. Keep the URL in server logs, never in the API/UI.
    logger.info("SendGrid no envió el correo. Enlace de recuperación (solo desarrollo)", { resetUrl });
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
      data: { passwordHash, mustChangePassword: false },
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

export async function changePassword(
  userId: string,
  input: { currentPassword?: string; password: string },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.unauthorized("Sesión inválida");
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden(EMAIL_INACTIVE_LOGIN_MESSAGE);
  }

  if (!user.mustChangePassword) {
    if (!input.currentPassword) {
      throw ApiError.badRequest("Ingresa tu contraseña actual.");
    }
    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw ApiError.badRequest("La contraseña actual no es correcta.");
    }
  } else if (input.currentPassword) {
    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw ApiError.badRequest("La contraseña actual no es correcta.");
    }
  }

  const sameAsCurrent = await verifyPassword(input.password, user.passwordHash);
  if (sameAsCurrent) {
    throw ApiError.badRequest("La nueva contraseña debe ser distinta a la actual.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(input.password),
      mustChangePassword: false,
    },
  });

  clearAuthUserCache(userId);

  await recordAudit({
    userId,
    action: "PASSWORD_CHANGE",
    entity: "User",
    entityId: userId,
  });

  return getProfile(userId);
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
    return getProfile(user.id);
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    },
  });

  clearAuthUserCache(user.id);

  await recordAudit({
    userId: user.id,
    action: "EMAIL_VERIFIED",
    entity: "User",
    entityId: user.id,
  });

  return getProfile(user.id);
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

export async function deleteMyAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  if (!user || isAccountRemoved(user)) {
    throw ApiError.unauthorized("Sesión inválida");
  }

  if (user.role.name !== ROLES.USER) {
    throw ApiError.forbidden("Solo una cuenta de turista puede eliminarse desde el perfil.");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { profileImagePublicId: true },
  });
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));

  await prisma.$transaction([
    prisma.experienceFavorite.deleteMany({ where: { userId } }),
    prisma.favoriteCollection.deleteMany({ where: { userId } }),
    prisma.experienceVisitorReview.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.conversation.deleteMany({ where: { userId } }),
    prisma.folder.deleteMany({ where: { userId } }),
    prisma.oAuthAccount.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.userProfile.deleteMany({ where: { userId } }),
    prisma.organizationProfile.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: archivedAccountEmail(userId),
        name: "Cuenta eliminada",
        passwordHash,
        phone: null,
        country: null,
        department: null,
        city: null,
        address: null,
        avatarUrl: null,
        verificationCode: null,
        verificationCodeExpires: null,
      },
    }),
  ]);

  revokeAuthUser(userId);
  clearAuthUserCache(userId);

  try {
    await destroyStoredImage(profile?.profileImagePublicId);
    await removeUserAvatarFiles(userId);
  } catch (error) {
    logger.error("No se pudieron retirar los archivos de la cuenta eliminada", {
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await recordAudit({
      userId,
      action: "ACCOUNT_DELETE",
      entity: "User",
      entityId: userId,
    });
  } catch (error) {
    logger.error("No se pudo guardar la bitácora de eliminación", {
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
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
