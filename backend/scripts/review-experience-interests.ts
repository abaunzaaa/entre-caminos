/**
 * Reclasifica categorías e intereses del catálogo actual.
 * No borra categorías. No toca imágenes, precios, sedes ni otras relaciones.
 *
 *   cd backend && npx tsx scripts/review-experience-interests.ts --dry-run
 *   cd backend && npx tsx scripts/review-experience-interests.ts --apply
 *
 * --apply escribe solo las filas con confianza "alta".
 */
import { prisma } from "../src/database/prisma.js";

const OFFICIAL_INTERESTS = [
  "Naturaleza",
  "Gastronomía",
  "Cultura",
  "Aventura",
  "Bienestar",
  "Arte y creatividad",
  "Deportes",
  "Historia y patrimonio",
  "Música",
  "Talleres",
  "Planes urbanos",
  "Café",
  "Fotografía",
  "Danza",
  "Literatura",
  "Vida nocturna",
] as const;

type Confidence = "alta" | "media" | "requiere revisión";

type Proposal = {
  categories: string[];
  interests: string[];
  confidence: Confidence;
  note: string;
};

const PROPOSALS: Record<string, Proposal> = {
  "Clase de cocina": {
    categories: ["Gastronomía"],
    interests: ["Gastronomía", "Talleres"],
    confidence: "alta",
    note: "Clase práctica de cocina.",
  },
  "Escape room Piratas en Enigma Laureles": {
    categories: ["Planes urbanos"],
    interests: ["Planes urbanos", "Aventura"],
    confidence: "alta",
    note: "Juego urbano en sala.",
  },
  "Jardines del Belvedere": {
    categories: ["Naturaleza y aventura"],
    interests: ["Naturaleza", "Fotografía"],
    confidence: "alta",
    note: "Recorrido al aire libre.",
  },
  "Tour a Guatapé y la Piedra del Peñol desde Medellín": {
    categories: ["Naturaleza y aventura"],
    interests: ["Naturaleza", "Aventura", "Cultura"],
    confidence: "alta",
    note: "Pueblo, embalse y piedra.",
  },
  "Tour del café en San Sebastián de Palmitas": {
    categories: ["Gastronomía", "Cultura e historia"],
    interests: ["Café", "Gastronomía", "Cultura"],
    confidence: "alta",
    note: "Cultivo, proceso y taza.",
  },
  "Tour por la Comuna 13": {
    categories: ["Cultura e historia", "Planes urbanos"],
    interests: ["Cultura", "Historia y patrimonio", "Planes urbanos"],
    confidence: "alta",
    note: "Memoria y recorrido de barrio.",
  },
  "Taller de cerámica": {
    categories: ["Arte y creatividad"],
    interests: ["Arte y creatividad", "Talleres"],
    confidence: "alta",
    note: "Clase práctica de cerámica.",
  },
  "Taller de pasta Italiana en Medellín": {
    categories: ["Gastronomía"],
    interests: ["Gastronomía", "Talleres"],
    confidence: "alta",
    note: "Taller de cocina.",
  },
  "carrera de las rosas": {
    categories: ["Bienestar y deporte"],
    interests: ["Deportes", "Bienestar"],
    confidence: "alta",
    note: "Carrera.",
  },
  "Carrera de las Rosas Medellín – 21K": {
    categories: ["Bienestar y deporte"],
    interests: ["Deportes", "Bienestar"],
    confidence: "alta",
    note: "Carrera de 21K.",
  },
  "Clase de Pilates": {
    categories: ["Bienestar y deporte"],
    interests: ["Bienestar", "Deportes"],
    confidence: "alta",
    note: "Clase de movimiento en estudio.",
  },
  "Experiencia Candle Bar": {
    categories: ["Arte y creatividad"],
    interests: ["Arte y creatividad", "Talleres"],
    confidence: "alta",
    note: "Cada persona elabora su vela.",
  },
  "Taller técnica de bouquet": {
    categories: ["Arte y creatividad"],
    interests: ["Arte y creatividad", "Talleres"],
    confidence: "alta",
    note: "Taller de arte floral.",
  },
  "Candlelight: Concierto bajo las velas": {
    categories: ["Cultura e historia"],
    interests: ["Música", "Cultura"],
    confidence: "alta",
    note: "Concierto en museo. La categoría ya coincide.",
  },
  "Ruta en bicicleta: Entre cerros y cerámica": {
    categories: ["Bienestar y deporte"],
    interests: ["Deportes", "Naturaleza"],
    confidence: "alta",
    note: "La salida en bici es el plan. La parada de cerámica no abre otra categoría.",
  },
  "Cerámicas Esmaltarte": {
    categories: ["Cultura e historia"],
    interests: [],
    confidence: "requiere revisión",
    note: "Es una visita a ver el oficio, no una clase. No se asignan intereses hasta confirmarlo.",
  },
};

function sameNames(left: string[], right: string[]) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

const apply = process.argv.includes("--apply");
const dryRun = !apply || process.argv.includes("--dry-run");

const experiences = await prisma.experience.findMany({
  select: {
    id: true,
    title: true,
    categoryId: true,
    experienceCategories: {
      orderBy: { position: "asc" },
      select: { category: { select: { id: true, name: true } } },
    },
    experienceInterests: {
      orderBy: { position: "asc" },
      select: { interest: { select: { name: true } } },
    },
  },
  orderBy: { title: "asc" },
});

const categories = await prisma.category.findMany({ select: { id: true, name: true } });
const interests = await prisma.interest.findMany({ select: { id: true, name: true } });
const categoryByName = new Map(categories.map((category) => [category.name, category.id]));
const interestByName = new Map(interests.map((interest) => [interest.name, interest.id]));

type Row = {
  id: string;
  title: string;
  currentCategories: string[];
  proposedCategories: string[];
  proposedInterests: string[];
  confidence: Confidence;
  note: string;
  apply: boolean;
};

const rows: Row[] = experiences.map((experience) => {
  const currentCategories = experience.experienceCategories.map((link) => link.category.name);
  const proposal = PROPOSALS[experience.title];
  if (!proposal) {
    return {
      id: experience.id,
      title: experience.title,
      currentCategories,
      proposedCategories: currentCategories,
      proposedInterests: [],
      confidence: "requiere revisión",
      note: "No hay una propuesta para este título.",
      apply: false,
    };
  }
  return {
    id: experience.id,
    title: experience.title,
    currentCategories,
    proposedCategories: proposal.categories,
    proposedInterests: proposal.interests,
    confidence: proposal.confidence,
    note: proposal.note,
    apply: proposal.confidence === "alta",
  };
});

console.log(dryRun && !apply ? "MODO dry-run. No se escribe nada.\n" : "MODO apply. Solo confianza alta.\n");
for (const row of rows) {
  console.log(
    [
      row.title,
      `actual: ${row.currentCategories.join(" | ") || "(ninguna)"}`,
      `propuesta: ${row.proposedCategories.join(" | ") || "(ninguna)"}`,
      `intereses: ${row.proposedInterests.join(", ") || "(sin asignar)"}`,
      `confianza: ${row.confidence}`,
      `aplica: ${row.apply ? "sí" : "no"}`,
      row.note,
    ].join("\n  "),
  );
  console.log("");
}

const blockers: string[] = [];
for (const row of rows.filter((item) => item.apply)) {
  if (row.proposedCategories.length < 1 || row.proposedCategories.length > 3) {
    blockers.push(`${row.title}: categorías fuera de 1 a 3`);
  }
  if (row.proposedInterests.length < 1 || row.proposedInterests.length > 5) {
    blockers.push(`${row.title}: intereses fuera de 1 a 5`);
  }
  if (new Set(row.proposedInterests).size !== row.proposedInterests.length) {
    blockers.push(`${row.title}: intereses duplicados`);
  }
  for (const name of row.proposedCategories) {
    if (!categoryByName.has(name)) {
      blockers.push(`${row.title}: falta la categoría ${name}`);
    }
  }
  for (const name of row.proposedInterests) {
    if (!OFFICIAL_INTERESTS.includes(name as (typeof OFFICIAL_INTERESTS)[number]) || !interestByName.has(name)) {
      blockers.push(`${row.title}: interés fuera del catálogo (${name})`);
    }
  }
}

if (blockers.length) {
  console.log("No se aplicó nada. Hay que corregir la propuesta:");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
  await prisma.$disconnect();
  process.exit(1);
}

if (apply) {
  for (const row of rows.filter((item) => item.apply)) {
    const categoryIds = row.proposedCategories.map((name) => categoryByName.get(name)!);
    const interestIds = row.proposedInterests.map((name) => interestByName.get(name)!);
    await prisma.$transaction(async (tx) => {
      await tx.experienceCategory.deleteMany({ where: { experienceId: row.id } });
      await tx.experienceCategory.createMany({
        data: categoryIds.map((categoryId, index) => ({
          experienceId: row.id,
          categoryId,
          position: index + 1,
        })),
      });
      await tx.experience.update({
        where: { id: row.id },
        data: { categoryId: categoryIds[0] },
      });
      await tx.experienceInterest.deleteMany({ where: { experienceId: row.id } });
      await tx.experienceInterest.createMany({
        data: interestIds.map((interestId, index) => ({
          experienceId: row.id,
          interestId,
          position: index + 1,
        })),
      });
    });
    console.log(`Aplicada: ${row.title}`);
  }
}

const after = apply
  ? await prisma.experience.findMany({
      select: {
        title: true,
        experienceCategories: { select: { category: { select: { name: true } } } },
        experienceInterests: { select: { interest: { select: { name: true } } } },
      },
    })
  : [];

if (apply) {
  const official = new Set<string>(OFFICIAL_INTERESTS);
  const problems: string[] = [];
  for (const experience of after) {
    const categoryCount = experience.experienceCategories.length;
    const interestNames = experience.experienceInterests.map((link) => link.interest.name);
    if (categoryCount < 1 || categoryCount > 3) {
      problems.push(`${experience.title}: ${categoryCount} categorías`);
    }
    const approved = rows.find((row) => row.title === experience.title)?.apply;
    if (approved && (interestNames.length < 1 || interestNames.length > 5)) {
      problems.push(`${experience.title}: ${interestNames.length} intereses`);
    }
    if (new Set(interestNames).size !== interestNames.length) {
      problems.push(`${experience.title}: intereses duplicados`);
    }
    for (const name of interestNames) {
      if (!official.has(name)) {
        problems.push(`${experience.title}: interés desconocido ${name}`);
      }
    }
  }
  console.log(problems.length ? `Validación con observaciones:\n${problems.join("\n")}` : "Validación: sin observaciones.");
}

const recreativo = await prisma.experienceCategory.count({
  where: { category: { name: "Recreativo" } },
});
const turistico = await prisma.experienceCategory.count({
  where: { category: { name: "Turístico" } },
});

console.log(
  JSON.stringify(
    {
      reviewed: rows.length,
      toApply: rows.filter((row) => row.apply).length,
      manual: rows.filter((row) => row.confidence !== "alta").map((row) => row.title),
      unchangedCategory: rows
        .filter((row) => row.apply && sameNames(row.currentCategories, row.proposedCategories))
        .map((row) => row.title),
      recreativo,
      turistico,
      wrote: apply,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
