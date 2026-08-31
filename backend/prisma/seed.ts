import { PrismaClient, ExperienceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSIONS, ROLE_PERMISSION_MAP, ROLES } from "../src/config/constants.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../.env"), override: true });

const prisma = new PrismaClient();

const categories = [
  {
    name: "Cultural",
    description: "Museos, patrimonio, talleres y encuentros que cuentan la historia de un lugar.",
  },
  {
    name: "Recreativo",
    description: "Paseos, ocio y momentos ligeros para habitar la ciudad con calma.",
  },
  {
    name: "Deportivo",
    description: "Rutas, deporte al aire libre y movimiento en paisaje natural.",
  },
  {
    name: "Turístico",
    description: "Miradores, sabores y recorridos para residentes y viajeros.",
  },
];

const experienceSeeds: Array<{
  title: string;
  description: string;
  category: string;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  status: ExperienceStatus;
}> = [
  {
    title: "Amanecer entre cafetales",
    description:
      "Caminata guiada al amanecer por fincas de altura, cata de café de origen y desayuno campesino. Un ritual lento para entender el paisaje con todos los sentidos.",
    category: "Turístico",
    price: 180000,
    location: "Salento, Quindío",
    latitude: 4.6373,
    longitude: -75.5705,
    imageUrl:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80",
    status: "PUBLISHED",
  },
  {
    title: "Noche de murales en La Candelaria",
    description:
      "Recorrido editorial por el arte urbano del centro histórico. Historias de barrio, grafiti contemporáneo y una parada en un café de especialidad.",
    category: "Cultural",
    price: 75000,
    location: "La Candelaria, Bogotá",
    latitude: 4.5964,
    longitude: -74.0739,
    imageUrl:
      "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=1600&q=80",
    status: "PUBLISHED",
  },
  {
    title: "Kayak en la laguna de Guatavita",
    description:
      "Salida deportiva al amanecer, técnica básica de palada y lectura del paisaje sagrado. Incluye equipo y guía certificado.",
    category: "Deportivo",
    price: 140000,
    location: "Guatavita, Cundinamarca",
    latitude: 4.9342,
    longitude: -73.8331,
    imageUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80",
    status: "PUBLISHED",
  },
  {
    title: "Picnic editorial en el desierto",
    description:
      "Tarde de lectura, gastronomía local y horizonte abierto. Una experiencia recreativa para desconectar sin prisa, con menú de temporada.",
    category: "Recreativo",
    price: 95000,
    location: "Villa de Leyva, Boyacá",
    latitude: 5.6339,
    longitude: -73.5259,
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    status: "PUBLISHED",
  },
  {
    title: "Taller de cerámica en el barrio",
    description:
      "Sesión íntima con una maestra artesana. Modelado, esmaltes minerales y la historia de las manos que dan forma al oficio.",
    category: "Cultural",
    price: 120000,
    location: "Ráquira, Boyacá",
    latitude: 5.5381,
    longitude: -73.6336,
    imageUrl:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80",
    status: "DRAFT",
  },
];

export async function seedCore(options?: { includeCatalog?: boolean }) {
  const includeCatalog = options?.includeCatalog ?? true;

  for (const name of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByName = Object.fromEntries(permissions.map((item) => [item.name, item]));

  for (const roleName of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSION_MAP[roleName].map((permissionName) => ({
        roleId: role.id,
        permissionId: permissionByName[permissionName].id,
      })),
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.SUPER_ADMIN } });
  const foundersPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!foundersPassword || foundersPassword.length < 8) {
    throw new Error("Define SEED_ADMIN_PASSWORD en backend/.env (archivo local, no se sube a GitHub).");
  }
  const meetsPolicy =
    /[A-Z]/.test(foundersPassword) &&
    /[a-z]/.test(foundersPassword) &&
    /[0-9]/.test(foundersPassword) &&
    /[^A-Za-z0-9]/.test(foundersPassword);
  if (!meetsPolicy) {
    throw new Error(
      "SEED_ADMIN_PASSWORD debe tener mayúscula, minúscula, número y símbolo. Si incluye #, escríbela entre comillas en .env (dotenv trata # como comentario).",
    );
  }
  const passwordHash = await bcrypt.hash(foundersPassword, 12);

  const founders = [
    { name: "Angie Diaz", email: "angie.diaz@entrecaminos.com" },
    { name: "Natalia Florez", email: "natalia.florez@entrecaminos.com" },
    { name: "Juliana Casas", email: "juliana.casas@entrecaminos.com" },
  ];

  const admins = [];
  for (const founder of founders) {
    const admin = await prisma.user.upsert({
      where: { email: founder.email },
      update: {
        name: founder.name,
        passwordHash,
        roleId: superAdminRole.id,
        status: "ACTIVE",
        emailVerified: true,
      },
      create: {
        name: founder.name,
        email: founder.email,
        passwordHash,
        roleId: superAdminRole.id,
        emailVerified: true,
      },
    });
    admins.push(admin);
  }

  const admin = admins[0];

  if (!includeCatalog) {
    return { admin };
  }

  const categoryRenames: Record<string, string> = {
    Recreativa: "Recreativo",
    Deportiva: "Deportivo",
    Turística: "Turístico",
  };
  for (const [from, to] of Object.entries(categoryRenames)) {
    const previous = await prisma.category.findUnique({ where: { name: from } });
    const next = await prisma.category.findUnique({ where: { name: to } });
    if (previous && !next) {
      await prisma.category.update({ where: { id: previous.id }, data: { name: to } });
    }
  }

  const categoryRecords = [];
  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description, status: "ACTIVE" },
      create: category,
    });
    categoryRecords.push(record);
  }

  const categoryByName = Object.fromEntries(categoryRecords.map((item) => [item.name, item]));

  for (const item of experienceSeeds) {
    const existing = await prisma.experience.findFirst({ where: { title: item.title } });
    if (existing) {
      continue;
    }

    await prisma.experience.create({
      data: {
        title: item.title,
        description: item.description,
        categoryId: categoryByName[item.category].id,
        price: item.price,
        location: item.location,
        latitude: item.latitude,
        longitude: item.longitude,
        imageUrl: item.imageUrl,
        status: item.status,
        createdBy: admin.id,
      },
    });
  }

  return { admin };
}

async function main() {
  await seedCore({ includeCatalog: true });
  console.log("Semilla de Entre Caminos lista.");
  console.log("SUPER_ADMIN (contraseña: SEED_ADMIN_PASSWORD de tu .env local):");
  console.log("  angie.diaz@entrecaminos.com");
  console.log("  natalia.florez@entrecaminos.com");
  console.log("  juliana.casas@entrecaminos.com");
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
