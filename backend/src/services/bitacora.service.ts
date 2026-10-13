import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { persistBitacoraPhoto, destroyStoredImage } from "./upload.service.js";
import { ApiError } from "../utils/api-error.js";
import { bitacoraElementSchema, type SaveBitacoraInput } from "../validators/bitacora.validator.js";

const pageSelect = {
  id: true,
  sortOrder: true,
  background: true,
  elements: true,
  experienceId: true,
} satisfies Prisma.BitacoraPageSelect;

function sanitizeElements(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return [];
  }
  const elements = [];
  for (const entry of value) {
    const parsed = bitacoraElementSchema.safeParse(entry);
    if (parsed.success) {
      elements.push(parsed.data);
    }
  }
  return elements;
}

async function ensureBitacora(userId: string) {
  return prisma.bitacora.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function loadBitacora(userId: string) {
  const bitacora = await ensureBitacora(userId);
  const [pages, assets] = await Promise.all([
    prisma.bitacoraPage.findMany({
      where: { bitacoraId: bitacora.id },
      orderBy: { sortOrder: "asc" },
      select: pageSelect,
    }),
    prisma.bitacoraAsset.findMany({
      where: { bitacoraId: bitacora.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true },
    }),
  ]);

  return {
    bitacora: { id: bitacora.id, updatedAt: bitacora.updatedAt.toISOString() },
    pages: pages.map((page) => ({
      id: page.id,
      background: page.background,
      experienceId: page.experienceId,
      elements: sanitizeElements(page.elements),
    })),
    assets,
  };
}

export async function saveBitacora(userId: string, pages: SaveBitacoraInput["pages"]) {
  const bitacora = await ensureBitacora(userId);
  const assets = await prisma.bitacoraAsset.findMany({
    where: { bitacoraId: bitacora.id },
    select: { id: true, url: true },
  });
  const urls = new Set(assets.map((asset) => asset.url));
  const urlById = new Map(assets.map((asset) => [asset.id, asset.url]));

  const experienceIds = [...new Set(pages.map((page) => page.experienceId).filter((id): id is string => Boolean(id)))];
  if (experienceIds.length) {
    const found = await prisma.experience.findMany({
      where: { id: { in: experienceIds } },
      select: { id: true },
    });
    if (found.length !== experienceIds.length) {
      throw ApiError.badRequest("No encontramos una de las experiencias vinculadas.");
    }
  }

  for (const page of pages) {
    for (const element of page.elements) {
      if (element.type !== "photo" || !element.props.url) {
        if (element.type === "photo" && element.props.assetId) {
          throw ApiError.badRequest("La fotografía todavía no tiene archivo.");
        }
        continue;
      }
      if (!urls.has(element.props.url)) {
        throw ApiError.badRequest("Una fotografía no pertenece a tu bitácora.");
      }
      if (element.props.assetId && urlById.get(element.props.assetId) !== element.props.url) {
        throw ApiError.badRequest("La fotografía no coincide con el archivo guardado.");
      }
    }
  }

  const ids = pages.map((page) => page.id);
  const foreign = await prisma.bitacoraPage.findMany({
    where: { id: { in: ids }, bitacoraId: { not: bitacora.id } },
    select: { id: true },
  });
  if (foreign.length) {
    throw ApiError.forbidden("No puedes modificar esas páginas.");
  }

  await prisma.$transaction(async (tx) => {
    if (ids.length === 0) {
      await tx.bitacoraPage.deleteMany({ where: { bitacoraId: bitacora.id } });
    } else {
      await tx.bitacoraPage.deleteMany({
        where: { bitacoraId: bitacora.id, id: { notIn: ids } },
      });
    }

    for (const [index, page] of pages.entries()) {
      const data = {
        sortOrder: index,
        background: page.background,
        experienceId: page.experienceId,
        elements: page.elements as Prisma.InputJsonValue,
      };
      await tx.bitacoraPage.upsert({
        where: { id: page.id },
        create: { id: page.id, bitacoraId: bitacora.id, ...data },
        update: data,
      });
    }

    await tx.bitacora.update({ where: { id: bitacora.id }, data: { updatedAt: new Date() } });
  });

  return loadBitacora(userId);
}

export async function addBitacoraAsset(userId: string, file: Express.Multer.File) {
  const bitacora = await ensureBitacora(userId);
  const count = await prisma.bitacoraAsset.count({ where: { bitacoraId: bitacora.id } });
  if (count >= 80) {
    throw ApiError.badRequest("Llegaste al máximo de fotografías de tu bitácora.");
  }
  const stored = await persistBitacoraPhoto(file);
  const asset = await prisma.bitacoraAsset.create({
    data: {
      bitacoraId: bitacora.id,
      userId,
      url: stored.url,
      publicId: stored.publicId,
    },
    select: { id: true, url: true },
  });
  return asset;
}

export async function deleteBitacoraAsset(userId: string, assetId: string) {
  const asset = await prisma.bitacoraAsset.findFirst({
    where: { id: assetId, userId },
  });
  if (!asset) {
    throw ApiError.notFound("No encontramos esa fotografía.");
  }

  const pages = await prisma.bitacoraPage.findMany({
    where: { bitacoraId: asset.bitacoraId },
    select: { id: true, elements: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const page of pages) {
      const elements = sanitizeElements(page.elements).filter((element) => {
        if (element.type !== "photo") {
          return true;
        }
        return element.props.assetId !== asset.id && element.props.url !== asset.url;
      });
      await tx.bitacoraPage.update({
        where: { id: page.id },
        data: { elements: elements as Prisma.InputJsonValue },
      });
    }
    await tx.bitacoraAsset.delete({ where: { id: asset.id } });
  });

  await destroyStoredImage(asset.publicId);
}
