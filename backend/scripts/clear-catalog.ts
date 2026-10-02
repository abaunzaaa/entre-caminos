/**
 * Limpieza segura del catálogo por lista explícita de IDs.
 *
 * Simulación (por defecto):
 *   cd backend && npx tsx scripts/clear-catalog.ts --ids backend/backups/catalog/<stamp>/experience-ids.json
 *
 * Ejecución real (NO usar en esta etapa sin revisión):
 *   cd backend && npx tsx scripts/clear-catalog.ts --ids ... --execute --i-understand-this-deletes-experiences
 *
 * Conserva: usuarios, perfiles, categorías, colecciones (pueden quedar vacías).
 * No borra archivos en Cloudinary.
 * No usa migrate reset, db push --force-reset ni TRUNCATE.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { collectExperienceImageRefs, hostOfDatabaseUrl } from "./lib/catalog-media.js";

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

async function loadIds(idsPath: string) {
  const absolute = path.isAbsolute(idsPath) ? idsPath : path.resolve(process.cwd(), idsPath);
  const raw = await fs.readFile(absolute, "utf8");
  const parsed = JSON.parse(raw) as { ids?: string[] } | string[];
  const ids = Array.isArray(parsed) ? parsed : parsed.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || !id.trim())) {
    throw new Error(`Archivo de IDs inválido: ${absolute}`);
  }
  return { absolute, ids: [...new Set(ids.map((id) => id.trim()))] };
}

async function main() {
  const idsArg = argValue("--ids");
  if (!idsArg) {
    throw new Error("Indica --ids <ruta/experience-ids.json>");
  }

  const execute = hasFlag("--execute");
  const confirmed = hasFlag("--i-understand-this-deletes-experiences");
  if (execute && !confirmed) {
    throw new Error("Para ejecutar de verdad añade también --i-understand-this-deletes-experiences");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida en backend/.env");
  }
  const host = hostOfDatabaseUrl(databaseUrl);
  const { absolute: idsFile, ids } = await loadIds(idsArg);

  const experiences = await prisma.experience.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
    include: {
      creator: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
      experienceCategories: true,
      reviews: true,
      experienceDetailViews: true,
      experienceFavorites: true,
      experienceVisitorReviews: true,
      conversations: { select: { id: true } },
    },
  });

  const foundIds = new Set(experiences.map((item) => item.id));
  const missingIds = ids.filter((id) => !foundIds.has(id));
  const extraInDb = await prisma.experience.findMany({
    where: { id: { notIn: ids } },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const favoriteCollectionItemsCount = await prisma.favoriteCollectionItem.count({
    where: { experienceId: { in: ids } },
  });

  const [auditLogs, notifications, collectionsTotal, categoriesTotal, usersTotal] = await Promise.all([
    prisma.auditLog.count({ where: { entity: "experience", entityId: { in: ids } } }),
    prisma.notification.count({ where: { entity: "experience", entityId: { in: ids } } }),
    prisma.favoriteCollection.count(),
    prisma.category.count(),
    prisma.user.count(),
  ]);

  const related = {
    experienceCategories: experiences.reduce((sum, item) => sum + item.experienceCategories.length, 0),
    experienceReviews: experiences.reduce((sum, item) => sum + item.reviews.length, 0),
    experienceDetailViews: experiences.reduce((sum, item) => sum + item.experienceDetailViews.length, 0),
    experienceFavorites: experiences.reduce((sum, item) => sum + item.experienceFavorites.length, 0),
    experienceVisitorReviews: experiences.reduce((sum, item) => sum + item.experienceVisitorReviews.length, 0),
    favoriteCollectionItems: favoriteCollectionItemsCount,
    conversationsLinked: experiences.reduce((sum, item) => sum + item.conversations.length, 0),
    auditLogs,
    notifications,
    cloudinaryImageRefs: experiences.flatMap((item) => collectExperienceImageRefs(item)).length,
  };

  const report = {
    mode: execute ? "EXECUTE" : "DRY_RUN",
    databaseHost: host,
    supabase: host.includes("supabase"),
    idsFile,
    requestedIds: ids.length,
    matchedExperiences: experiences.length,
    missingIds,
    wouldDeleteExperiences: experiences.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: {
        id: item.creator.id,
        name: item.creator.name,
        email: item.creator.email,
        role: item.creator.role.name,
      },
    })),
    relatedWouldBeAffected: {
      ...related,
      conversationsNote:
        "Las conversaciones del asistente se conservan; experienceId pasa a null (onDelete: SetNull).",
      cloudinaryNote: "No se borran archivos en Cloudinary en esta etapa.",
    },
    wouldKeep: {
      users: usersTotal,
      categories: categoriesTotal,
      favoriteCollections: collectionsTotal,
      experiencesNotInIdList: extraInDb,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (!execute) {
    console.log("\nSimulación completa. No se eliminó nada.");
    return;
  }

  if (missingIds.length) {
    console.warn(`Aviso: ${missingIds.length} IDs del archivo ya no existen en la base.`);
  }
  if (!experiences.length) {
    console.log("No hay experiencias coincidentes para borrar.");
    return;
  }

  const targetIds = experiences.map((item) => item.id);
  const expectedCount = targetIds.length;
  const expectedSet = new Set(targetIds);

  await prisma.$transaction(async (tx) => {
    const current = await tx.experience.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const currentIds = current.map((item) => item.id);
    const currentSet = new Set(currentIds);

    if (currentIds.length !== expectedCount) {
      throw new Error(
        `Abortado: el conjunto cambió antes de borrar (esperadas ${expectedCount}, actuales ${currentIds.length}).`,
      );
    }
    for (const id of expectedSet) {
      if (!currentSet.has(id)) {
        throw new Error(`Abortado: falta el ID ${id} en el conjunto actual antes de borrar.`);
      }
    }
    for (const id of currentSet) {
      if (!expectedSet.has(id)) {
        throw new Error(`Abortado: aparece un ID fuera de la lista (${id}) antes de borrar.`);
      }
    }

    // Relaciones con FK cascade se borran con la experiencia; limpiamos enlaces sueltos.
    await tx.notification.deleteMany({
      where: { entity: "experience", entityId: { in: targetIds } },
    });
    await tx.auditLog.deleteMany({
      where: { entity: "experience", entityId: { in: targetIds } },
    });
    // Conversaciones: SetNull automático al borrar experiencia.
    await tx.experience.deleteMany({
      where: { id: { in: targetIds } },
    });
  });

  const remaining = await prisma.experience.count({ where: { id: { in: targetIds } } });
  if (remaining > 0) {
    throw new Error(`La eliminación no completó: quedan ${remaining} experiencias de la lista.`);
  }

  console.log(`\nEliminación completada: ${targetIds.length} experiencias.`);
  console.log(`Experiencias fuera de la lista (conservadas): ${extraInDb.length}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
