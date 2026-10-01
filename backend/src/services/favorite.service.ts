import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";

const favoriteExperienceInclude = {
  category: true,
  experienceCategories: {
    orderBy: { position: "asc" as const },
    include: { category: true },
  },
} as const;

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function assertPublishedExperience(experienceId: string) {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  return experience;
}

export async function listFavoriteExperiences(userId: string, opts?: { take?: number }) {
  const rows = await prisma.experienceFavorite.findMany({
    where: {
      userId,
      experience: { status: "PUBLISHED" },
    },
    orderBy: { createdAt: "desc" },
    ...(opts?.take != null ? { take: opts.take } : {}),
    include: {
      experience: { include: favoriteExperienceInclude },
    },
  });

  return rows.map((row) => row.experience);
}

export async function isExperienceFavorited(userId: string, experienceId: string) {
  const row = await prisma.experienceFavorite.findUnique({
    where: {
      experienceId_userId: { experienceId, userId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function addFavorite(userId: string, experienceId: string) {
  await assertPublishedExperience(experienceId);

  try {
    await prisma.experienceFavorite.create({
      data: { userId, experienceId },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  return { favorited: true as const };
}

export async function removeFavorite(userId: string, experienceId: string) {
  await prisma.$transaction([
    prisma.favoriteCollectionItem.deleteMany({
      where: {
        experienceId,
        collection: { userId },
      },
    }),
    prisma.experienceFavorite.deleteMany({
      where: { userId, experienceId },
    }),
  ]);
  return { favorited: false as const };
}
