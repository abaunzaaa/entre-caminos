import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./env.js";
import { prisma } from "../src/database/prisma.js";
import { seedCore } from "../prisma/seed.js";

const backendRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

export async function resetDatabase() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("resetDatabase solo corre con TEST_DATABASE_URL (nunca la base compartida).");
  }

  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    stdio: "inherit",
    env: { ...process.env },
  });

  await prisma.auditLog.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  await seedCore({ includeCatalog: false });
}

await resetDatabase();
