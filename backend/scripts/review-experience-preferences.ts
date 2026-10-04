/**
 * Asigna ambientes e ideal para del catálogo actual.
 * Solo escribe environments e idealFor. No toca categorías, intereses,
 * imágenes, sedes, disponibilidad, precio ni la lógica de recomendaciones.
 *
 *   cd backend && npx tsx scripts/review-experience-preferences.ts --dry-run
 *   cd backend && npx tsx scripts/review-experience-preferences.ts --apply
 *
 * --apply escribe solo las filas con confianza "alta".
 */
import { prisma } from "../src/database/prisma.js";

const PLACES = ["Playa", "Montaña", "Bosque / Naturaleza", "Ciudad", "Pueblos mágicos"] as const;
const COMPANIONS = ["Solo", "En pareja", "Amigos", "Familia"] as const;

type Confidence = "alta" | "media" | "requiere revisión";

type Proposal = {
  environments: string[];
  idealFor: string[];
  confidence: Confidence;
  note: string;
};

const PROPOSALS: Record<string, Proposal> = {
  "Taller de pasta Italiana en Medellín": {
    environments: ["Ciudad"],
    idealFor: ["En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "Taller nocturno en Laureles, con cena. El entorno es urbano.",
  },
  "Taller de cerámica": {
    environments: ["Pueblos mágicos"],
    idealFor: ["Solo", "En pareja", "Amigos"],
    confidence: "alta",
    note: "La clase es en El Carmen de Viboral, pueblo ceramista, no en la ciudad.",
  },
  "Candlelight: Concierto bajo las velas": {
    environments: ["Ciudad"],
    idealFor: ["En pareja", "Amigos"],
    confidence: "alta",
    note: "Concierto en el Museo de Arte Moderno de Medellín.",
  },
  "Experiencia Candle Bar": {
    environments: ["Ciudad"],
    idealFor: ["En pareja", "Amigos"],
    confidence: "alta",
    note: "Taller de velas en Medellín. Cada persona arma la suya.",
  },
  "Escape room Piratas en Enigma Laureles": {
    environments: ["Ciudad"],
    idealFor: ["Amigos", "Familia"],
    confidence: "alta",
    note: "Sala en Laureles para grupos de 2 a 6. No es un plan individual.",
  },
  "Carrera de las Rosas Medellín – 21K": {
    environments: ["Ciudad"],
    idealFor: ["Solo", "Amigos"],
    confidence: "alta",
    note: "Carrera de 21K que sale del Parque de las Luces, en Medellín.",
  },
  "Tour a Guatapé y la Piedra del Peñol desde Medellín": {
    environments: ["Montaña", "Pueblos mágicos"],
    idealFor: ["Solo", "En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "El plan es Guatapé, la piedra y el embalse. Caldas solo es el punto de recogida.",
  },
  "Tour del café en San Sebastián de Palmitas": {
    environments: ["Montaña", "Pueblos mágicos"],
    idealFor: ["Solo", "En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "La finca está en Palmitas. El hotel del centro solo es el punto de recogida.",
  },
  "Tour por la Comuna 13": {
    environments: ["Ciudad"],
    idealFor: ["Solo", "En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "Recorrido a pie por el barrio, en Medellín.",
  },
  "Taller técnica de bouquet": {
    environments: ["Ciudad"],
    idealFor: ["Solo", "En pareja", "Amigos"],
    confidence: "alta",
    note: "Taller floral en un café de El Poblado.",
  },
  "Clase de Pilates": {
    environments: ["Ciudad"],
    idealFor: ["Solo", "Amigos"],
    confidence: "alta",
    note: "Clase en estudio en Medellín. La vista al jardín no cambia el entorno.",
  },
  "Ruta en bicicleta: Entre cerros y cerámica": {
    environments: ["Montaña", "Pueblos mágicos"],
    idealFor: ["Solo", "Amigos"],
    confidence: "alta",
    note: "La ruta es entre cerros y termina en El Carmen de Viboral, no en la ciudad.",
  },
  "Jardines del Belvedere": {
    environments: ["Bosque / Naturaleza"],
    idealFor: ["Solo", "En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "El plan son los jardines y el estanque, aunque queden en El Poblado.",
  },
  "Clase de cocina": {
    environments: ["Ciudad"],
    idealFor: ["En pareja", "Amigos", "Familia"],
    confidence: "alta",
    note: "Clase en grupo en The Butter Club, Medellín.",
  },
  "Cerámicas Esmaltarte": {
    environments: [],
    idealFor: [],
    confidence: "requiere revisión",
    note: "Visita a un taller en El Carmen. Falta confirmar si se clasifica como pueblo antes de guardar.",
  },
  preuba: {
    environments: [],
    idealFor: [],
    confidence: "requiere revisión",
    note: "La descripción no describe la experiencia.",
  },
  "prueba 2": {
    environments: [],
    idealFor: [],
    confidence: "requiere revisión",
    note: "La descripción no describe la experiencia.",
  },
};

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

const experiences = await prisma.experience.findMany({
  select: {
    id: true,
    title: true,
    environments: true,
    idealFor: true,
    categoryId: true,
    price: true,
    location: true,
    imageUrl: true,
    experienceCategories: {
      orderBy: { position: "asc" },
      select: { categoryId: true, category: { select: { name: true } } },
    },
    experienceInterests: {
      orderBy: { position: "asc" },
      select: { interest: { select: { name: true } } },
    },
    locations: { select: { id: true } },
  },
  orderBy: { title: "asc" },
});

const before = new Map(
  experiences.map((experience) => [
    experience.id,
    {
      categories: experience.experienceCategories.map((link) => link.categoryId).join("|"),
      interests: experience.experienceInterests.map((link) => link.interest.name).join("|"),
      categoryId: experience.categoryId,
      price: experience.price.toString(),
      location: experience.location,
      imageUrl: experience.imageUrl,
      locationCount: experience.locations.length,
    },
  ]),
);

type Row = {
  id: string;
  title: string;
  currentEnvironments: string[];
  currentIdealFor: string[];
  environments: string[];
  idealFor: string[];
  confidence: Confidence;
  note: string;
  apply: boolean;
};

const rows: Row[] = experiences.map((experience) => {
  const proposal = PROPOSALS[experience.title];
  if (!proposal) {
    return {
      id: experience.id,
      title: experience.title,
      currentEnvironments: experience.environments,
      currentIdealFor: experience.idealFor,
      environments: [],
      idealFor: [],
      confidence: "requiere revisión",
      note: "No hay una propuesta para este título.",
      apply: false,
    };
  }
  return {
    id: experience.id,
    title: experience.title,
    currentEnvironments: experience.environments,
    currentIdealFor: experience.idealFor,
    environments: proposal.environments,
    idealFor: proposal.idealFor,
    confidence: proposal.confidence,
    note: proposal.note,
    apply: proposal.confidence === "alta",
  };
});

const multiLocation = experiences.filter((experience) => experience.locations.length > 1);

console.log(dryRun && !apply ? "MODO dry-run. No se escribe nada.\n" : "MODO apply. Solo confianza alta.\n");
if (multiLocation.length) {
  console.log(`Experiencias con varias ubicaciones: ${multiLocation.map((item) => item.title).join("; ")}\n`);
} else {
  console.log("Ninguna experiencia tiene varias ubicaciones.\n");
}

for (const row of rows) {
  console.log(
    [
      row.title,
      `ambientes actuales: ${row.currentEnvironments.join(", ") || "(vacío)"}`,
      `ambientes propuestos: ${row.environments.join(", ") || "(vacío)"}`,
      `ideal para actual: ${row.currentIdealFor.join(", ") || "(vacío)"}`,
      `ideal para propuesto: ${row.idealFor.join(", ") || "(vacío)"}`,
      `confianza: ${row.confidence}`,
      `aplica: ${row.apply ? "sí" : "no"}`,
      row.note,
    ].join("\n  "),
  );
  console.log("");
}

const blockers: string[] = [];
for (const row of rows.filter((item) => item.apply)) {
  if (new Set(row.environments).size !== row.environments.length) {
    blockers.push(`${row.title}: ambientes duplicados`);
  }
  if (new Set(row.idealFor).size !== row.idealFor.length) {
    blockers.push(`${row.title}: ideal para duplicado`);
  }
  for (const value of row.environments) {
    if (!PLACES.includes(value as (typeof PLACES)[number])) {
      blockers.push(`${row.title}: ambiente no oficial (${value})`);
    }
  }
  for (const value of row.idealFor) {
    if (!COMPANIONS.includes(value as (typeof COMPANIONS)[number])) {
      blockers.push(`${row.title}: compañía no oficial (${value})`);
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

if (apply && !dryRun) {
  for (const row of rows.filter((item) => item.apply)) {
    await prisma.experience.update({
      where: { id: row.id },
      data: {
        environments: row.environments,
        idealFor: row.idealFor,
      },
    });
    console.log(`Aplicada: ${row.title}`);
  }
}

const after = apply && !dryRun
  ? await prisma.experience.findMany({
      select: {
        id: true,
        title: true,
        environments: true,
        idealFor: true,
        categoryId: true,
        price: true,
        location: true,
        imageUrl: true,
        experienceCategories: { orderBy: { position: "asc" }, select: { categoryId: true } },
        experienceInterests: { orderBy: { position: "asc" }, select: { interest: { select: { name: true } } } },
        locations: { select: { id: true } },
      },
    })
  : [];

const problems: string[] = [];
if (apply && !dryRun) {
  const places = new Set<string>(PLACES);
  const companions = new Set<string>(COMPANIONS);
  for (const experience of after) {
    const snapshot = before.get(experience.id);
    if (!snapshot) {
      problems.push(`${experience.title}: apareció después del listado`);
      continue;
    }
    if (experience.experienceCategories.map((link) => link.categoryId).join("|") !== snapshot.categories) {
      problems.push(`${experience.title}: cambiaron las categorías`);
    }
    if (experience.experienceInterests.map((link) => link.interest.name).join("|") !== snapshot.interests) {
      problems.push(`${experience.title}: cambiaron los intereses`);
    }
    if (experience.categoryId !== snapshot.categoryId || experience.price.toString() !== snapshot.price) {
      problems.push(`${experience.title}: cambió categoría principal o precio`);
    }
    if (experience.location !== snapshot.location || experience.imageUrl !== snapshot.imageUrl) {
      problems.push(`${experience.title}: cambió ubicación o imagen`);
    }
    if (experience.locations.length !== snapshot.locationCount) {
      problems.push(`${experience.title}: cambió el número de sedes`);
    }
    for (const value of experience.environments) {
      if (!places.has(value)) {
        problems.push(`${experience.title}: ambiente desconocido ${value}`);
      }
    }
    for (const value of experience.idealFor) {
      if (!companions.has(value)) {
        problems.push(`${experience.title}: compañía desconocida ${value}`);
      }
    }
    if (new Set(experience.environments).size !== experience.environments.length) {
      problems.push(`${experience.title}: ambientes duplicados`);
    }
    if (new Set(experience.idealFor).size !== experience.idealFor.length) {
      problems.push(`${experience.title}: ideal para duplicado`);
    }
    const proposal = rows.find((row) => row.id === experience.id);
    if (proposal?.apply) {
      if (!sameList(experience.environments, proposal.environments) || !sameList(experience.idealFor, proposal.idealFor)) {
        problems.push(`${experience.title}: no quedó la propuesta aplicada`);
      }
    } else if (
      !sameList(experience.environments, proposal?.currentEnvironments ?? []) ||
      !sameList(experience.idealFor, proposal?.currentIdealFor ?? [])
    ) {
      problems.push(`${experience.title}: se modificó un caso que no era de confianza alta`);
    }
  }
  console.log(problems.length ? `Validación con observaciones:\n${problems.join("\n")}` : "Validación: sin observaciones.");
}

console.log(
  JSON.stringify(
    {
      reviewed: rows.length,
      withEnvironments: rows.filter((row) => row.apply && row.environments.length > 0).length,
      withIdealFor: rows.filter((row) => row.apply && row.idealFor.length > 0).length,
      pending: rows.filter((row) => !row.apply).map((row) => row.title),
      wrote: apply && !dryRun,
      multiLocation: multiLocation.map((item) => item.title),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
