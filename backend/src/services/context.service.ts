import { prisma } from "../database/prisma.js";

export type GuideCatalogItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  price: unknown;
  duration: string | null;
  imageUrl: string | null;
  category: string | null;
};

export type GuideExperienceContext = {
  id?: string;
  name?: string;
  category?: string;
  location?: string;
  price?: string | number;
  duration?: string;
  description?: string;
  availableDays?: unknown;
  howToGetThere?: string;
};

export type GuideChatContext = {
  mode?: "general" | "experience";
  experience?: GuideExperienceContext;
};

function formatAvailability(value: unknown) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.days)) {
      return record.days.map(String).join(", ");
    }
    if (Array.isArray(record.availableDays)) {
      return record.availableDays.map(String).join(", ");
    }
    try {
      return JSON.stringify(value).slice(0, 280);
    } catch {
      return "";
    }
  }
  return String(value);
}

export async function loadGuideContext(input: {
  userId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  experienceId?: string;
  context?: GuideChatContext;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const experienceId = input.experienceId || input.context?.experience?.id;
  const [user, profile, focus, published] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: {
        city: true,
        department: true,
        interests: true,
        companions: true,
        places: true,
        budget: true,
        climate: true,
        latitude: true,
        longitude: true,
      },
    }),
    experienceId
      ? prisma.experience.findFirst({
          where: { id: experienceId, status: "PUBLISHED" },
          include: { category: true },
        })
      : Promise.resolve(null),
    prisma.experience.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const catalog: GuideCatalogItem[] = published.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description.slice(0, 280),
    location: item.location,
    price: item.price,
    duration: item.duration,
    imageUrl: item.imageUrl,
    category: item.category?.name ?? null,
  }));

  const history = input.history
    .slice(-20)
    .filter((item) => item.content.trim());

  const clientExperience = input.context?.experience;
  const experienceBlock = focus
    ? [
        "MODO: experiencia específica. Prioriza siempre esta información y no inventes lo que no aparezca aquí.",
        `Experiencia: ${focus.title}.`,
        `Categoría: ${focus.category?.name ?? clientExperience?.category ?? "N/A"}.`,
        `Lugar: ${focus.location}.`,
        `Precio: ${String(focus.price)}.`,
        `Duración: ${focus.duration ?? clientExperience?.duration ?? "no indicada"}.`,
        `Días disponibles: ${formatAvailability(focus.availability) || formatAvailability(clientExperience?.availableDays) || "no indicados"}.`,
        `Descripción: ${focus.description.slice(0, 800)}.`,
        `Cómo llegar: ${focus.howToGetThere || clientExperience?.howToGetThere || "no indicado"}.`,
      ].join("\n")
    : clientExperience?.name
      ? [
          "MODO: experiencia específica (contexto del cliente). Úsala primero y no inventes datos.",
          `Experiencia: ${clientExperience.name}.`,
          `Categoría: ${clientExperience.category ?? "N/A"}.`,
          `Lugar: ${clientExperience.location ?? "no indicado"}.`,
          `Precio: ${clientExperience.price ?? "no indicado"}.`,
          `Duración: ${clientExperience.duration ?? "no indicada"}.`,
          `Días disponibles: ${formatAvailability(clientExperience.availableDays) || "no indicados"}.`,
          `Descripción: ${(clientExperience.description ?? "").slice(0, 800) || "no indicada"}.`,
          `Cómo llegar: ${clientExperience.howToGetThere || "no indicado"}.`,
        ].join("\n")
      : "MODO: guía general. No hay una experiencia abierta. Ayuda a descubrir experiencias y armar planes en Medellín y Antioquia.";

  const contextPrompt = [
    user?.name ? `Nombre de la persona: ${user.name}.` : "",
    profile
      ? `Perfil: ciudad ${profile.city ?? "sin definir"}, intereses ${profile.interests.join(", ") || "sin definir"}, compañía ${profile.companions.join(", ") || "sin definir"}, presupuesto ${profile.budget.join(", ") || "sin definir"}, climas ${profile.climate.join(", ") || "sin definir"}.`
      : "Perfil: aún no hay preferencias guardadas.",
    input.location?.city || input.location?.latitude
      ? `Ubicación actual declarada: ${input.location.city ?? "coordenadas"} ${input.location.latitude ?? ""} ${input.location.longitude ?? ""}.`.trim()
      : "",
    experienceBlock,
    "Catálogo (id | título | categoría | lugar | precio | duración):",
    catalog
      .map(
        (item) =>
          `- ${item.id} | ${item.title} | ${item.category ?? "Experiencia"} | ${item.location} | ${String(item.price)} | ${item.duration ?? "duración variable"}`,
      )
      .join("\n") || "(vacío)",
  ]
    .filter(Boolean)
    .join("\n\n");

  const transcript = history
    .map((item) => `${item.role === "user" ? "Persona" : "Guía"}: ${item.content}`)
    .join("\n");

  const prompt = [contextPrompt, transcript ? `Conversación:\n${transcript}` : "", `Mensaje nuevo: ${input.message}`]
    .filter(Boolean)
    .join("\n\n");

  return {
    catalog,
    cityFallback: profile?.city || input.location?.city || "",
    contextPrompt,
    prompt,
  };
}

