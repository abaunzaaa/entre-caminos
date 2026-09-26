/**
 * Recrea el catálogo que el equipo tenía en Explorar (sep 2026).
 * Títulos y fotos salen de la galería local; las imágenes se suben a Cloudinary.
 *
 *   cd backend && npx tsx scripts/restore-catalog.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedCore } from "../prisma/seed.js";
import { prisma } from "../src/database/prisma.js";
import { persistExperienceJpegFromDisk } from "../src/services/upload.service.js";
import { formatDuration } from "../src/utils/experience-duration.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const galleryDir = path.resolve(here, "../../frontend/src/assets/galeria");

function wa(stamp: string) {
  return `WhatsApp Image 2026-09-11 at ${stamp}.jpeg`;
}

function range(base: string, from: number, to: number) {
  const files = [wa(base)];
  for (let i = from; i <= to; i += 1) {
    files.push(wa(`${base} (${i})`));
  }
  return files;
}

const CATEGORIES = [
  { name: "Cultural", description: "Arte, oficios y tradiciones." },
  { name: "Deportivo", description: "Movimiento, rutas y bienestar." },
  { name: "Recreativo", description: "Planes para compartir y desconectar." },
  { name: "Turístico", description: "Recorridos y destinos para descubrir." },
] as const;

type CatalogItem = {
  title: string;
  category: (typeof CATEGORIES)[number]["name"];
  description: string;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  durationValue: number;
  durationUnit: "MINUTES" | "HOURS" | "DAYS";
  howToGetThere: string;
  cover: string;
  files: string[];
};

const CATALOG: CatalogItem[] = [
  {
    title: "Jardines del Belvedere",
    category: "Recreativo",
    description:
      "Recorrido por los jardines, el estanque y los salones de Jardines del Belvedere: un plan al aire libre con rincones para caminar, sentarse y fotografiar.",
    price: 45000,
    location: "El Poblado, Medellín, Antioquia",
    latitude: 6.2089,
    longitude: -75.5674,
    durationValue: 2,
    durationUnit: "HOURS",
    howToGetThere: "Llega a El Poblado; el acceso está señalizado desde la avenida principal del sector.",
    cover: wa("10.22.53 AM (2)"),
    files: [
      wa("10.22.53 AM (2)"),
      ...range("10.22.40 AM", 1, 5),
      wa("10.22.41 AM"),
      wa("10.22.41 AM (1)"),
      wa("10.22.42 AM"),
      wa("10.22.52 AM (6)"),
      wa("10.22.53 AM"),
      wa("10.22.53 AM (1)"),
    ],
  },
  {
    title: "Candlelight: Concierto bajo la luz de las velas",
    category: "Cultural",
    description:
      "Concierto íntimo con piano o cuerdas entre cientos de velas. Un plan nocturno para escuchar música clásica o contemporánea en un salón iluminado solo con cera.",
    price: 120000,
    location: "Medellín, Antioquia",
    latitude: 6.2476,
    longitude: -75.5658,
    durationValue: 90,
    durationUnit: "MINUTES",
    howToGetThere: "El punto exacto se confirma al reservar; suele ser un salón céntrico o en El Poblado.",
    cover: wa("10.22.42 AM (1)"),
    files: [
      wa("10.22.42 AM (1)"),
      wa("10.22.43 AM"),
      wa("10.22.43 AM (1)"),
      wa("10.22.43 AM (2)"),
      wa("10.22.44 AM"),
      wa("10.22.44 AM (1)"),
    ],
  },
  {
    title: "Tour por la Comuna 13",
    category: "Turístico",
    description:
      "Recorrido a pie por la Comuna 13: grafitis, escaleras eléctricas, miradores y la historia de transformación del barrio, con parada en el Cristo y las vistas del valle.",
    price: 80000,
    location: "Comuna 13, Medellín, Antioquia",
    latitude: 6.2486,
    longitude: -75.6214,
    durationValue: 3,
    durationUnit: "HOURS",
    howToGetThere: "Metro hasta San Javier y luego alimentador o taxi hacia las escaleras eléctricas de la Comuna 13.",
    cover: wa("10.22.46 AM"),
    files: range("10.22.46 AM", 1, 5),
  },
  {
    title: "Ruta en bicicleta: Entre cerros y cerámica",
    category: "Deportivo",
    description:
      "Salida en bici entre cerros antioqueños con parada en un taller de cerámica: casco, ruta y una visita al oficio artesanal del oriente cercano.",
    price: 110000,
    location: "El Carmen de Viboral, Antioquia",
    latitude: 6.085,
    longitude: -75.335,
    durationValue: 4,
    durationUnit: "HOURS",
    howToGetThere: "Punto de encuentro en El Carmen de Viboral; lleva ropa cómoda y se entrega casco.",
    cover: wa("10.22.44 AM (4)"),
    files: [wa("10.22.44 AM (4)"), wa("10.22.44 AM (5)"), wa("10.22.45 AM (3)")],
  },
  {
    title: "Taller de cerámica",
    category: "Cultural",
    description:
      "Clase práctica de cerámica: pintar, torno y piezas hechas a mano en taller (El Dorado / Herencia). Te llevas lo que creas o dejas secar según el proceso.",
    price: 70000,
    location: "El Carmen de Viboral, Antioquia",
    latitude: 6.0824,
    longitude: -75.3336,
    durationValue: 2,
    durationUnit: "HOURS",
    howToGetThere: "El taller queda en el casco urbano de El Carmen de Viboral; confirma la dirección al reservar.",
    cover: wa("10.22.48 AM (1)"),
    files: [
      wa("10.22.48 AM (1)"),
      wa("10.22.44 AM (3)"),
      wa("10.22.45 AM"),
      wa("10.22.45 AM (1)"),
      wa("10.22.45 AM (2)"),
      wa("10.22.45 AM (4)"),
      wa("10.22.45 AM (5)"),
      wa("10.22.47 AM (4)"),
      wa("10.22.47 AM (5)"),
    ],
  },
  {
    title: "Cerámicas Esmaltarte",
    category: "Cultural",
    description:
      "Visita al taller de producción: moldes, esmaltado y piezas terminadas de Cerámicas Esmaltarte (y el entorno de Cerámicas El Dorado). Para ver el oficio de cerca.",
    price: 35000,
    location: "El Carmen de Viboral, Antioquia",
    latitude: 6.081,
    longitude: -75.336,
    durationValue: 90,
    durationUnit: "MINUTES",
    howToGetThere: "En El Carmen de Viboral, cerca del circuito artesanal del municipio.",
    cover: wa("10.22.44 AM (6)"),
    files: [
      wa("10.22.44 AM (6)"),
      wa("10.22.44 AM (2)"),
      wa("10.22.45 AM (6)"),
      wa("10.22.46 AM (6)"),
      wa("10.22.47 AM"),
      wa("10.22.47 AM (1)"),
      wa("10.22.47 AM (2)"),
      wa("10.22.47 AM (3)"),
      wa("10.22.47 AM (6)"),
      wa("10.22.48 AM"),
    ],
  },
  {
    title: "Taller de velas artesanales",
    category: "Cultural",
    description:
      "Taller de velas en Candle Bar / Cadmiel: aromas, cera y un café del mismo lugar. Sales con tus velas y un rato pausado en el local.",
    price: 65000,
    location: "Medellín, Antioquia",
    latitude: 6.2105,
    longitude: -75.5712,
    durationValue: 2,
    durationUnit: "HOURS",
    howToGetThere: "Cadmiel / Candle Bar en Medellín; pide la dirección actualizada al confirmar el cupo.",
    cover: wa("10.22.49 AM"),
    files: [
      wa("10.22.49 AM"),
      wa("10.22.48 AM (3)"),
      wa("10.22.48 AM (4)"),
      wa("10.22.48 AM (5)"),
      wa("10.22.48 AM (6)"),
    ],
  },
  {
    title: "Clase de Pilates",
    category: "Deportivo",
    description:
      "Clase de Pilates en estudio con luz natural y vista al jardín. Mat, respiración y un grupo reducido para moverte sin prisa.",
    price: 50000,
    location: "Medellín, Antioquia",
    latitude: 6.217,
    longitude: -75.574,
    durationValue: 1,
    durationUnit: "HOURS",
    howToGetThere: "Estudio en Medellín; llega 10 minutos antes con ropa cómoda. Lleva tapete si te lo piden.",
    cover: wa("10.22.49 AM (3)"),
    files: [
      wa("10.22.49 AM (3)"),
      wa("10.22.49 AM (1)"),
      wa("10.22.49 AM (2)"),
      wa("10.22.49 AM (4)"),
      wa("10.22.49 AM (5)"),
      wa("10.22.49 AM (6)"),
    ],
  },
  {
    title: "Clase de cocina",
    category: "Recreativo",
    description:
      "Clase de cocina en The Butter Club: recetas, mesa compartida y un menú que preparas en grupo. Ideal para un plan de tarde entre fogones.",
    price: 160000,
    location: "Medellín, Antioquia",
    latitude: 6.2098,
    longitude: -75.5691,
    durationValue: 3,
    durationUnit: "HOURS",
    howToGetThere: "The Butter Club en Medellín; confirma sede y horario al reservar.",
    cover: wa("10.22.50 AM (3)"),
    files: [wa("10.22.50 AM (3)"), ...range("10.22.50 AM", 1, 6), wa("10.22.51 AM"), wa("10.22.51 AM (1)")],
  },
  {
    title: "Taller de flores",
    category: "Recreativo",
    description:
      "Taller floral en grupo: delantales, ramiletes y un rato entre flores. Sales con tu arreglo y fotos del taller.",
    price: 90000,
    location: "Medellín, Antioquia",
    latitude: 6.2442,
    longitude: -75.5812,
    durationValue: 2,
    durationUnit: "HOURS",
    howToGetThere: "Local en Medellín; el cupo incluye materiales. Llega puntual para armar tu estación.",
    cover: wa("10.22.52 AM (1)"),
    files: [
      wa("10.22.52 AM (1)"),
      wa("10.22.51 AM (2)"),
      wa("10.22.51 AM (3)"),
      wa("10.22.51 AM (4)"),
      wa("10.22.51 AM (5)"),
      wa("10.22.51 AM (6)"),
      wa("10.22.52 AM"),
      wa("10.22.52 AM (2)"),
      wa("10.22.52 AM (3)"),
      wa("10.22.52 AM (4)"),
      wa("10.22.52 AM (5)"),
    ],
  },
];

function slug(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uploadGallery(title: string, files: string[]) {
  const urls: string[] = [];
  const unique = [...new Set(files)];
  for (const file of unique) {
    const source = path.join(galleryDir, file);
    try {
      await fs.access(source);
    } catch {
      console.warn(`  (sin archivo) ${file}`);
      continue;
    }
    const destName = `${slug(title)}-${urls.length + 1}.jpeg`;
    const url = await persistExperienceJpegFromDisk(source, destName);
    urls.push(url);
    console.log(`  Cloudinary ${urls.length}: ${file}`);
    if (urls.length >= 12) {
      break;
    }
  }
  if (urls.length === 0) {
    throw new Error(`No hay fotos para ${title}`);
  }
  while (urls.length < 5) {
    urls.push(urls[0]);
  }
  return urls;
}

async function main() {
  const { admin } = await seedCore();
  const categoryIds: Record<string, string> = {};

  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { name: category.name },
      update: { status: "APPROVED", description: category.description, rejectionReason: null },
      create: {
        name: category.name,
        description: category.description,
        status: "APPROVED",
      },
    });
    categoryIds[category.name] = row.id;
  }

  for (const item of CATALOG) {
    console.log(item.title);
    const imageUrls = await uploadGallery(item.title, item.files);
    const duration = formatDuration(item.durationValue, item.durationUnit);
    const existing = await prisma.experience.findFirst({ where: { title: item.title } });
    const data = {
      title: item.title,
      description: item.description,
      categoryId: categoryIds[item.category],
      price: item.price,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      duration,
      durationValue: item.durationValue,
      durationUnit: item.durationUnit,
      availability: { type: "EVERY_DAY" as const },
      howToGetThere: item.howToGetThere,
      imageUrl: imageUrls[0],
      imageUrls,
      status: "PUBLISHED" as const,
      createdBy: admin.id,
      submittedAt: null,
      rejectionReason: null,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    };
    if (existing) {
      await prisma.experience.update({ where: { id: existing.id }, data });
      console.log(`actualizada: ${item.title} (${imageUrls.length} fotos)`);
    } else {
      await prisma.experience.create({ data });
      console.log(`creada: ${item.title} (${imageUrls.length} fotos)`);
    }
  }

  const count = await prisma.experience.count({ where: { status: "PUBLISHED" } });
  console.log(`Listo. Experiencias publicadas: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit();
  });
