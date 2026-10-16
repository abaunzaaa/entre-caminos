/**
 * Sube las estampitas PNG a Cloudinary sin transformación de calidad
 * y, si hay una única experiencia real, guarda solo stampImageUrl.
 *
 *   cd backend && npx tsx scripts/upload-experience-stamps.ts
 *   cd backend && npx tsx scripts/upload-experience-stamps.ts --apply
 *
 * Sin --apply solo informa coincidencias. No crea experiencias.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env"), override: true });

const STAMP_DIR = path.resolve(here, "../tmp/stamps");
const FOLDER = "entre-caminos/experience-stamps";

const STAMPS: Array<{ code: string; file: string; match: (title: string) => boolean }> = [
  { code: "EXP-001", file: "exp-001-tour-guatape.png", match: (title) => title.includes("guatape") },
  {
    code: "EXP-002",
    file: "exp-002-enigma-escape-room.png",
    match: (title) => title.includes("enigma") || title.includes("escape room"),
  },
  {
    code: "EXP-003",
    file: "exp-003-tour-del-cafe.png",
    match: (title) => title.includes("cafe") && !title.includes("cadmiel"),
  },
  { code: "EXP-004", file: "exp-004-candlelight.png", match: (title) => title.includes("candlelight") },
  { code: "EXP-005", file: "exp-005-carrera-de-las-rosas.png", match: (title) => title.includes("rosas") },
  { code: "EXP-006", file: "exp-006-taller-de-pasta.png", match: (title) => title.includes("pasta") },
  { code: "EXP-007", file: "exp-007-cadmiel-candle-bar.png", match: (title) => title.includes("cadmiel") },
  {
    code: "EXP-008",
    file: "exp-008-taller-de-flores.png",
    match: (title) => title.includes("bouquet") || (title.includes("flores") && !title.includes("silleter")),
  },
  {
    code: "EXP-009",
    file: "exp-009-tour-de-las-abejas.png",
    match: (title) => title.includes("abejas") || title.includes("orimiel"),
  },
  { code: "EXP-010", file: "exp-010-ceramica-artesanal.png", match: (title) => title.includes("ceramica") },
  { code: "EXP-011", file: "exp-011-parapente.png", match: (title) => title.includes("parapente") },
  { code: "EXP-012", file: "exp-012-clase-de-salsa.png", match: (title) => title.includes("salsa") },
  {
    code: "EXP-013",
    file: "exp-013-arte-urbano.png",
    match: (title) => title.includes("graffiti") || title.includes("graffitour") || title.includes("arte urbano"),
  },
  { code: "EXP-014", file: "exp-014-taller-de-chocolate.png", match: (title) => title.includes("chocolate") },
  {
    code: "EXP-015",
    file: "exp-015-parque-arvi.png",
    match: (title) =>
      (title.includes("senderismo") || title.includes("sendero vital")) && !title.includes("aves"),
  },
  {
    code: "EXP-016",
    file: "exp-016-aves-de-montana.png",
    match: (title) => title.includes("aves") || title.includes("avistamiento"),
  },
  { code: "EXP-017", file: "exp-017-silletera.png", match: (title) => title.includes("silleter") },
  { code: "EXP-018", file: "exp-018-cabalgata.png", match: (title) => title.includes("cabalgata") },
  { code: "EXP-019", file: "exp-019-sabaneta-gourmet.png", match: (title) => title.includes("sabaneta") },
];

function normalizeTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function sign(params: Record<string, string>, secret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${serialized}${secret}`).digest("hex");
}

async function uploadOriginalPng(filePath: string, publicId: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const secret = process.env.CLOUDINARY_API_SECRET ?? "";
  if (!cloud || !apiKey || !secret) {
    throw new Error("Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET");
  }

  const buffer = await fs.readFile(filePath);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = {
    invalidate: "true",
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "image/png" }), path.basename(filePath));
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("invalidate", "true");
  form.append("signature", sign(params, secret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    error?: { message?: string };
  };
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || `Cloudinary respondió ${response.status}`);
  }
  if (payload.format !== "png" || payload.width !== 1024 || payload.height !== 1024) {
    throw new Error(
      `Cloudinary alteró ${publicId}: format=${payload.format} ${payload.width}x${payload.height}`,
    );
  }
  return payload;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  try {
    const experiences = await prisma.experience.findMany({
      select: { id: true, title: true, status: true, stampImageUrl: true },
      orderBy: { title: "asc" },
    });
    const normalized = experiences.map((experience) => ({
      ...experience,
      key: normalizeTitle(experience.title),
    }));

    console.log(`Experiencias en la base: ${experiences.length}`);
    for (const experience of experiences) {
      console.log(`- [${experience.status}] ${experience.id} | ${experience.title}`);
    }

    const claimed = new Map<string, string>();
    const plan: Array<{
      code: string;
      file: string;
      experience: (typeof normalized)[number] | null;
      reason: string;
    }> = [];

    for (const stamp of STAMPS) {
      const hits = normalized.filter((experience) => stamp.match(experience.key));
      if (hits.length === 1) {
        const hit = hits[0];
        const previous = claimed.get(hit.id);
        if (previous) {
          plan.push({
            code: stamp.code,
            file: stamp.file,
            experience: null,
            reason: `ambiguo: también coincide con ${previous}`,
          });
          continue;
        }
        claimed.set(hit.id, stamp.code);
        plan.push({ code: stamp.code, file: stamp.file, experience: hit, reason: "unica" });
        continue;
      }
      plan.push({
        code: stamp.code,
        file: stamp.file,
        experience: null,
        reason: hits.length === 0 ? "sin experiencia" : `ambiguo: ${hits.length} coincidencias`,
      });
      if (hits.length > 1) {
        for (const hit of hits) {
          console.log(`  ? ${stamp.code} → ${hit.id} | ${hit.title}`);
        }
      }
    }

    console.log("\nAsociación:");
    for (const item of plan) {
      const target = item.experience ? `${item.experience.id} | ${item.experience.title}` : item.reason;
      console.log(`- ${item.code} ${item.file} → ${target}`);
    }

    if (!apply) {
      console.log("\nDry-run. Nada se subió ni se escribió. Usa --apply para subir y asociar.");
      return;
    }

    for (const item of plan) {
      const filePath = path.join(STAMP_DIR, item.file);
      const publicId = `${FOLDER}/${item.file.replace(/\.png$/i, "")}`;
      const uploaded = await uploadOriginalPng(filePath, publicId);
      console.log(
        `subida ${item.code} ${uploaded.secure_url} bytes=${uploaded.bytes} local=${(await fs.stat(filePath)).size}`,
      );
      if (!item.experience) {
        continue;
      }
      await prisma.experience.update({
        where: { id: item.experience.id },
        data: { stampImageUrl: uploaded.secure_url },
      });
      console.log(`stampImageUrl ${item.code} → ${item.experience.id}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
