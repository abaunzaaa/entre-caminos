import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSIONS, ROLE_PERMISSION_MAP, ROLES } from "../src/config/constants.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env"), override: true });

const prisma = new PrismaClient();

export async function seedCore() {
  for (const name of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByName = Object.fromEntries(permissions.map((item) => [item.name, item]));

  for (const roleName of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSION_MAP[roleName].map((permissionName) => ({
        roleId: role.id,
        permissionId: permissionByName[permissionName].id,
      })),
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.SUPER_ADMIN } });
  const foundersPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!foundersPassword || foundersPassword.length < 8) {
    throw new Error("Define SEED_ADMIN_PASSWORD en backend/.env (archivo local, no se sube a GitHub).");
  }
  const meetsPolicy =
    /[A-Z]/.test(foundersPassword) &&
    /[a-z]/.test(foundersPassword) &&
    /[0-9]/.test(foundersPassword) &&
    /[^A-Za-z0-9]/.test(foundersPassword);
  if (!meetsPolicy) {
    throw new Error(
      "SEED_ADMIN_PASSWORD debe tener mayúscula, minúscula, número y símbolo. Si incluye #, escríbela entre comillas en .env (dotenv trata # como comentario).",
    );
  }
  const passwordHash = await bcrypt.hash(foundersPassword, 12);

  const founders = [
    { name: "Angie Diaz", email: "angie.diaz@entrecaminos.com" },
    { name: "Natalia Florez", email: "natalia.florez@entrecaminos.com" },
    { name: "Juliana Casas", email: "juliana.casas@entrecaminos.com" },
  ];

  const admins = [];
  for (const founder of founders) {
    const admin = await prisma.user.upsert({
      where: { email: founder.email },
      update: {
        name: founder.name,
        passwordHash,
        roleId: superAdminRole.id,
        status: "ACTIVE",
        emailVerified: true,
        deletedAt: null,
      },
      create: {
        name: founder.name,
        email: founder.email,
        passwordHash,
        roleId: superAdminRole.id,
        emailVerified: true,
      },
    });
    admins.push(admin);
  }

  return { admin: admins[0] };
}

async function main() {
  await seedCore();
  console.log("Semilla de Entre Caminos lista.");
  console.log("SUPER_ADMIN (contraseña: SEED_ADMIN_PASSWORD de tu .env local):");
  console.log("  angie.diaz@entrecaminos.com");
  console.log("  natalia.florez@entrecaminos.com");
  console.log("  juliana.casas@entrecaminos.com");
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
