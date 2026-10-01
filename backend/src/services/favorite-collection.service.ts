import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import * as favoriteService from "./favorite.service.js";

const experienceInclude = {
  category: true,
  experienceCategories: {
    orderBy: { position: "asc" as const },
    include: { category: true },
  },
} as const;

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function assertCollectionName(name: string) {
  const cleaned = normalizeName(name);
  if (!cleaned) {
    throw ApiError.badRequest("El nombre de la colección es obligatorio");
  }
  if (cleaned.length > 50) {
    throw ApiError.badRequest("El nombre no puede superar 50 caracteres");
  }
  return cleaned;
}

async function getOwnedCollection(userId: string, collectionId: string) {
  const collection = await prisma.favoriteCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) {
    throw ApiError.notFound("Colección no encontrada");
  }
  return collection;
}

function serializeCollection(
  row: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{ experience: unknown }>;
    _count?: { items: number };
  },
  options: { includeAllExperiences?: boolean } = {},
) {
  const experiences = row.items.map((item) => item.experience);
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    count: row._count?.items ?? experiences.length,
    previewExperiences: experiences.slice(0, 4),
    ...(options.includeAllExperiences ? { experiences } : {}),
  };
}

export async function listCollections(userId: string) {
  const rows = await prisma.favoriteCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { experience: { include: experienceInclude } },
      },
    },
  });

  return rows.map((row) => serializeCollection(row));
}

export async function getCollection(userId: string, collectionId: string) {
  const row = await prisma.favoriteCollection.findFirst({
    where: { id: collectionId, userId },
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { createdAt: "desc" },
        include: { experience: { include: experienceInclude } },
      },
    },
  });
  if (!row) {
    throw ApiError.notFound("Colección no encontrada");
  }
  return serializeCollection(row, { includeAllExperiences: true });
}

export async function createCollection(
  userId: string,
  input: { name: string; experienceId?: string },
) {
  const name = assertCollectionName(input.name);

  try {
    const created = await prisma.favoriteCollection.create({
      data: { userId, name },
    });

    if (input.experienceId) {
      await addExperienceToCollection(userId, created.id, input.experienceId);
    }

    return getCollection(userId, created.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("Ya tienes una colección con ese nombre");
    }
    throw error;
  }
}

export async function renameCollection(userId: string, collectionId: string, name: string) {
  await getOwnedCollection(userId, collectionId);
  const cleaned = assertCollectionName(name);
  try {
    await prisma.favoriteCollection.update({
      where: { id: collectionId },
      data: { name: cleaned },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw ApiError.conflict("Ya tienes una colección con ese nombre");
    }
    throw error;
  }
  return getCollection(userId, collectionId);
}

export async function deleteCollection(userId: string, collectionId: string) {
  await getOwnedCollection(userId, collectionId);
  await prisma.favoriteCollection.delete({ where: { id: collectionId } });
  return { deleted: true as const };
}

export async function addExperienceToCollection(
  userId: string,
  collectionId: string,
  experienceId: string,
) {
  await getOwnedCollection(userId, collectionId);
  await favoriteService.addFavorite(userId, experienceId);

  try {
    await prisma.favoriteCollectionItem.create({
      data: { collectionId, experienceId },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return getCollection(userId, collectionId);
}

export async function removeExperienceFromCollection(
  userId: string,
  collectionId: string,
  experienceId: string,
) {
  await getOwnedCollection(userId, collectionId);
  await prisma.favoriteCollectionItem.deleteMany({
    where: { collectionId, experienceId },
  });
  return getCollection(userId, collectionId);
}

export async function setExperienceCollections(
  userId: string,
  experienceId: string,
  collectionIds: string[],
) {
  await favoriteService.addFavorite(userId, experienceId);

  const uniqueIds = Array.from(new Set(collectionIds.filter(Boolean)));
  if (uniqueIds.length) {
    const owned = await prisma.favoriteCollection.findMany({
      where: { userId, id: { in: uniqueIds } },
      select: { id: true },
    });
    if (owned.length !== uniqueIds.length) {
      throw ApiError.badRequest("Una o más colecciones no son válidas");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.favoriteCollectionItem.deleteMany({
      where: {
        experienceId,
        collection: { userId },
      },
    });

    if (uniqueIds.length) {
      await tx.favoriteCollectionItem.createMany({
        data: uniqueIds.map((collectionId) => ({ collectionId, experienceId })),
        skipDuplicates: true,
      });
    }
  });

  return { favorited: true as const, collectionIds: uniqueIds };
}

export async function listCollectionsForExperience(userId: string, experienceId: string) {
  const rows = await prisma.favoriteCollectionItem.findMany({
    where: {
      experienceId,
      collection: { userId },
    },
    select: { collectionId: true },
  });
  return rows.map((row) => row.collectionId);
}
