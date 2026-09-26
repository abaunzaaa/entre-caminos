import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";

const DEFAULT_FOLDERS = [
  { name: "Mis planes", icon: "folder" },
  { name: "Destinos", icon: "map" },
  { name: "Experiencias favoritas", icon: "heart" },
  { name: "Ideas de viaje", icon: "plane" },
];

export type SerializedFolder = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  createdAt: string;
};

function serialize(folder: {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  createdAt: Date;
}): SerializedFolder {
  return {
    id: folder.id,
    userId: folder.userId,
    name: folder.name,
    icon: folder.icon,
    createdAt: folder.createdAt.toISOString(),
  };
}

async function ownedFolder(userId: string, id: string) {
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) {
    throw ApiError.notFound("Carpeta no encontrada");
  }
  return folder;
}

export async function listFolders(userId: string) {
  let folders = await prisma.folder.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!folders.length) {
    await prisma.folder.createMany({
      data: DEFAULT_FOLDERS.map((item) => ({ userId, name: item.name, icon: item.icon })),
    });
    folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }
  return folders.map(serialize);
}

export async function createFolder(userId: string, input: { name: string; icon?: string }) {
  const count = await prisma.folder.count({ where: { userId } });
  if (count >= 16) {
    throw ApiError.badRequest("Puedes crear hasta 16 carpetas");
  }
  const folder = await prisma.folder.create({
    data: {
      userId,
      name: input.name.trim() || "Nueva carpeta",
      icon: input.icon?.trim() || "folder",
    },
  });
  return serialize(folder);
}

export async function updateFolder(userId: string, id: string, input: { name?: string; icon?: string }) {
  await ownedFolder(userId, id);
  const folder = await prisma.folder.update({
    where: { id },
    data: {
      name: input.name?.trim() || undefined,
      icon: input.icon?.trim() || undefined,
    },
  });
  return serialize(folder);
}

export async function deleteFolder(userId: string, id: string) {
  await ownedFolder(userId, id);
  await prisma.conversation.updateMany({
    where: { userId, folderId: id },
    data: { folderId: null },
  });
  await prisma.folder.delete({ where: { id } });
}

export async function assertOwnedFolder(userId: string, folderId: string) {
  await ownedFolder(userId, folderId);
}
