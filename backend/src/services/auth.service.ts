import { prisma } from "../database/prisma.js";
import { ROLES } from "../config/constants.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";
import { recordAudit } from "./audit.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";
import { createRawToken, hashToken } from "./token.service.js";
import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger.js";

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
  const { raw, hash } = createRawToken();

  let user: Awaited<ReturnType<typeof prisma.user.create>> | undefined;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: userRole.id,
        status: "ACTIVE",
      },
      include: userInclude,
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
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

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${raw}`;
  let verificationEmailSent = false;
  try {
    verificationEmailSent = await sendVerificationEmail(user.email, verifyUrl);
  } catch {
    logger.error("El correo de verificación no se envió", { userId: user.id });
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

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden("Tu cuenta está inactiva. Contacta a soporte.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Credenciales incorrectas");
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound("Usuario no encontrado");
  }

  return {
    ...publicUser(user),
    permissions: user.role.permissions.map((item) => item.permission.name),
  };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { accepted: true };
  }

  const { raw, hash } = createRawToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${raw}`;
  await sendPasswordResetEmail(user.email, resetUrl);
  return { accepted: true, ...(env.NODE_ENV !== "production" ? { devToken: raw } : {}) };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("El enlace de recuperación no es válido o expiró");
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

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("El enlace de verificación no es válido o expiró");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
