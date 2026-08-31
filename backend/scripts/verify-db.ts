import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env"), override: true });

function hostOf(url?: string) {
  if (!url) {
    return "(vacía)";
  }
  const withoutProtocol = url.replace(/^postgres(ql)?:\/\//, "");
  const at = withoutProtocol.lastIndexOf("@");
  const hostPart = at >= 0 ? withoutProtocol.slice(at + 1) : withoutProtocol;
  return hostPart.split("/")[0] ?? hostPart;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!databaseUrl || !directUrl) {
    throw new Error("DATABASE_URL y DIRECT_URL deben estar en backend/.env (URIs de Supabase).");
  }

  const host = hostOf(databaseUrl);
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    throw new Error(`DATABASE_URL apunta a ${host}. Entre Caminos usa PostgreSQL en Supabase, no local.`);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [roles, permissions, users, categories, experiences, auditLogs] = await Promise.all([
      prisma.role.count(),
      prisma.permission.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.experience.count(),
      prisma.auditLog.count(),
    ]);

    console.log("Conexión Prisma → PostgreSQL OK");
    console.log(`DATABASE_URL host: ${host}`);
    console.log(`DIRECT_URL host:   ${hostOf(directUrl)}`);
    console.log(`Supabase: ${host.includes("supabase") ? "sí" : "revisa el host (debería ser pooler.supabase.com)"}`);
    console.log("Conteos:");
    console.log(`  roles          ${roles}`);
    console.log(`  permissions    ${permissions}`);
    console.log(`  users          ${users}`);
    console.log(`  categories     ${categories}`);
    console.log(`  experiences    ${experiences}`);
    console.log(`  audit_logs     ${auditLogs}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
