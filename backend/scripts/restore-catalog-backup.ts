/**
 * Restaura experiencias desde un catalog-backup.json generado por export-catalog.ts.
 * No toca Cloudinary (reutiliza las URLs del respaldo).
 * No borra usuarios, categorías ni colecciones existentes.
 *
 *   cd backend && npx tsx scripts/restore-catalog-backup.ts --backup backend/backups/catalog/<stamp>/catalog-backup.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";
import { hostOfDatabaseUrl } from "./lib/catalog-media.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env"), override: true });

const prisma = new PrismaClient();

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function decimal(value: unknown) {
  if (value == null) {
    return null;
  }
  return new Prisma.Decimal(String(value));
}

async function main() {
  const backupArg = argValue("--backup");
  if (!backupArg) {
    throw new Error("Indica --backup <ruta/catalog-backup.json>");
  }
  const execute = hasFlag("--execute");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida en backend/.env");
  }

  const absolute = path.isAbsolute(backupArg) ? backupArg : path.resolve(process.cwd(), backupArg);
  const payload = JSON.parse(await fs.readFile(absolute, "utf8")) as {
    meta?: { exportedAt?: string; databaseHost?: string };
    experiences: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(payload.experiences)) {
    throw new Error("El respaldo no contiene experiences[]");
  }

  console.log(
    JSON.stringify(
      {
        mode: execute ? "EXECUTE" : "DRY_RUN",
        databaseHost: hostOfDatabaseUrl(databaseUrl),
        backupHost: payload.meta?.databaseHost ?? null,
        exportedAt: payload.meta?.exportedAt ?? null,
        experiencesInBackup: payload.experiences.length,
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("\nSimulación de restauración. Añade --execute para escribir.");
    return;
  }

  let restored = 0;
  for (const row of payload.experiences) {
    const id = String(row.id);
    const experienceCategories = Array.isArray(row.experienceCategories)
      ? (row.experienceCategories as Array<{ categoryId: string; position: number }>)
      : [];

    const data = {
      title: String(row.title),
      description: String(row.description),
      categoryId: String(row.categoryId),
      price: new Prisma.Decimal(String(row.price)),
      currency: String(row.currency ?? "COP"),
      location: String(row.location),
      latitude: decimal(row.latitude),
      longitude: decimal(row.longitude),
      externalUrl: (row.externalUrl as string | null) ?? null,
      duration: (row.duration as string | null) ?? null,
      durationValue: (row.durationValue as number | null) ?? null,
      durationUnit: (row.durationUnit as "MINUTES" | "HOURS" | "DAYS" | null) ?? null,
      availability: (row.availability as Prisma.InputJsonValue) ?? undefined,
      howToGetThere: (row.howToGetThere as string | null) ?? null,
      imageUrl: (row.imageUrl as string | null) ?? null,
      imageUrls: Array.isArray(row.imageUrls) ? (row.imageUrls as string[]) : [],
      stampImageUrl: (row.stampImageUrl as string | null) ?? null,
      status: row.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | "REJECTED",
      createdBy: String(row.createdBy),
      submittedAt: row.submittedAt ? new Date(String(row.submittedAt)) : null,
      rejectionReason: (row.rejectionReason as string | null) ?? null,
      reviewedAt: row.reviewedAt ? new Date(String(row.reviewedAt)) : null,
      reviewedById: (row.reviewedById as string | null) ?? null,
      isFeatured: Boolean(row.isFeatured),
      featuredOrder: (row.featuredOrder as number | null) ?? null,
      featuredFrom: row.featuredFrom ? new Date(String(row.featuredFrom)) : null,
      featuredUntil: row.featuredUntil ? new Date(String(row.featuredUntil)) : null,
      createdAt: row.createdAt ? new Date(String(row.createdAt)) : undefined,
    };

    await prisma.$transaction(async (tx) => {
      await tx.experience.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
      await tx.experienceCategory.deleteMany({ where: { experienceId: id } });
      if (experienceCategories.length) {
        await tx.experienceCategory.createMany({
          data: experienceCategories.map((item) => ({
            experienceId: id,
            categoryId: item.categoryId,
            position: item.position,
          })),
        });
      }
    });
    restored += 1;
  }

  console.log(`Restauradas/actualizadas: ${restored} experiencias (URLs Cloudinary intactas).`);
  console.log("Nota: favoritos, reseñas y audit logs del respaldo no se reinsertan en este script mínimo.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
