/**
 * Migrate local /uploads image URLs on experiences (and optional profile images)
 * to Cloudinary, then update Prisma rows.
 *
 * Usage: node scripts/migrate-uploads-to-cloudinary.cjs
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

async function uploadBuffer(buffer, filename, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${params}${secret}`).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);
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
    const msg = data.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return { url: data.secure_url, publicId: data.public_id || null };
}

async function migrateLocalUrl(url, folder) {
  const relative = url.replace(/^\//, ""); // uploads/...
  const filePath = path.resolve(__dirname, "..", relative);
  if (!filePath.startsWith(uploadsDir)) {
    throw new Error(`Path fuera de uploads: ${url}`);
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${url}`);
  }
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  return uploadBuffer(buffer, filename, folder);
}

async function main() {
  if (!cloud || !key || !secret) {
    console.log(JSON.stringify({ ok: false, reason: "missing_cloudinary_env" }));
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const summary = {
    experiencesScanned: 0,
    urlsMigrated: 0,
    urlsSkippedCloud: 0,
    urlsFailed: 0,
    experiencesUpdated: 0,
    profilesUpdated: 0,
    failures: [],
    uploadsDirExists: fs.existsSync(uploadsDir),
    uploadsFileCount: 0,
  };

  try {
    if (summary.uploadsDirExists) {
      summary.uploadsFileCount = fs.readdirSync(uploadsDir).filter((f) => f !== "avatars").length;
    }

    const experiences = await prisma.experience.findMany({
      select: { id: true, title: true, imageUrl: true, imageUrls: true },
    });
    summary.experiencesScanned = experiences.length;

    for (const exp of experiences) {
      let changed = false;
      let nextImageUrl = exp.imageUrl;
      const nextImageUrls = Array.isArray(exp.imageUrls) ? [...exp.imageUrls] : [];

      if (isLocalUpload(exp.imageUrl)) {
        try {
          const stored = await migrateLocalUrl(exp.imageUrl, "entre-caminos/experiences");
          nextImageUrl = stored.url;
          summary.urlsMigrated += 1;
          changed = true;
        } catch (error) {
          summary.urlsFailed += 1;
          summary.failures.push({
            experienceId: exp.id,
            url: exp.imageUrl,
            error: error instanceof Error ? error.message : "error",
          });
        }
      } else if (exp.imageUrl) {
        summary.urlsSkippedCloud += 1;
      }

      for (let i = 0; i < nextImageUrls.length; i += 1) {
        const url = nextImageUrls[i];
        if (!isLocalUpload(url)) {
          if (url) summary.urlsSkippedCloud += 1;
          continue;
        }
        try {
          const stored = await migrateLocalUrl(url, "entre-caminos/experiences");
          nextImageUrls[i] = stored.url;
          summary.urlsMigrated += 1;
          changed = true;
        } catch (error) {
          summary.urlsFailed += 1;
          summary.failures.push({
            experienceId: exp.id,
            url,
            error: error instanceof Error ? error.message : "error",
          });
        }
      }

      // Keep imageUrl aligned with first gallery image when possible
      if (nextImageUrls.length && (!nextImageUrl || isLocalUpload(nextImageUrl))) {
        const firstRemote = nextImageUrls.find((u) => u && !isLocalUpload(u));
        if (firstRemote) {
          nextImageUrl = firstRemote;
          changed = true;
        }
      }

      if (changed) {
        await prisma.experience.update({
          where: { id: exp.id },
          data: { imageUrl: nextImageUrl, imageUrls: nextImageUrls },
        });
        summary.experiencesUpdated += 1;
      }
    }

    const profiles = await prisma.userProfile.findMany({
      where: { profileImageUrl: { startsWith: "/uploads/" } },
      select: { userId: true, profileImageUrl: true },
    });
    for (const profile of profiles) {
      try {
        const stored = await migrateLocalUrl(profile.profileImageUrl, "entre-caminos/profiles");
        await prisma.userProfile.update({
          where: { userId: profile.userId },
          data: {
            profileImageUrl: stored.url,
            profileImagePublicId: stored.publicId,
          },
        });
        summary.profilesUpdated += 1;
        summary.urlsMigrated += 1;
      } catch (error) {
        summary.urlsFailed += 1;
        summary.failures.push({
          profileUserId: profile.userId,
          url: profile.profileImageUrl,
          error: error instanceof Error ? error.message : "error",
        });
      }
    }

    console.log(JSON.stringify({ ok: summary.urlsFailed === 0, ...summary }, null, 2));
    if (summary.urlsFailed > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
