import { prisma } from "../database/prisma.js";
import { ROLES, type RoleName } from "../config/constants.js";
import type { AuthUser } from "../models/auth-user.js";
import { livingUserWhere } from "../utils/account.js";
import { ApiError } from "../utils/api-error.js";
import { canReviewExperiences } from "../utils/permissions.js";
import { hashPassword } from "../utils/password.js";
import { clearAuthUserCache, revokeAuthUser } from "../utils/auth-cache.js";
import { publicUser } from "../utils/serializers.js";
import { recordAudit } from "./audit.service.js";
import { listCategories } from "./category.service.js";

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

const administratorRoleWhere = {
  role: { name: { in: adminRoles } },
} as const;

export async function countActiveAdministrators() {
  return prisma.user.count({
    where: {
      ...administratorRoleWhere,
      ...livingUserWhere,
      status: "ACTIVE",
    },
  });
}

export async function listAdministrators(options?: { take?: number; roles?: RoleName[] }) {
  const roles = options?.roles?.length ? options.roles : adminRoles;
  const users = await prisma.user.findMany({
    where: {
      role: { name: { in: roles } },
      ...livingUserWhere,
    },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      status: true,
      createdAt: true,
      avatarUrl: true,
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options?.take,
  });

  return users.map(publicUser);
}

export async function createAdministrator(
  actorId: string,
  input: { name: string; email: string; password: string; role: "SUPER_ADMIN" | "ADMIN" },
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict("Ya existe un usuario con este correo");
  }

  const role = await prisma.role.findUnique({ where: { name: input.role } });
  if (!role) {
    throw ApiError.badRequest("Rol administrativo no encontrado");
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roleId: role.id,
      emailVerified: true,
    },
    include: { role: true },
  });

  await recordAudit({
    userId: actorId,
    action: "ADMIN_CREATE",
    entity: "User",
    entityId: user.id,
  });

  return publicUser(user);
}

export async function updateAdministrator(
  actorId: string,
  adminId: string,
  input: { name?: string; status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"; role?: "SUPER_ADMIN" | "ADMIN" },
) {
  const target = await prisma.user.findUnique({
    where: { id: adminId },
    include: { role: true },
  });

  if (!target || target.deletedAt || !adminRoles.includes(target.role.name as (typeof adminRoles)[number])) {
    throw ApiError.notFound("Administrador no encontrado");
  }

  if (target.id === actorId && input.status && input.status !== "ACTIVE") {
    throw ApiError.badRequest("No puedes desactivar tu propia cuenta");
  }

  let roleId = target.roleId;
  if (input.role) {
    const role = await prisma.role.findUnique({ where: { name: input.role } });
    if (!role) {
      throw ApiError.badRequest("Rol no encontrado");
    }
    roleId = role.id;
  }

  const updated = await prisma.user.update({
    where: { id: adminId },
    data: {
      name: input.name ?? target.name,
      status: input.status ?? target.status,
      roleId,
    },
    include: { role: true },
  });

  clearAuthUserCache(updated.id);

  await recordAudit({
    userId: actorId,
    action: "ADMIN_UPDATE",
    entity: "User",
    entityId: updated.id,
  });

  return publicUser(updated);
}

export async function deleteAdministrator(actorId: string, adminId: string) {
  const target = await prisma.user.findUnique({
    where: { id: adminId },
    include: { role: true },
  });

  if (!target || target.deletedAt || !adminRoles.includes(target.role.name as (typeof adminRoles)[number])) {
    throw ApiError.notFound("Administrador no encontrado");
  }

  if (target.id === actorId) {
    throw ApiError.badRequest("No puedes eliminar tu propia cuenta");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (
      !current ||
      current.deletedAt ||
      !adminRoles.includes(current.role.name as (typeof adminRoles)[number])
    ) {
      throw ApiError.notFound("Administrador no encontrado");
    }

    if (current.role.name === ROLES.SUPER_ADMIN) {
      const remainingSuperAdmins = await tx.user.count({
        where: {
          ...livingUserWhere,
          status: "ACTIVE",
          role: { name: ROLES.SUPER_ADMIN },
          NOT: { id: current.id },
        },
      });
      if (remainingSuperAdmins < 1) {
        throw ApiError.badRequest("No se puede eliminar al último super administrador");
      }
    }

    await tx.user.update({
      where: { id: adminId },
      data: { deletedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: adminId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.emailVerificationToken.updateMany({
      where: { userId: adminId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  revokeAuthUser(adminId);

  await recordAudit({
    userId: actorId,
    action: "ADMIN_DELETE",
    entity: "User",
    entityId: adminId,
  });
}

export async function getDashboardMetrics(actor: AuthUser) {
  const reviewer = canReviewExperiences(actor);
  const [
    users,
    experienceGroups,
    categories,
    admins,
    createdCategoryRows,
    createdExperiences,
    administrators,
    recentLogs,
    recentCategories,
    recentExperiences,
  ] = await Promise.all([
    prisma.user.count({ where: { ...livingUserWhere, role: { name: ROLES.USER } } }),
    prisma.experience.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.category.count({ where: { status: "ACTIVE" } }),
    countActiveAdministrators(),
    prisma.auditLog.findMany({
      where: { userId: actor.id, action: "CATEGORY_CREATE", entity: "Category" },
      select: { entityId: true },
      distinct: ["entityId"],
    }),
    prisma.experience.count({
      where: {
        createdBy: actor.id,
        status: { in: ["PUBLISHED", "ARCHIVED"] },
      },
    }),
    listAdministrators({
      take: 3,
      ...(actor.role === ROLES.ADMIN ? { roles: [ROLES.SUPER_ADMIN] } : {}),
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    listCategories({ includeInactive: true, take: 3 }),
    prisma.experience.findMany({
      where: reviewer ? undefined : { createdBy: actor.id },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        categoryId: true,
        price: true,
        location: true,
        imageUrl: true,
        imageUrls: true,
        status: true,
        createdBy: true,
        submittedAt: true,
        createdAt: true,
        category: { select: { id: true, name: true, icon: true, status: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const experiences = experienceGroups.reduce((sum, row) => sum + row._count._all, 0);
  const published = experienceGroups.find((row) => row.status === "PUBLISHED")?._count._all ?? 0;
  const ownedCategoryIds = createdCategoryRows.map((row) => row.entityId);
  const createdCategories = ownedCategoryIds.length
    ? await prisma.category.count({
        where: {
          id: { in: ownedCategoryIds },
          status: { in: ["ACTIVE", "INACTIVE"] },
        },
      })
    : 0;

  return {
    users,
    experiences,
    published,
    categories,
    admins,
    createdCategories,
    createdExperiences,
    administrators,
    recentCategories,
    recentExperiences,
    recentLogs,
  };
}
