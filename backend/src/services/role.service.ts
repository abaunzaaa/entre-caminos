import { prisma } from "../database/prisma.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";
import { ApiError } from "../utils/api-error.js";
import { clearAuthUserCache } from "../utils/auth-cache.js";
import { recordAudit } from "./audit.service.js";

const SUPER_ADMIN_REQUIRED_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.ADMINS_MANAGE,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.PERMISSIONS_MANAGE,
] as const;

export async function listRoles() {
  return prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: {
        select: {
          users: {
            where: { deletedAt: null, status: "ACTIVE" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createRole(actorId: string, name: string) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    throw ApiError.conflict("Ese rol ya existe");
  }

  const role = await prisma.role.create({ data: { name } });
  await recordAudit({ userId: actorId, action: "ROLE_CREATE", entity: "Role", entityId: role.id });
  return role;
}

export async function assignPermissions(actorId: string, roleId: string, permissionIds: string[]) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw ApiError.notFound("Rol no encontrado");
  }

  const uniqueIds = [...new Set(permissionIds)];
  if (uniqueIds.length === 0) {
    throw ApiError.badRequest("Un rol administrativo necesita al menos un permiso.");
  }

  const permissions = await prisma.permission.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });
  if (permissions.length !== uniqueIds.length) {
    throw ApiError.badRequest("Hay permisos inválidos en la solicitud.");
  }

  if (role.name === ROLES.SUPER_ADMIN) {
    const names = new Set(permissions.map((item) => item.name));
    const missing = SUPER_ADMIN_REQUIRED_PERMISSIONS.filter((name) => !names.has(name));
    if (missing.length > 0) {
      throw ApiError.forbidden(
        "El super administrador no puede perder los permisos indispensables para administrar el sistema.",
      );
    }
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: uniqueIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  clearAuthUserCache();

  await recordAudit({
    userId: actorId,
    action: "ROLE_PERMISSIONS_UPDATE",
    entity: "Role",
    entityId: roleId,
  });

  return listRoles().then((roles) => roles.find((item) => item.id === roleId));
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { name: "asc" } });
}

export async function createPermission(actorId: string, name: string) {
  const existing = await prisma.permission.findUnique({ where: { name } });
  if (existing) {
    throw ApiError.conflict("Ese permiso ya existe");
  }

  const permission = await prisma.permission.create({ data: { name } });
  await recordAudit({
    userId: actorId,
    action: "PERMISSION_CREATE",
    entity: "Permission",
    entityId: permission.id,
  });
  return permission;
}
