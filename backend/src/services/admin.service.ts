import { prisma } from "../database/prisma.js";
import { ROLES } from "../config/constants.js";
import { ApiError } from "../utils/api-error.js";
import { hashPassword } from "../utils/password.js";
import { publicUser } from "../utils/serializers.js";
import { recordAudit } from "./audit.service.js";

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export async function listAdministrators() {
  const users = await prisma.user.findMany({
    where: { role: { name: { in: adminRoles } } },
    include: { role: true },
    orderBy: { createdAt: "desc" },
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

  if (!target || !adminRoles.includes(target.role.name as (typeof adminRoles)[number])) {
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

  await recordAudit({
    userId: actorId,
    action: "ADMIN_UPDATE",
    entity: "User",
    entityId: updated.id,
  });

  return publicUser(updated);
}

export async function getDashboardMetrics() {
  const [users, experiences, published, categories, admins] = await Promise.all([
    prisma.user.count({ where: { role: { name: ROLES.USER } } }),
    prisma.experience.count(),
    prisma.experience.count({ where: { status: "PUBLISHED" } }),
    prisma.category.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { name: { in: adminRoles } } } }),
  ]);

  const recentLogs = await prisma.auditLog.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return {
    users,
    experiences,
    published,
    categories,
    admins,
    recentLogs,
  };
}
