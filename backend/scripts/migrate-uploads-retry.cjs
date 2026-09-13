/**
 * Retry migration for remaining /uploads URLs by matching timestamp prefixes
 * when exact filenames differ due to encoding.
 */
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const uploadsDir = path.resolve(__dirname, "../uploads");
const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const key = process.env.CLOUDINARY_API_KEY?.trim();
const secret = process.env.CLOUDINARY_API_SECRET?.trim();

function isLocalUpload(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function listUploadFiles() {
  if (!fs.existsSync(uploadsDir)) return [];
  return fs.readdirSync(uploadsDir).filter((name) => {
    const full = path.join(uploadsDir, name);
    return fs.statSync(full).isFile();
  });
}

function resolveLocalFile(url, files) {
  const basename = path.basename(url);
  const exact = path.join(uploadsDir, basename);
  if (fs.existsSync(exact)) return exact;

  const prefix = basename.match(/^(\d+)-/)?.[1];
  if (prefix) {
    const hit = files.find((name) => name.startsWith(`${prefix}-`));
    if (hit) return path.join(uploadsDir, hit);
  }

  // Try NFC/NFD and common mojibake reverse
  const variants = [basename.normalize("NFC"), basename.normalize("NFD")];
  for (const variant of variants) {
    const candidate = path.join(uploadsDir, variant);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function uploadFile(filePath, folder) {
  const buffer = fs.readFileSync(filePath);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${params}${secret}`).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([buffer]), path.basename(filePath));
  form.append("api_key", key);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }
  return data.secure_url;
}

async function main() {
  const prisma = new PrismaClient();
  const files = listUploadFiles();
  const summary = { remainingBefore: 0, migrated: 0, stillMissing: [], experiencesUpdated: 0 };

  try {
    const experiences = await prisma.experience.findMany({
      select: { id: true, imageUrl: true, imageUrls: true },
    });

    for (const exp of experiences) {
      let changed = false;
      let imageUrl = exp.imageUrl;
      const imageUrls = [...(exp.imageUrls || [])];

      async function fix(url) {
        if (!isLocalUpload(url)) return url;
        summary.remainingBefore += 1;
        const filePath = resolveLocalFile(url, files);
        if (!filePath) {
          summary.stillMissing.push({ experienceId: exp.id, url });
          return url;
        }
        const remote = await uploadFile(filePath, "entre-caminos/experiences");
        summary.migrated += 1;
        changed = true;
        return remote;
      }

      imageUrl = await fix(imageUrl);
      for (let i = 0; i < imageUrls.length; i += 1) {
        imageUrls[i] = await fix(imageUrls[i]);
      }

      if (imageUrls.length) {
        const first = imageUrls.find((u) => u && !isLocalUpload(u));
        if (first && (isLocalUpload(imageUrl) || !imageUrl)) {
          imageUrl = first;
          changed = true;
        }
      }

      if (changed) {
        await prisma.experience.update({
          where: { id: exp.id },
          data: { imageUrl, imageUrls },
        });
        summary.experiencesUpdated += 1;
      }
    }

    const left = await prisma.experience.findMany({ select: { imageUrl: true, imageUrls: true } });
    let remainingLocal = 0;
    for (const row of left) {
      for (const u of [row.imageUrl, ...(row.imageUrls || [])]) {
        if (isLocalUpload(u)) remainingLocal += 1;
      }
    }
    summary.remainingLocalAfter = remainingLocal;
    console.log(JSON.stringify(summary, null, 2));
    if (summary.stillMissing.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
