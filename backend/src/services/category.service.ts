import type { CategoryStatus, Prisma } from "@prisma/client";
import { normalizeCategoryIcon } from "../config/category-icons.js";
import { prisma } from "../database/prisma.js";
import type { AuthUser } from "../models/auth-user.js";
import { ApiError } from "../utils/api-error.js";
import { isSuperAdmin } from "../utils/permissions.js";
import { recordAudit } from "./audit.service.js";
import { notifyCategoryApproved, notifyCategoryRejected, notifyCategorySubmitted } from "./notification.service.js";

async function findOwnedCategoryIds(userId: string) {
  const rows = await prisma.auditLog.findMany({
    where: { userId, action: "CATEGORY_CREATE", entity: "Category" },
    select: { entityId: true },
    distinct: ["entityId"],
  });
  return rows.map((row) => row.entityId);
}

export async function listCategories(options?: {
  includeHidden?: boolean;
  take?: number;
  viewer?: AuthUser;
}) {
  const approvedOnly = !options?.includeHidden;
  const viewer = options?.viewer;
  const restrictToOwner = Boolean(viewer && !isSuperAdmin(viewer) && !approvedOnly);
  const ownedIds = restrictToOwner ? await findOwnedCategoryIds(viewer!.id) : [];

  let where: Prisma.CategoryWhereInput | undefined;
  if (approvedOnly) {
    where = { status: "APPROVED" };
  } else if (restrictToOwner) {
    where = {
      OR: [
        { status: "APPROVED" },
        ...(ownedIds.length ? [{ id: { in: ownedIds } }] : []),
      ],
    };
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      _count: {
        select: {
          experiences: approvedOnly ? { where: { status: "PUBLISHED" } } : true,
        },
      },
    },
    orderBy: options?.take ? { createdAt: "desc" } : { name: "asc" },
    take: options?.take,
  });

  if (!restrictToOwner) {
    return categories;
  }

  const owned = new Set(ownedIds);
  return categories.map((category) => {
    if (owned.has(category.id)) {
      return category;
    }
    return { ...category, rejectionReason: null };
  });
}

export async function getCategory(id: string, options?: { approvedOnly?: boolean }) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          experiences: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  if (!category || (options?.approvedOnly && category.status !== "APPROVED")) {
    throw ApiError.notFound("Categoría no encontrada");
  }

  return category;
}

export async function createCategory(
  actor: AuthUser,
  input: { name: string; description?: string; icon?: string },
) {
  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) {
    throw ApiError.conflict("Ya existe una categoría con ese nombre");
  }

  const approved = isSuperAdmin(actor);
  const now = approved ? new Date() : null;
  const category = await prisma.category.create({
    data: {
      name: input.name,
      description: input.description || null,
      icon: normalizeCategoryIcon(input.icon),
      status: approved ? "APPROVED" : "PENDING",
      rejectionReason: null,
      reviewedAt: now,
      reviewedById: approved ? actor.id : null,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "CATEGORY_CREATE",
    entity: "Category",
    entityId: category.id,
  });

  if (!approved) {
    await notifyCategorySubmitted({
      categoryId: category.id,
      name: category.name,
      creatorId: actor.id,
    });
  }

  return category;
}

export async function updateCategory(
  actor: AuthUser,
  id: string,
  input: { name?: string; description?: string; icon?: string; status?: CategoryStatus },
) {
  if (!isSuperAdmin(actor)) {
    throw ApiError.forbidden("Solo un super administrador puede editar categorías");
  }

  await getCategory(id);

  if (input.name) {
    const clash = await prisma.category.findFirst({
      where: { name: input.name, NOT: { id } },
    });
    if (clash) {
      throw ApiError.conflict("Ya existe una categoría con ese nombre");
    }
  }

  const statusPatch =
    input.status && isSuperAdmin(actor)
      ? {
          status: input.status,
          rejectionReason: input.status === "REJECTED" ? undefined : null,
          reviewedAt: new Date(),
          reviewedById: actor.id,
        }
      : {};

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description === "" ? null : input.description,
      icon: input.icon === undefined ? undefined : normalizeCategoryIcon(input.icon),
      ...statusPatch,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "CATEGORY_UPDATE",
    entity: "Category",
    entityId: category.id,
  });

  return category;
}

async function findCategoryCreatorId(categoryId: string) {
  const log = await prisma.auditLog.findFirst({
    where: { action: "CATEGORY_CREATE", entity: "Category", entityId: categoryId },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  return log?.userId ?? null;
}

export async function approveCategory(actor: AuthUser, id: string) {
  if (!isSuperAdmin(actor)) {
    throw ApiError.forbidden("Solo un super administrador puede aprobar categorías");
  }
  const current = await getCategory(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden aprobar categorías pendientes de revisión");
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      status: "APPROVED",
      rejectionReason: null,
      reviewedAt: new Date(),
      reviewedById: actor.id,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "CATEGORY_APPROVE",
    entity: "Category",
    entityId: category.id,
  });

  const creatorId = await findCategoryCreatorId(category.id);
  if (creatorId && creatorId !== actor.id) {
    await notifyCategoryApproved({
      categoryId: category.id,
      name: category.name,
      creatorId,
    });
  }

  return category;
}

export async function rejectCategory(actor: AuthUser, id: string, reason: string) {
  if (!isSuperAdmin(actor)) {
    throw ApiError.forbidden("Solo un super administrador puede rechazar categorías");
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    throw ApiError.unprocessable("Debes ingresar un motivo para rechazar la categoría.");
  }
  const current = await getCategory(id);
  if (current.status !== "PENDING") {
    throw ApiError.badRequest("Solo se pueden rechazar categorías pendientes de revisión");
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason: trimmed,
      reviewedAt: new Date(),
      reviewedById: actor.id,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "CATEGORY_REJECT",
    entity: "Category",
    entityId: category.id,
  });

  const creatorId = await findCategoryCreatorId(category.id);
  if (creatorId && creatorId !== actor.id) {
    await notifyCategoryRejected({
      categoryId: category.id,
      name: category.name,
      creatorId,
      reason: trimmed,
    });
  }

  return category;
}

export async function deleteCategory(actor: AuthUser, id: string) {
  if (!isSuperAdmin(actor)) {
    throw ApiError.forbidden("Solo un super administrador puede eliminar categorías");
  }
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { experiences: true } } },
  });

  if (!category) {
    throw ApiError.notFound("Categoría no encontrada");
  }

  if (category._count.experiences > 0) {
    throw ApiError.forbidden(
      "Las categorías con experiencias asociadas no pueden eliminarse.",
    );
  }

  await prisma.category.delete({ where: { id } });
  await recordAudit({
    userId: actor.id,
    action: "CATEGORY_DELETE",
    entity: "Category",
    entityId: id,
  });
}
