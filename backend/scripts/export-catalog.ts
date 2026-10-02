/**
 * Exporta el catálogo actual (experiencias + relaciones + refs Cloudinary) a un JSON recuperable.
 * No incluye contraseñas, tokens ni secretos.
 *
 *   cd backend && npx tsx scripts/export-catalog.ts
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida en backend/.env");
  }

  const host = hostOfDatabaseUrl(databaseUrl);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(here, `../backups/catalog/${stamp}`);
  await fs.mkdir(outDir, { recursive: true });

  const experiences = await prisma.experience.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      creator: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, status: true } },
      experienceCategories: {
        orderBy: { position: "asc" },
        include: { category: { select: { id: true, name: true, status: true } } },
      },
      reviews: true,
      experienceDetailViews: true,
      experienceFavorites: true,
      experienceVisitorReviews: true,
      conversations: {
        select: {
          id: true,
          userId: true,
          title: true,
          contextType: true,
          experienceId: true,
          experienceName: true,
          experienceData: true,
          favorite: true,
          pinned: true,
          folderId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const ids = experiences.map((item) => item.id);

  const favoriteCollectionItems = ids.length
    ? await prisma.favoriteCollectionItem.findMany({
        where: { experienceId: { in: ids } },
        include: {
          collection: { select: { id: true, userId: true, name: true } },
        },
      })
    : [];

  const itemsByExperience = new Map<string, typeof favoriteCollectionItems>();
  for (const item of favoriteCollectionItems) {
    const list = itemsByExperience.get(item.experienceId) ?? [];
    list.push(item);
    itemsByExperience.set(item.experienceId, list);
  }

  const experiencesWithCollections = experiences.map((experience) => ({
    ...experience,
    favoriteCollectionItems: itemsByExperience.get(experience.id) ?? [],
  }));

  const [auditLogs, notifications, favoriteCollections, categories, usersSummary] = await Promise.all([
    ids.length
      ? prisma.auditLog.findMany({
          where: { entity: "experience", entityId: { in: ids } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.notification.findMany({
          where: { entity: "experience", entityId: { in: ids } },
        })
      : Promise.resolve([]),
    prisma.favoriteCollection.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, status: true, description: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: { select: { name: true } },
        _count: { select: { experiences: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const owners = new Map<string, { id: string; name: string; email: string; role: string; count: number }>();
  for (const experience of experiencesWithCollections) {
    const key = experience.createdBy;
    const current = owners.get(key);
    if (current) {
      current.count += 1;
    } else {
      owners.set(key, {
        id: experience.creator.id,
        name: experience.creator.name,
        email: experience.creator.email,
        role: experience.creator.role.name,
        count: 1,
      });
    }
  }

  const imageIndex = experiencesWithCollections.flatMap((experience) =>
    collectExperienceImageRefs(experience).map((ref) => ({
      experienceId: experience.id,
      title: experience.title,
      ...ref,
    })),
  );

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      databaseHost: host,
      supabase: host.includes("supabase"),
      experienceCount: experiencesWithCollections.length,
      note:
        "Respaldo recuperable del catálogo. No contiene contraseñas ni tokens. Las imágenes de Cloudinary no se descargan; solo se guardan URL y public_id inferido.",
    },
    owners: [...owners.values()],
    categories,
    usersSummary: usersSummary.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role.name,
      experiencesCreated: user._count.experiences,
    })),
    favoriteCollections,
    experiences: experiencesWithCollections,
    related: {
      auditLogs,
      notifications,
    },
    cloudinaryImageRefs: imageIndex,
    deletionIdList: ids,
  };

  const backupPath = path.join(outDir, "catalog-backup.json");
  const idsPath = path.join(outDir, "experience-ids.json");
  const summaryPath = path.join(outDir, "summary.json");

  await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.writeFile(idsPath, JSON.stringify({ exportedAt: payload.meta.exportedAt, ids }, null, 2), "utf8");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(
      {
        meta: payload.meta,
        owners: payload.owners,
        counts: {
          experiences: experiencesWithCollections.length,
          byStatus: experiencesWithCollections.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
          }, {}),
          experienceCategories: experiencesWithCollections.reduce(
            (sum, item) => sum + item.experienceCategories.length,
            0,
          ),
          reviews: experiencesWithCollections.reduce((sum, item) => sum + item.reviews.length, 0),
          detailViews: experiencesWithCollections.reduce(
            (sum, item) => sum + item.experienceDetailViews.length,
            0,
          ),
          favorites: experiencesWithCollections.reduce(
            (sum, item) => sum + item.experienceFavorites.length,
            0,
          ),
          visitorReviews: experiencesWithCollections.reduce(
            (sum, item) => sum + item.experienceVisitorReviews.length,
            0,
          ),
          collectionItems: favoriteCollectionItems.length,
          conversationsLinked: experiencesWithCollections.reduce(
            (sum, item) => sum + item.conversations.length,
            0,
          ),
          auditLogs: auditLogs.length,
          notifications: notifications.length,
          cloudinaryImageRefs: imageIndex.length,
          favoriteCollectionsKept: favoriteCollections.length,
          categoriesKept: categories.length,
          usersKept: usersSummary.length,
        },
        experienceIds: ids,
        experienceTitles: experiencesWithCollections.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
        })),
      },
      null,
      2,
    ),
    "utf8",
  );

  // Verificación básica del respaldo
  const raw = await fs.readFile(backupPath, "utf8");
  const parsed = JSON.parse(raw) as { experiences?: unknown[]; deletionIdList?: string[] };
  if (!Array.isArray(parsed.experiences) || parsed.experiences.length !== experiencesWithCollections.length) {
    throw new Error("Verificación fallida: el respaldo no contiene todas las experiencias.");
  }
  if (!Array.isArray(parsed.deletionIdList) || parsed.deletionIdList.length !== ids.length) {
    throw new Error("Verificación fallida: la lista de IDs no coincide.");
  }

  console.log("Respaldo de catálogo generado");
  console.log(`  host: ${host}`);
  console.log(`  experiencias: ${experiencesWithCollections.length}`);
  console.log(`  refs imagen: ${imageIndex.length}`);
  console.log(`  carpeta: ${outDir}`);
  console.log(`  backup: ${backupPath}`);
  console.log(`  ids: ${idsPath}`);
  console.log(`  summary: ${summaryPath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
