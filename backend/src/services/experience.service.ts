import type { ExperienceStatus, Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { recordAudit } from "./audit.service.js";

const experienceInclude = {
  category: true,
  creator: { select: { id: true, name: true, email: true } },
} as const;

export async function listPublicExperiences() {
  return prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listFeaturedExperiences() {
  return prisma.experience.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

export async function listAdminExperiences(filters?: { status?: ExperienceStatus; categoryId?: string }) {
  return prisma.experience.findMany({
    where: {
      status: filters?.status,
      categoryId: filters?.categoryId,
    },
    include: experienceInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getExperience(id: string, opts?: { publishedOnly?: boolean }) {
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: experienceInclude,
  });

  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  if (opts?.publishedOnly && experience.status !== "PUBLISHED") {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  return experience;
}

function requirePublishFields(imageUrl?: string | null, location?: string | null) {
  if (!imageUrl) {
    throw ApiError.unprocessable("Una experiencia publicada debe tener imagen");
  }
  if (!location) {
    throw ApiError.unprocessable("Una experiencia publicada debe tener ubicación");
  }
}

export async function createExperience(
  actorId: string,
  input: {
    title: string;
    description: string;
    categoryId: string;
    price: number;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string | null;
    status?: ExperienceStatus;
  },
) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw ApiError.badRequest("La categoría no existe");
  }
  if (category.status !== "ACTIVE") {
    throw ApiError.badRequest("La categoría está inactiva");
  }

  if ((input.status ?? "DRAFT") === "PUBLISHED") {
    requirePublishFields(input.imageUrl, input.location);
  }

  const experience = await prisma.experience.create({
    data: {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      location: input.location,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      imageUrl: input.imageUrl || null,
      status: input.status ?? "DRAFT",
      createdBy: actorId,
    },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actorId,
    action: "EXPERIENCE_CREATE",
    entity: "Experience",
    entityId: experience.id,
  });

  return experience;
}

export async function updateExperience(
  actorId: string,
  id: string,
  input: Prisma.ExperienceUncheckedUpdateInput,
) {
  const current = await getExperience(id);

  if (input.categoryId && typeof input.categoryId === "string") {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw ApiError.badRequest("La categoría no existe");
    }
  }

  const nextStatus = (typeof input.status === "string" ? input.status : current.status) as ExperienceStatus;
  const nextImage =
    input.imageUrl === undefined ? current.imageUrl : ((input.imageUrl as string | null) || null);
  const nextLocation =
    input.location === undefined ? current.location : String(input.location);
  if (nextStatus === "PUBLISHED") {
    requirePublishFields(nextImage, nextLocation);
  }

  const experience = await prisma.experience.update({
    where: { id },
    data: input,
    include: experienceInclude,
  });

  await recordAudit({
    userId: actorId,
    action: "EXPERIENCE_UPDATE",
    entity: "Experience",
    entityId: experience.id,
  });

  return experience;
}

export async function changeExperienceStatus(actorId: string, id: string, status: ExperienceStatus) {
  const current = await getExperience(id);

  if (status === "PUBLISHED") {
    requirePublishFields(current.imageUrl, current.location);
  }

  const experience = await prisma.experience.update({
    where: { id },
    data: { status },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actorId,
    action: `EXPERIENCE_STATUS_${status}`,
    entity: "Experience",
    entityId: experience.id,
  });

  return experience;
}

export async function deleteExperience(actorId: string, id: string) {
  await getExperience(id);
  await prisma.experience.delete({ where: { id } });
  await recordAudit({
    userId: actorId,
    action: "EXPERIENCE_DELETE",
    entity: "Experience",
    entityId: id,
  });
}
