/**
 * Sync RolePermission rows from ROLE_PERMISSION_MAP without reseeding users.
 * Usage: node scripts/sync-role-permissions.cjs
 */
const { PrismaClient } = require("@prisma/client");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const PERMISSIONS = {
  DASHBOARD_VIEW: "admin.dashboard.view",
  ADMINS_MANAGE: "admins.manage",
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_MANAGE: "permissions.manage",
  CATEGORIES_MANAGE: "categories.manage",
  CATEGORIES_REVIEW: "categories.review",
  EXPERIENCES_MANAGE: "experiences.manage",
  EXPERIENCES_REVIEW: "experiences.review",
  USERS_VIEW: "users.view",
  AUDIT_VIEW: "audit.view",
};

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
};

const ROLE_PERMISSION_MAP = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.EXPERIENCES_MANAGE,
    PERMISSIONS.USERS_VIEW,
  ],
  USER: [],
};

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const name of Object.values(PERMISSIONS)) {
      await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    const permissions = await prisma.permission.findMany();
    const permissionByName = Object.fromEntries(permissions.map((item) => [item.name, item]));
    const result = {};

    for (const roleName of Object.values(ROLES)) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      const names = ROLE_PERMISSION_MAP[roleName];
      if (names.length) {
        await prisma.rolePermission.createMany({
          data: names.map((permissionName) => ({
            roleId: role.id,
            permissionId: permissionByName[permissionName].id,
          })),
        });
      }
      result[roleName] = names;
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
