import { Prisma, type DurationUnit, type ExperienceStatus } from "@prisma/client";
import { MIN_EXPERIENCE_IMAGES, MIN_EXPERIENCE_IMAGES_MESSAGE } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import type { AuthUser } from "../models/auth-user.js";
import { ApiError } from "../utils/api-error.js";
import { resolveExperienceDuration } from "../utils/experience-duration.js";
import { canReviewExperiences, publishesExperiencesDirectly } from "../utils/permissions.js";
import { recordAudit } from "./audit.service.js";
import {
  notifyExperienceApproved,
  notifyExperienceRejected,
  notifyExperienceSubmitted,
} from "./notification.service.js";

const experienceInclude = {
  category: true,
  creator: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

const experienceListSelect = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  price: true,
  location: true,
  latitude: true,
  longitude: true,
  externalUrl: true,
  duration: true,
  durationValue: true,
  durationUnit: true,
  availability: true,
  howToGetThere: true,
  imageUrl: true,
  imageUrls: true,
  status: true,
  createdBy: true,
  submittedAt: true,
  rejectionReason: true,
  reviewedAt: true,
  reviewedById: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, icon: true, status: true } },
  creator: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

const publicCatalogWhere = { status: "PUBLISHED" as const };

function assertCanAccess(experience: { createdBy: string }, actor: AuthUser) {
  if (!canReviewExperiences(actor) && experience.createdBy !== actor.id) {
    throw ApiError.forbidden("Solo puedes consultar tus propias experiencias");
  }
}

function canManageAvailability(actor: AuthUser, experience: { createdBy: string }) {
  return canReviewExperiences(actor) || experience.createdBy === actor.id;
}

export async function listPublicExperiences() {
  return prisma.experience.findMany({
    where: publicCatalogWhere,
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listFeaturedExperiences() {
  return prisma.experience.findMany({
    where: publicCatalogWhere,
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
}

export async function listAdminExperiences(
  actor: AuthUser,
  filters?: { status?: ExperienceStatus; categoryId?: string; take?: number },
) {
  const reviewer = canReviewExperiences(actor);
  return prisma.experience.findMany({
    where: {
      status: filters?.status,
      categoryId: filters?.categoryId,
      ...(reviewer ? {} : { createdBy: actor.id }),
    },
    select: experienceListSelect,
    orderBy:
      filters?.take && filters.status === "PENDING"
        ? [{ submittedAt: "desc" }, { createdAt: "desc" }]
        : filters?.take
          ? { createdAt: "desc" }
          : [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: filters?.take,
  });
}

export async function getExperience(id: string, opts?: { publishedOnly?: boolean; actor?: AuthUser }) {
  const experience = await prisma.experience.findUnique({
    where: { id },
    include: experienceInclude,
  });

  if (!experience) {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  if (opts?.publishedOnly && experience.status !== publicCatalogWhere.status) {
    throw ApiError.notFound("Experiencia no encontrada");
  }

  if (opts?.actor) {
    assertCanAccess(experience, opts.actor);
  }

  return experience;
}

function normalizeExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = Array.isArray(input.imageUrls)
    ? input.imageUrls.map((url) => url.trim()).filter(Boolean)
    : null;
  if (listed) {
    return { imageUrl: listed[0] ?? null, imageUrls: listed };
  }
  const single = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  const urls = single ? [single] : [];
  return { imageUrl: urls[0] ?? null, imageUrls: urls };
}

function countExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  const listed = Array.isArray(input.imageUrls)
    ? input.imageUrls.map((url) => url.trim()).filter(Boolean)
    : [];
  if (listed.length) {
    return listed.length;
  }
  const single = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  return single ? 1 : 0;
}

function requireMinExperienceImages(input: { imageUrl?: string | null; imageUrls?: string[] | null }) {
  if (countExperienceImages(input) < MIN_EXPERIENCE_IMAGES) {
    throw ApiError.unprocessable(MIN_EXPERIENCE_IMAGES_MESSAGE);
  }
}

function requirePublishFields(
  images: { imageUrl?: string | null; imageUrls?: string[] | null },
  location?: string | null,
) {
  requireMinExperienceImages(images);
  if (!location) {
    throw ApiError.unprocessable("Una experiencia publicada debe tener ubicación");
  }
}

export async function createExperience(
  actor: AuthUser,
  input: {
    title: string;
    description: string;
    categoryId: string;
    price: number;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    externalUrl?: string | null;
    duration?: string | null;
    durationValue?: number | null;
    durationUnit?: DurationUnit | null;
    availability?: Prisma.InputJsonValue | null;
    howToGetThere?: string | null;
    imageUrl?: string | null;
    imageUrls?: string[];
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

  const gallery = normalizeExperienceImages(input);
  requirePublishFields(gallery, input.location);
  void input.status;
  const durationFields = resolveExperienceDuration(input) ?? {
    duration: null,
    durationValue: null,
    durationUnit: null,
  };

  const publishesDirectly = publishesExperiencesDirectly(actor);
  const status: ExperienceStatus = publishesDirectly ? "PUBLISHED" : "PENDING";
  const submittedAt = publishesDirectly ? null : new Date();
  const experience = await prisma.experience.create({
    data: {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      location: input.location,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      externalUrl: input.externalUrl ?? null,
      duration: durationFields.duration,
      durationValue: durationFields.durationValue,
      durationUnit: durationFields.durationUnit,
      availability: input.availability === undefined || input.availability === null ? undefined : input.availability,
      howToGetThere: input.howToGetThere ?? null,
      imageUrl: gallery.imageUrl,
      imageUrls: gallery.imageUrls,
      status,
      createdBy: actor.id,
      submittedAt,
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_CREATE",
    entity: "Experience",
    entityId: experience.id,
  });
  if (!publishesDirectly) {
    await notifyExperienceSubmitted({
      experienceId: experience.id,
      title: experience.title,
      creatorId: actor.id,
      creatorName: actor.name,
    });
  }

  return experience;
}

function pickExperienceUpdate(input: Prisma.ExperienceUncheckedUpdateInput) {
  const data: Prisma.ExperienceUncheckedUpdateInput = {};
  const keys = [
    "title",
    "description",
    "categoryId",
    "price",
    "location",
    "latitude",
    "longitude",
    "externalUrl",
    "duration",
    "durationValue",
    "durationUnit",
    "availability",
    "howToGetThere",
    "imageUrl",
    "imageUrls",
  ] as const;
  for (const key of keys) {
    if (input[key] !== undefined) {
      if (key === "availability" && input[key] === null) {
        data.availability = Prisma.DbNull;
      } else {
        data[key] = input[key] as never;
      }
    }
  }
  return data;
}

export async function updateExperience(
  actor: AuthUser,
  id: string,
  input: Prisma.ExperienceUncheckedUpdateInput,
) {
  const current = await getExperience(id, { actor });
  const reviewer = canReviewExperiences(actor);

  if (!reviewer && (current.status === "PUBLISHED" || current.status === "ARCHIVED")) {
    throw ApiError.forbidden("No puedes editar una experiencia ya publicada o archivada");
  }

  if (input.categoryId && typeof input.categoryId === "string") {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw ApiError.badRequest("La categoría no existe");
    }
  }

  const data = pickExperienceUpdate(input);
  delete data.status;
  const durationPatch = resolveExperienceDuration({
    duration: input.duration === undefined ? undefined : ((input.duration as string | null) ?? null),
    durationValue: input.durationValue === undefined ? undefined : (input.durationValue as number | null),
    durationUnit: input.durationUnit === undefined ? undefined : (input.durationUnit as DurationUnit | null),
  });
  if (durationPatch) {
    Object.assign(data, durationPatch);
  }
  const hasGalleryUpdate = data.imageUrl !== undefined || data.imageUrls !== undefined;
  const gallery = hasGalleryUpdate
    ? normalizeExperienceImages({
        imageUrl: data.imageUrl === undefined ? current.imageUrl : ((data.imageUrl as string | null) || null),
        imageUrls: Array.isArray(data.imageUrls) ? (data.imageUrls as string[]) : undefined,
      })
    : { imageUrl: current.imageUrl, imageUrls: current.imageUrls };

  requireMinExperienceImages(gallery);

  const experience = await prisma.experience.update({
    where: { id },
    data: hasGalleryUpdate ? { ...data, imageUrl: gallery.imageUrl, imageUrls: gallery.imageUrls } : data,
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_UPDATE",
    entity: "Experience",
    entityId: experience.id,
  });

  return experience;
}

export async function submitExperienceForReview(actor: AuthUser, id: string) {
  const current = await getExperience(id, { actor });
  if (current.createdBy !== actor.id && !canReviewExperiences(actor)) {
    throw ApiError.forbidden("No puedes enviar esta experiencia a revisión");
  }
  if (current.status === "PUBLISHED") {
    throw ApiError.badRequest("Esta experiencia ya está publicada");
  }
  if (current.status === "ARCHIVED") {
    throw ApiError.badRequest("Reactiva esta experiencia desde Cambiar estado; no la envíes a revisión");
  }
  if (current.status === "PENDING") {
    return current;
  }
  if (current.status !== "REJECTED" && current.status !== "DRAFT") {
    throw ApiError.badRequest("Esta experiencia no se puede enviar a revisión");
  }

  requirePublishFields(current, current.location);

  const experience = await prisma.experience.update({
    where: { id },
    data: {
      status: "PENDING",
      submittedAt: new Date(),
      rejectionReason: null,
      reviewedAt: null,
      reviewedById: null,
    },
    include: experienceInclude,
  });

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_SUBMIT",
    entity: "Experience",
    entityId: experience.id,
  });
  await notifyExperienceSubmitted({
    experienceId: experience.id,
    title: experience.title,
    creatorId: experience.createdBy,
    creatorName: experience.creator.name,
  });

  return experience;
}

export async function approveExperience(actor: AuthUser, id: string) {
  if (!canReviewExperiences(actor)) {
    throw ApiError.forbidden("No tienes permiso para aprobar experiencias");
  }
  const current = await getExperience(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden aprobar experiencias pendientes de revisión");
  }

  requirePublishFields(current, current.location);

  const reviewedAt = new Date();
  const [experience] = await prisma.$transaction([
    prisma.experience.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        rejectionReason: null,
        reviewedAt,
        reviewedById: actor.id,
      },
      include: experienceInclude,
    }),
    prisma.experienceReview.create({
      data: {
        experienceId: id,
        reviewerId: actor.id,
        decision: "APPROVED",
      },
    }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_APPROVE",
    entity: "Experience",
    entityId: experience.id,
  });
  if (experience.createdBy !== actor.id) {
    await notifyExperienceApproved({
      experienceId: experience.id,
      title: experience.title,
      creatorId: experience.createdBy,
    });
  }

  return experience;
}

export async function rejectExperience(actor: AuthUser, id: string, reason: string) {
  if (!canReviewExperiences(actor)) {
    throw ApiError.forbidden("No tienes permiso para rechazar experiencias");
  }
  const trimmed = reason.trim();
  if (trimmed.length < 8) {
    throw ApiError.unprocessable("El motivo del rechazo es obligatorio");
  }
  const current = await getExperience(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden rechazar experiencias pendientes de revisión");
  }

  const reviewedAt = new Date();
  const [experience] = await prisma.$transaction([
    prisma.experience.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: trimmed,
        reviewedAt,
        reviewedById: actor.id,
      },
      include: experienceInclude,
    }),
    prisma.experienceReview.create({
      data: {
        experienceId: id,
        reviewerId: actor.id,
        decision: "REJECTED",
        reason: trimmed,
      },
    }),
  ]);

  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_REJECT",
    entity: "Experience",
    entityId: experience.id,
  });
  if (experience.createdBy !== actor.id) {
    await notifyExperienceRejected({
      experienceId: experience.id,
      title: experience.title,
      creatorId: experience.createdBy,
      reason: trimmed,
    });
  }

  return experience;
}

export async function changeExperienceStatus(actor: AuthUser, id: string, status: ExperienceStatus) {
  if (status === "REJECTED") {
    throw ApiError.forbidden("Para rechazar una experiencia debes indicar un motivo");
  }
  if (status === "PENDING") {
    return submitExperienceForReview(actor, id);
  }
  if (status === "PUBLISHED" || status === "ARCHIVED") {
    const current = await getExperience(id, { actor });
    if (current.status !== "PUBLISHED" && current.status !== "ARCHIVED") {
      if (status === "PUBLISHED") {
        throw ApiError.forbidden("Las experiencias se publican al aprobarlas, no cambiando el estado manualmente");
      }
      throw ApiError.badRequest("Solo se puede desactivar una experiencia ya publicada");
    }
    if (!canManageAvailability(actor, current)) {
      throw ApiError.forbidden("No puedes cambiar la disponibilidad de esta experiencia");
    }
    if (status === current.status) {
      return current;
    }
    if (status === "PUBLISHED") {
      requirePublishFields(current, current.location);
      const experience = await prisma.experience.update({
        where: { id },
        data: { status: "PUBLISHED" },
        include: experienceInclude,
      });
      await recordAudit({
        userId: actor.id,
        action: "EXPERIENCE_STATUS_RESTORED",
        entity: "Experience",
        entityId: experience.id,
      });
      return experience;
    }
    const experience = await prisma.experience.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: experienceInclude,
    });
    await recordAudit({
      userId: actor.id,
      action: "EXPERIENCE_STATUS_ARCHIVED",
      entity: "Experience",
      entityId: experience.id,
    });
    return experience;
  }
  throw ApiError.badRequest("Estado no permitido");
}

export async function deleteExperience(actor: AuthUser, id: string) {
  const current = await getExperience(id, { actor });
  if (!canReviewExperiences(actor) && current.status === "PUBLISHED") {
    throw ApiError.forbidden("No puedes eliminar una experiencia publicada");
  }
  await prisma.experience.delete({ where: { id } });
  await recordAudit({
    userId: actor.id,
    action: "EXPERIENCE_DELETE",
    entity: "Experience",
    entityId: id,
  });
}
