import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { recordAudit } from "./audit.service.js";

export async function listRoles() {
  return prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
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

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);

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
