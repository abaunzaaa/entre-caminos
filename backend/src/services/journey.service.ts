import type { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import {
  assertMemoryAttendance,
  clampPercent,
  isJourneyBackground,
  isJourneySticker,
  isJourneyTheme,
  type JourneyBackground,
  type JourneyTheme,
} from "../utils/journey-rules.js";
import { destroyStoredImage, persistJourneyPhoto } from "./upload.service.js";

const PLAN_LIMIT = 400;
const DECORATION_LIMIT = 40;
const MEMORY_LIMIT = 200;
const PHOTO_LIMIT = 8;
const STICKER_LIMIT = 12;

const experienceCard = {
  id: true,
  title: true,
  imageUrl: true,
  location: true,
  status: true,
  description: true,
  category: { select: { name: true } },
} satisfies Prisma.ExperienceSelect;

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function serializePlan(row: {
  id: string;
  plannedAt: Date;
  experience: {
    id: string;
    title: string;
    imageUrl: string | null;
    location: string;
    status: string;
    description: string;
    category: { name: string } | null;
  };
}) {
  return {
    id: row.id,
    plannedAt: row.plannedAt.toISOString(),
    experience: {
      id: row.experience.id,
      title: row.experience.title,
      imageUrl: row.experience.imageUrl,
      location: row.experience.location,
      description: row.experience.description,
      status: row.experience.status,
      category: row.experience.category?.name ?? "",
    },
  };
}

function serializeMemory(row: {
  id: string;
  title: string;
  happenedOn: Date;
  story: string;
  background: string;
  attended: boolean;
  planId: string | null;
  experience: { id: string; title: string; imageUrl: string | null; location: string } | null;
  photos: Array<{ id: string; url: string; sortOrder: number }>;
  stickers: Array<{ id: string; stickerKey: string; x: number; y: number; rotation: number }>;
}) {
  return {
    id: row.id,
    title: row.title,
    happenedOn: dateOnly(row.happenedOn),
    story: row.story,
    background: row.background,
    attended: row.attended,
    planId: row.planId,
    experience: row.experience
      ? {
          id: row.experience.id,
          title: row.experience.title,
          imageUrl: row.experience.imageUrl,
          location: row.experience.location,
        }
      : null,
    photos: row.photos.map((photo) => ({ id: photo.id, url: photo.url, sortOrder: photo.sortOrder })),
    stickers: row.stickers,
  };
}

const memoryInclude = {
  experience: { select: { id: true, title: true, imageUrl: true, location: true } },
  photos: { orderBy: { sortOrder: "asc" as const } },
  stickers: { orderBy: { id: "asc" as const } },
} satisfies Prisma.JourneyMemoryInclude;

function parseWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest("Elige una fecha y una hora válidas.");
  }
  const year = date.getUTCFullYear();
  if (year < 2020 || year > 2036) {
    throw ApiError.badRequest("La fecha queda fuera del calendario disponible.");
  }
  return date;
}

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw ApiError.badRequest("Elige una fecha válida.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw ApiError.badRequest("Elige una fecha válida.");
  }
  return date;
}

async function publishedExperience(experienceId: string) {
  const experience = await prisma.experience.findFirst({
    where: { id: experienceId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!experience) {
    throw ApiError.badRequest("Esa experiencia no está disponible para agregarla.");
  }
  return experience;
}

export async function loadJourney(userId: string) {
  const [board, plans, decorations, memories] = await Promise.all([
    prisma.journeyBoard.findUnique({ where: { userId } }),
    prisma.journeyPlan.findMany({
      where: { userId },
      orderBy: { plannedAt: "asc" },
      take: PLAN_LIMIT,
      include: { experience: { select: experienceCard } },
    }),
    prisma.journeyDecoration.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: DECORATION_LIMIT,
    }),
    prisma.journeyMemory.findMany({
      where: { userId },
      orderBy: { happenedOn: "desc" },
      take: MEMORY_LIMIT,
      include: memoryInclude,
    }),
  ]);

  return {
    board: { theme: board?.theme && isJourneyTheme(board.theme) ? board.theme : "olive" },
    plans: plans.map(serializePlan),
    decorations: decorations.map((item) => ({
      id: item.id,
      kind: item.kind,
      stickerKey: item.stickerKey,
      text: item.text,
      color: item.color,
      day: item.day,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
    })),
    memories: memories.map(serializeMemory),
  };
}

export async function searchJourneyCatalog(query: string) {
  const q = query.trim();
  const rows = await prisma.experience.findMany({
    where: {
      status: "PUBLISHED",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { title: "asc" },
    take: 8,
    select: experienceCard,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.imageUrl,
    location: row.location,
    description: row.description,
    category: row.category?.name ?? "",
  }));
}

export async function createPlan(userId: string, experienceId: string, plannedAt: string) {
  await publishedExperience(experienceId);
  const count = await prisma.journeyPlan.count({ where: { userId } });
  if (count >= PLAN_LIMIT) {
    throw ApiError.badRequest("Tu calendario ya tiene el máximo de planes.");
  }
  const created = await prisma.journeyPlan.create({
    data: { userId, experienceId, plannedAt: parseWhen(plannedAt) },
    include: { experience: { select: experienceCard } },
  });
  return serializePlan(created);
}

export async function updatePlan(userId: string, planId: string, plannedAt: string) {
  const existing = await prisma.journeyPlan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese plan.");
  }
  const updated = await prisma.journeyPlan.update({
    where: { id: planId },
    data: { plannedAt: parseWhen(plannedAt) },
    include: { experience: { select: experienceCard } },
  });
  return serializePlan(updated);
}

export async function deletePlan(userId: string, planId: string) {
  const existing = await prisma.journeyPlan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese plan.");
  }
  await prisma.journeyPlan.delete({ where: { id: planId } });
}

export async function saveTheme(userId: string, theme: string) {
  if (!isJourneyTheme(theme)) {
    throw ApiError.badRequest("Elige un estilo del planner.");
  }
  const saved: JourneyTheme = theme;
  await prisma.journeyBoard.upsert({
    where: { userId },
    create: { userId, theme: saved },
    update: { theme: saved },
  });
  return { theme: saved };
}

type DecorationInput = {
  kind: "sticker" | "note";
  stickerKey?: string | null;
  text?: string | null;
  color?: string | null;
  day?: string | null;
  x?: number;
  y?: number;
  rotation?: number;
};

function decorationData(input: DecorationInput) {
  if (input.kind === "sticker") {
    if (!input.stickerKey || !isJourneySticker(input.stickerKey)) {
      throw ApiError.badRequest("Elige un sticker del planner.");
    }
  }
  const text = input.text?.trim() ?? "";
  if (input.kind === "note" && !text) {
    throw ApiError.badRequest("Escribe la nota antes de guardarla.");
  }
  if (text.length > 280) {
    throw ApiError.badRequest("La nota puede tener hasta 280 caracteres.");
  }
  if (input.day && !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) {
    throw ApiError.badRequest("La fecha de la nota no es válida.");
  }
  return {
    kind: input.kind,
    stickerKey: input.kind === "sticker" ? input.stickerKey : null,
    text: input.kind === "note" ? text : null,
    color: input.color?.trim() || null,
    day: input.day || null,
    x: clampPercent(input.x ?? 18),
    y: clampPercent(input.y ?? 18),
    rotation: Number.isFinite(input.rotation) ? Math.max(-35, Math.min(35, input.rotation ?? 0)) : 0,
  };
}

export async function createDecoration(userId: string, input: DecorationInput) {
  const count = await prisma.journeyDecoration.count({ where: { userId } });
  if (count >= DECORATION_LIMIT) {
    throw ApiError.badRequest("Ya llegaste al máximo de decoraciones del planner.");
  }
  const created = await prisma.journeyDecoration.create({
    data: { userId, ...decorationData(input) },
  });
  return created;
}

export async function updateDecoration(userId: string, decorationId: string, input: Partial<DecorationInput>) {
  const existing = await prisma.journeyDecoration.findFirst({ where: { id: decorationId, userId } });
  if (!existing) {
    throw ApiError.notFound("No encontramos esa decoración.");
  }
  const next = decorationData({
    kind: input.kind ?? (existing.kind === "note" ? "note" : "sticker"),
    stickerKey: input.stickerKey === undefined ? existing.stickerKey : input.stickerKey,
    text: input.text === undefined ? existing.text : input.text,
    color: input.color === undefined ? existing.color : input.color,
    day: input.day === undefined ? existing.day : input.day,
    x: input.x ?? existing.x,
    y: input.y ?? existing.y,
    rotation: input.rotation ?? existing.rotation,
  });
  return prisma.journeyDecoration.update({ where: { id: decorationId }, data: next });
}

export async function deleteDecoration(userId: string, decorationId: string) {
  const existing = await prisma.journeyDecoration.findFirst({
    where: { id: decorationId, userId },
    select: { id: true },
  });
  if (!existing) {
    throw ApiError.notFound("No encontramos esa decoración.");
  }
  await prisma.journeyDecoration.delete({ where: { id: decorationId } });
}

type MemoryInput = {
  title: string;
  happenedOn: string;
  story?: string;
  background?: string;
  experienceId?: string | null;
  planId?: string | null;
  attended?: boolean;
};

async function memoryPayload(userId: string, input: MemoryInput, currentPlanId?: string | null) {
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) {
    throw ApiError.badRequest("El título del recuerdo necesita entre 2 y 120 caracteres.");
  }
  const story = (input.story ?? "").trim();
  if (story.length > 4000) {
    throw ApiError.badRequest("La historia puede tener hasta 4000 caracteres.");
  }
  const background: JourneyBackground =
    input.background && isJourneyBackground(input.background) ? input.background : "cream";
  const experienceId = input.experienceId?.trim() || null;
  const planId = input.planId?.trim() || null;
  const attended = Boolean(input.attended);
  const attendanceError = assertMemoryAttendance({ experienceId, planId, attended });
  if (attendanceError) {
    throw ApiError.badRequest(attendanceError);
  }
  if (experienceId) {
    await publishedExperience(experienceId);
  }
  if (planId) {
    const plan = await prisma.journeyPlan.findFirst({
      where: { id: planId, userId },
      select: { id: true, experienceId: true },
    });
    if (!plan) {
      throw ApiError.badRequest("Ese plan no está en tu calendario.");
    }
    if (experienceId && experienceId !== plan.experienceId) {
      throw ApiError.badRequest("El recuerdo debe corresponder a la experiencia del plan.");
    }
    if (currentPlanId !== planId) {
      const taken = await prisma.journeyMemory.findFirst({
        where: { planId, userId },
        select: { id: true },
      });
      if (taken) {
        throw ApiError.conflict("Ya guardaste un recuerdo de este plan.");
      }
    }
  }
  return {
    title,
    happenedOn: parseDay(input.happenedOn),
    story,
    background,
    experienceId: experienceId ?? undefined,
    planId,
    attended,
  };
}

export async function createMemory(userId: string, input: MemoryInput) {
  const count = await prisma.journeyMemory.count({ where: { userId } });
  if (count >= MEMORY_LIMIT) {
    throw ApiError.badRequest("Tu bitácora ya tiene el máximo de recuerdos.");
  }
  const data = await memoryPayload(userId, input);
  const created = await prisma.journeyMemory.create({
    data: { userId, ...data, experienceId: data.experienceId ?? null },
    include: memoryInclude,
  });
  return serializeMemory(created);
}

export async function updateMemory(userId: string, memoryId: string, input: MemoryInput) {
  const existing = await prisma.journeyMemory.findFirst({
    where: { id: memoryId, userId },
    select: { id: true, planId: true },
  });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese recuerdo.");
  }
  const data = await memoryPayload(userId, input, existing.planId);
  const updated = await prisma.journeyMemory.update({
    where: { id: memoryId },
    data: { ...data, experienceId: data.experienceId ?? null },
    include: memoryInclude,
  });
  return serializeMemory(updated);
}

export async function deleteMemory(userId: string, memoryId: string) {
  const existing = await prisma.journeyMemory.findFirst({
    where: { id: memoryId, userId },
    include: { photos: true },
  });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese recuerdo.");
  }
  await prisma.journeyMemory.delete({ where: { id: memoryId } });
  await Promise.all(existing.photos.map((photo) => destroyStoredImage(photo.publicId)));
}

export async function addMemoryPhoto(userId: string, memoryId: string, file: Express.Multer.File) {
  const memory = await prisma.journeyMemory.findFirst({
    where: { id: memoryId, userId },
    include: { photos: { select: { id: true, sortOrder: true } } },
  });
  if (!memory) {
    throw ApiError.notFound("No encontramos ese recuerdo.");
  }
  if (memory.photos.length >= PHOTO_LIMIT) {
    throw ApiError.badRequest("Este recuerdo ya tiene el máximo de fotografías.");
  }
  const stored = await persistJourneyPhoto(file);
  const sortOrder = memory.photos.reduce((max, photo) => Math.max(max, photo.sortOrder), 0) + 1;
  const photo = await prisma.journeyMemoryPhoto.create({
    data: { memoryId, url: stored.url, publicId: stored.publicId, sortOrder },
  });
  return { id: photo.id, url: photo.url, sortOrder: photo.sortOrder };
}

export async function deleteMemoryPhoto(userId: string, memoryId: string, photoId: string) {
  const photo = await prisma.journeyMemoryPhoto.findFirst({
    where: { id: photoId, memoryId, memory: { userId } },
  });
  if (!photo) {
    throw ApiError.notFound("No encontramos esa fotografía.");
  }
  await prisma.journeyMemoryPhoto.delete({ where: { id: photoId } });
  await destroyStoredImage(photo.publicId);
}

type StickerInput = { stickerKey: string; x?: number; y?: number; rotation?: number };

function stickerData(input: StickerInput) {
  if (!isJourneySticker(input.stickerKey)) {
    throw ApiError.badRequest("Elige un sticker del álbum.");
  }
  return {
    stickerKey: input.stickerKey,
    x: clampPercent(input.x ?? 22),
    y: clampPercent(input.y ?? 22),
    rotation: Number.isFinite(input.rotation) ? Math.max(-35, Math.min(35, input.rotation ?? -6)) : -6,
  };
}

export async function addMemorySticker(userId: string, memoryId: string, input: StickerInput) {
  const memory = await prisma.journeyMemory.findFirst({
    where: { id: memoryId, userId },
    include: { _count: { select: { stickers: true } } },
  });
  if (!memory) {
    throw ApiError.notFound("No encontramos ese recuerdo.");
  }
  if (memory._count.stickers >= STICKER_LIMIT) {
    throw ApiError.badRequest("Este recuerdo ya tiene el máximo de stickers.");
  }
  return prisma.journeyMemorySticker.create({
    data: { memoryId, ...stickerData(input) },
  });
}

export async function updateMemorySticker(userId: string, memoryId: string, stickerId: string, input: StickerInput) {
  const existing = await prisma.journeyMemorySticker.findFirst({
    where: { id: stickerId, memoryId, memory: { userId } },
  });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese sticker.");
  }
  return prisma.journeyMemorySticker.update({
    where: { id: stickerId },
    data: stickerData(input),
  });
}

export async function deleteMemorySticker(userId: string, memoryId: string, stickerId: string) {
  const existing = await prisma.journeyMemorySticker.findFirst({
    where: { id: stickerId, memoryId, memory: { userId } },
    select: { id: true },
  });
  if (!existing) {
    throw ApiError.notFound("No encontramos ese sticker.");
  }
  await prisma.journeyMemorySticker.delete({ where: { id: stickerId } });
}
