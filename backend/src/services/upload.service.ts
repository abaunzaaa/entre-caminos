import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");
const avatarsDir = path.join(uploadsDir, "avatars");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type StoredImage = {
  url: string;
  publicId: string | null;
};

function assertImageFile(file: Express.Multer.File) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw ApiError.badRequest("Formato de imagen no permitido. Usa JPG, PNG o WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw ApiError.badRequest("La imagen no puede superar 5 MB.");
  }
}

function cloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

export function isRemoteAvatarUrl(value: string) {
  return /^https:\/\//i.test(value);
}

export async function persistUserAvatar(userId: string, dataUrl: string): Promise<string> {
  if (isRemoteAvatarUrl(dataUrl)) {
    return dataUrl;
  }

  if (dataUrl.startsWith("/uploads/avatars/")) {
    const filename = path.basename(dataUrl);
    try {
      const buffer = await fs.readFile(path.join(avatarsDir, filename));
      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch {
      throw ApiError.badRequest("La foto de perfil no está disponible. Súbela de nuevo.");
    }
  }

  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw ApiError.badRequest("La foto de perfil no es válida.");
  }

  const kind = match[1].toLowerCase();
  const mime = kind === "png" ? "image/png" : kind === "webp" ? "image/webp" : "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (buffer.length < 24) {
    throw ApiError.badRequest("La foto de perfil no es válida.");
  }
  if (buffer.length > 500_000) {
    throw ApiError.badRequest("La foto de perfil es demasiado pesada.");
  }

  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    const stored = await uploadToCloudinary({
      buffer,
      originalname: `avatar-${userId}.${ext}`,
      mimetype: mime,
      size: buffer.length,
    } as Express.Multer.File);
    return stored.url;
  }

  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function removeUserAvatarFiles(userId: string) {
  try {
    const files = await fs.readdir(avatarsDir);
    await Promise.all(
      files
        .filter((file) => file.startsWith(`${userId}-`))
        .map((file) => fs.unlink(path.join(avatarsDir, file)).catch(() => undefined)),
    );
  } catch {
    /* directory may not exist yet */
  }
}

export async function persistExperienceImage(file?: Express.Multer.File): Promise<string | null> {
  if (!file) {
    return null;
  }
  const stored = await persistImage(file);
  return stored.url;
}

export async function persistProfileImage(file: Express.Multer.File): Promise<StoredImage> {
  return persistImage(file, "entre-caminos/profiles");
}

async function persistImage(file: Express.Multer.File, folder?: string): Promise<StoredImage> {
  assertImageFile(file);
  if (cloudinaryConfigured()) {
    return uploadToCloudinary(file, folder);
  }
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  await fs.writeFile(path.join(uploadsDir, filename), file.buffer);
  return { url: `/uploads/${filename}`, publicId: `local:${filename}` };
}

async function uploadToCloudinary(file: Express.Multer.File, folder?: string): Promise<StoredImage> {
  const timestamp = Math.floor(Date.now() / 1000);
  const { createHash } = await import("node:crypto");
  const params = folder ? `folder=${folder}&timestamp=${timestamp}` : `timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${params}${env.CLOUDINARY_API_SECRET}`).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file.buffer)]), file.originalname);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  if (folder) {
    form.append("folder", folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    throw ApiError.badRequest("No se pudo subir la imagen a Cloudinary");
  }

  const data = (await response.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url) {
    throw ApiError.badRequest("Cloudinary no devolvió una URL");
  }
  return { url: data.secure_url, publicId: data.public_id ?? null };
}

export async function destroyStoredImage(publicId: string | null | undefined) {
  if (!publicId) {
    return;
  }
  if (publicId.startsWith("local:")) {
    const filename = publicId.slice("local:".length);
    await fs.unlink(path.join(uploadsDir, filename)).catch(() => undefined);
    return;
  }
  if (!cloudinaryConfigured()) {
    return;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const { createHash } = await import("node:crypto");
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
    .digest("hex");
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: "POST",
    body: form,
  }).catch(() => undefined);
}
