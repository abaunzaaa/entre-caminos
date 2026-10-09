import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";

export const VISIT_HAS_REVIEW_CODE = "VISIT_HAS_REVIEW";
export const VISIT_HAS_REVIEW_MESSAGE =
  "Tienes una reseña publicada sobre esta experiencia. Para quitarla de tus experiencias visitadas, primero debes eliminar tu reseña.";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function assertPublishedExperience(experienceId: string) {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }
  return experience;
}

export async function listVisitedExperienceIds(userId: string) {
  const rows = await prisma.experienceVisit.findMany({
    where: {
      userId,
      experience: { status: "PUBLISHED" },
    },
    orderBy: { createdAt: "desc" },
    select: { experienceId: true },
  });
  return rows.map((row) => row.experienceId);
}

export async function isExperienceVisited(userId: string, experienceId: string) {
  const row = await prisma.experienceVisit.findUnique({
    where: {
      experienceId_userId: { experienceId, userId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function addVisit(userId: string, experienceId: string) {
  await assertPublishedExperience(experienceId);

  try {
    await prisma.experienceVisit.create({
      data: { userId, experienceId },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  return { visited: true as const };
}

export async function removeVisit(userId: string, experienceId: string) {
  const review = await prisma.experienceVisitorReview.findUnique({
    where: { experienceId_userId: { experienceId, userId } },
    select: { id: true },
  });
  if (review) {
    throw new ApiError(409, VISIT_HAS_REVIEW_MESSAGE, VISIT_HAS_REVIEW_CODE);
  }

  await prisma.experienceVisit.deleteMany({
    where: { userId, experienceId },
  });
  return { visited: false as const };
}
