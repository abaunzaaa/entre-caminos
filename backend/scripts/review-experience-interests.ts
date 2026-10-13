/**
 * Revisa intereses relacionados del catálogo actual.
 * No escribe categorías, precios, sedes, imágenes ni otros campos de Experience.
 * Los intereses son internos: no se muestran en el detalle público.
 *
 *   cd backend && npx tsx scripts/review-experience-interests.ts --dry-run
 *   cd backend && npx tsx scripts/review-experience-interests.ts --apply
 *
 * --apply escribe solo las filas con confianza "alta" cuya lista de intereses cambia.
 * Conserva las relaciones que ya coinciden y solo agrega o quita las que difieren.
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
  interests: string[];
  confidence: Confidence;
  note: string;
};

const PROPOSALS: Record<string, Proposal> = {
  "Avistamiento de aves en Parque Arví": {
    interests: ["Naturaleza"],
    confidence: "alta",
    note: "Avistamiento guiado en el parque. No propone fotografía.",
  },
  "Cabalgata ecológica entre montañas en Caldas": {
    interests: ["Naturaleza", "Aventura"],
    confidence: "alta",
    note: "Cabalgata por senderos y montañas.",
  },
  "Candlelight: Concierto bajo las velas": {
    interests: ["Música", "Cultura"],
    confidence: "alta",
    note: "Concierto en el Museo de Arte Moderno de Medellín.",
  },
  "Carrera de las Rosas Medellín – 21K": {
    interests: ["Deportes", "Bienestar"],
    confidence: "alta",
    note: "Carrera urbana de 21K.",
  },
  "Clase grupal de salsa para principiantes en DANCEFREE": {
    interests: ["Danza", "Talleres"],
    confidence: "alta",
    note: "Clase de baile en El Poblado, desde los 16 años.",
  },
  "Escape room Piratas en Enigma Laureles": {
    interests: ["Planes urbanos", "Aventura"],
    confidence: "alta",
    note: "Juego urbano en sala.",
  },
  "Experiencia de chocolate colombiano: del grano a la barra": {
    interests: ["Gastronomía", "Talleres"],
    confidence: "alta",
    note: "Taller en Laureles donde se elabora la barra.",
  },
  "Experiencia silletera en Santa Elena": {
    interests: ["Cultura", "Historia y patrimonio", "Arte y creatividad"],
    confidence: "alta",
    note: "Tradición silletera y elaboración de una silleta.",
  },
  "Graffitour Comuna 13 con SAG Tour Medellín": {
    interests: ["Cultura", "Historia y patrimonio", "Planes urbanos"],
    confidence: "alta",
    note: "Recorrido urbano por la memoria de la comuna.",
  },
  "Ruta gastronómica por Sabaneta y Envigado": {
    interests: ["Gastronomía", "Planes urbanos"],
    confidence: "alta",
    note: "Recorrido de mesas en dos municipios del valle.",
  },
  "Secretos de una tradición en Herencias Cerámicas": {
    interests: ["Arte y creatividad", "Talleres", "Historia y patrimonio"],
    confidence: "alta",
    note: "Oficio cerámico en El Carmen de Viboral.",
  },
  "Senderismo guiado por el Sendero Vital – Parque Arví": {
    interests: ["Naturaleza", "Aventura"],
    confidence: "alta",
    note: "Caminata guiada por el parque. No propone fotografía.",
  },
  "Taller de pasta Italiana en Medellín": {
    interests: ["Gastronomía", "Talleres"],
    confidence: "alta",
    note: "Taller de cocina en Laureles.",
  },
  "Taller técnica de bouquet": {
    interests: ["Arte y creatividad", "Talleres"],
    confidence: "alta",
    note: "Taller floral en El Poblado.",
  },
  "Tour a Guatapé y la Piedra del Peñol desde Medellín": {
    interests: ["Naturaleza", "Aventura", "Cultura"],
    confidence: "alta",
    note: "Pueblo, embalse y piedra.",
  },
  "Tour de las Abejas Rionegro ORIMIEL": {
    interests: ["Naturaleza"],
    confidence: "alta",
    note: "Visita al apiario en vereda. La cata de miel no la vuelve gastronómica.",
  },
  "Tour del café en San Sebastián de Palmitas": {
    interests: ["Café", "Gastronomía", "Cultura"],
    confidence: "alta",
    note: "Cultivo, proceso y taza en Palmitas.",
  },
  "Vuelo en parapente sobre el Valle de Aburrá – Aeroclub San Félix": {
    interests: ["Aventura", "Naturaleza"],
    confidence: "alta",
    note: "Vuelo tándem desde San Félix.",
  },
};

function sameNames(left: string[], right: string[]) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function listDiff(current: string[], proposed: string[]) {
  const proposedSet = new Set(proposed);
  const currentSet = new Set(current);
  return {
    add: proposed.filter((name) => !currentSet.has(name)),
    remove: current.filter((name) => !proposedSet.has(name)),
    keep: current.filter((name) => proposedSet.has(name)),
  };
}

const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");

const experiences = await prisma.experience.findMany({
  select: {
    id: true,
    title: true,
    categoryId: true,
    experienceCategories: {
      orderBy: { position: "asc" },
      select: { categoryId: true, category: { select: { name: true } } },
    },
    experienceInterests: {
      orderBy: { position: "asc" },
      select: { interestId: true, interest: { select: { name: true } } },
    },
  },
  orderBy: { title: "asc" },
});

const interests = await prisma.interest.findMany({ select: { id: true, name: true } });
const interestByName = new Map(interests.map((interest) => [interest.name, interest.id]));

type Row = {
  id: string;
  title: string;
  categories: string[];
  currentInterests: string[];
  proposedInterests: string[];
  confidence: Confidence;
  note: string;
  apply: boolean;
};

const rows: Row[] = experiences.map((experience) => {
  const currentInterests = experience.experienceInterests.map((link) => link.interest.name);
  const categories = experience.experienceCategories.map((link) => link.category.name);
  const proposal = PROPOSALS[experience.title];
  if (!proposal) {
    return {
      id: experience.id,
      title: experience.title,
      categories,
      currentInterests,
      proposedInterests: currentInterests,
      confidence: "requiere revisión",
      note: "No hay una propuesta para este título. No se modifica.",
      apply: false,
    };
  }
  return {
    id: experience.id,
    title: experience.title,
    categories,
    currentInterests,
    proposedInterests: proposal.interests,
    confidence: proposal.confidence,
    note: proposal.note,
    apply: proposal.confidence === "alta" && !sameNames(currentInterests, proposal.interests),
  };
});

console.log(apply ? "MODO apply. Solo confianza alta con intereses distintos.\n" : "MODO dry-run. No se escribe nada.\n");
console.log("Las categorías se leen y no se escriben.\n");

for (const row of rows) {
  const diff = listDiff(row.currentInterests, row.proposedInterests);
  const unchanged = sameNames(row.currentInterests, row.proposedInterests);
  const change = unchanged
    ? "sin cambios"
    : [
        diff.add.length ? `agrega ${diff.add.join(", ")}` : "",
        diff.remove.length ? `quita ${diff.remove.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("; ");
  console.log(
    [
      row.title,
      `categorías (no se tocan): ${row.categories.join(" | ") || "(ninguna)"}`,
      `intereses actuales: ${row.currentInterests.join(", ") || "(vacío)"}`,
      `intereses propuestos: ${row.proposedInterests.join(", ") || "(vacío)"}`,
      `cambiaría: ${change}`,
      `se conservan: ${diff.keep.join(", ") || "(ninguno)"}`,
      `confianza: ${row.confidence}`,
      `aplica: ${row.apply ? "sí" : "no"}`,
      row.note,
    ].join("\n  "),
  );
  console.log("");
}

const blockers: string[] = [];
for (const row of rows.filter((item) => item.apply)) {
  if (row.proposedInterests.length < 1 || row.proposedInterests.length > 5) {
    blockers.push(`${row.title}: intereses fuera de 1 a 5`);
  }
  if (new Set(row.proposedInterests).size !== row.proposedInterests.length) {
    blockers.push(`${row.title}: intereses duplicados`);
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

const before = new Map(
  experiences.map((experience) => [
    experience.id,
    {
      categories: experience.experienceCategories.map((link) => link.categoryId).join("|"),
      categoryId: experience.categoryId,
    },
  ]),
);

if (apply) {
  for (const row of rows.filter((item) => item.apply)) {
    const proposedIds = row.proposedInterests.map((name) => interestByName.get(name)!);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.experienceInterest.findMany({ where: { experienceId: row.id } });
      const proposedSet = new Set(proposedIds);
      const removeIds = existing.map((link) => link.interestId).filter((id) => !proposedSet.has(id));
      if (removeIds.length) {
        await tx.experienceInterest.deleteMany({
          where: { experienceId: row.id, interestId: { in: removeIds } },
        });
      }
      const remaining = await tx.experienceInterest.findMany({ where: { experienceId: row.id } });
      for (const [index, link] of remaining.entries()) {
        await tx.experienceInterest.update({
          where: { experienceId_interestId: { experienceId: row.id, interestId: link.interestId } },
          data: { position: 1000 + index },
        });
      }
      for (const [index, interestId] of proposedIds.entries()) {
        await tx.experienceInterest.upsert({
          where: { experienceId_interestId: { experienceId: row.id, interestId } },
          create: { experienceId: row.id, interestId, position: index + 1 },
          update: { position: index + 1 },
        });
      }
    });
    console.log(`Aplicada: ${row.title}`);
  }

  const after = await prisma.experience.findMany({
    select: {
      id: true,
      title: true,
      categoryId: true,
      experienceCategories: { select: { categoryId: true } },
      experienceInterests: { select: { interest: { select: { name: true } } } },
    },
  });
  const problems: string[] = [];
  for (const experience of after) {
    const snapshot = before.get(experience.id);
    if (!snapshot) {
      continue;
    }
    if (experience.experienceCategories.map((link) => link.categoryId).join("|") !== snapshot.categories) {
      problems.push(`${experience.title}: cambiaron las categorías`);
    }
    if (experience.categoryId !== snapshot.categoryId) {
      problems.push(`${experience.title}: cambió la categoría principal`);
    }
    for (const link of experience.experienceInterests) {
      if (!OFFICIAL_INTERESTS.includes(link.interest.name as (typeof OFFICIAL_INTERESTS)[number])) {
        problems.push(`${experience.title}: interés desconocido ${link.interest.name}`);
      }
    }
  }
  console.log(problems.length ? `Validación con observaciones:\n${problems.join("\n")}` : "Validación: sin observaciones.");
}

console.log(
  JSON.stringify(
    {
      reviewed: rows.length,
      wouldChange: rows.filter((row) => row.apply).map((row) => row.title),
      unchanged: rows.filter((row) => sameNames(row.currentInterests, row.proposedInterests)).map((row) => row.title),
      manual: rows.filter((row) => row.confidence !== "alta").map((row) => row.title),
      categoriesWritable: false,
      wrote: apply,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
