import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { recordAudit } from "./audit.service.js";

export async function listCategories(options?: { includeInactive?: boolean }) {
  return prisma.category.findMany({
    where: options?.includeInactive ? undefined : { status: "ACTIVE" },
    include: { _count: { select: { experiences: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { experiences: true } } },
  });

  if (!category) {
    throw ApiError.notFound("Categoría no encontrada");
  }

  return category;
}

export async function createCategory(
  actorId: string,
  input: { name: string; description?: string; status?: "ACTIVE" | "INACTIVE" },
) {
  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) {
    throw ApiError.conflict("Ya existe una categoría con ese nombre");
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      description: input.description || null,
      status: input.status ?? "ACTIVE",
    },
  });

  await recordAudit({
    userId: actorId,
    action: "CATEGORY_CREATE",
    entity: "Category",
    entityId: category.id,
  });

  return category;
}

export async function updateCategory(
  actorId: string,
  id: string,
  input: { name?: string; description?: string; status?: "ACTIVE" | "INACTIVE" },
) {
  await getCategory(id);

  if (input.name) {
    const clash = await prisma.category.findFirst({
      where: { name: input.name, NOT: { id } },
    });
    if (clash) {
      throw ApiError.conflict("Ya existe una categoría con ese nombre");
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description === "" ? null : input.description,
      status: input.status,
    },
  });

  await recordAudit({
    userId: actorId,
    action: "CATEGORY_UPDATE",
    entity: "Category",
    entityId: category.id,
  });

  return category;
}

export async function deleteCategory(actorId: string, id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { experiences: true } } },
  });

  if (!category) {
    throw ApiError.notFound("Categoría no encontrada");
  }

  if (category._count.experiences > 0) {
    throw ApiError.conflict(
      "No se puede eliminar una categoría asociada a experiencias. Archívala o reasigna las publicaciones.",
    );
  }

  await prisma.category.delete({ where: { id } });
  await recordAudit({
    userId: actorId,
    action: "CATEGORY_DELETE",
    entity: "Category",
    entityId: id,
  });
}
