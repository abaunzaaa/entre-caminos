import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const MIN_POOL = 10;

function appDatabaseUrl(raw: string) {
  const url = new URL(raw);
  const current = Number(url.searchParams.get("connection_limit") ?? "0");
  if (!Number.isFinite(current) || current < MIN_POOL) {
    url.searchParams.set("connection_limit", String(MIN_POOL));
  }
  if (!url.searchParams.get("pool_timeout")) {
    url.searchParams.set("pool_timeout", "20");
  }
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: appDatabaseUrl(env.DATABASE_URL),
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
