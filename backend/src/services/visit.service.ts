import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { toVisitedJourneyStop } from "./visit-journey.js";

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

/**
 * Recorrido para el mapa de Visitados.
 * La visita no guarda sede: la coordenada es la de la sede principal
 * (menor position), la misma que el catálogo refleja en la experiencia.
 * El orden es createdAt ascendente y, si empatan, el id de la experiencia.
 */
export async function listVisitedJourney(userId: string) {
  const rows = await prisma.experienceVisit.findMany({
    where: {
      userId,
      experience: { status: "PUBLISHED" },
    },
    orderBy: [{ createdAt: "asc" }, { experienceId: "asc" }],
    select: {
      createdAt: true,
      experience: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          imageUrls: true,
          location: true,
          description: true,
          latitude: true,
          longitude: true,
          locations: {
            orderBy: { position: "asc" },
            select: {
              position: true,
              department: true,
              municipality: true,
              latitude: true,
              longitude: true,
            },
          },
          category: { select: { id: true, name: true } },
          experienceCategories: {
            orderBy: { position: "asc" },
            select: { category: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return rows.map((row) => toVisitedJourneyStop(row));
}

export async function removeVisit(userId: string, experienceId: string) {
  const review = await prisma.experienceVisitorReview.findFirst({
    where: { experienceId, userId },
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
