import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const SESSION_POOL = 5;

function appDatabaseUrl(rawDatabase: string, rawDirect?: string) {
  const pooled = new URL(rawDatabase);
  const transactionPool = pooled.searchParams.get("pgbouncer") === "true" || pooled.port === "6543";
  const source = transactionPool && rawDirect ? new URL(rawDirect) : pooled;
  if (!source.searchParams.get("pool_timeout")) {
    source.searchParams.set("pool_timeout", "20");
  }
  const usesTransactionPool = source.searchParams.get("pgbouncer") === "true" || source.port === "6543";
  if (usesTransactionPool) {
    if (!source.searchParams.get("connection_limit")) {
      source.searchParams.set("connection_limit", "1");
    }
    return source.toString();
  }
  const current = Number(source.searchParams.get("connection_limit") ?? "0");
  if (!Number.isFinite(current) || current < 1) {
    source.searchParams.set("connection_limit", String(SESSION_POOL));
  }
  return source.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: appDatabaseUrl(env.DATABASE_URL, env.DIRECT_URL),
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
