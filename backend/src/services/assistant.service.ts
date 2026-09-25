import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { generateGeminiText, parseGeminiJson } from "./gemini.service.js";

export type AssistantChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantExperienceCard = {
  id: string;
  title: string;
  location: string;
  price: string | number;
  duration: string | null;
  category: string | null;
  imageUrl: string | null;
};

export type AssistantPlanStop = {
  time: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
};

export type AssistantPlan = {
  title: string;
  city: string;
  date: string;
  duration: string;
  people: string;
  tags: string[];
  coverImageUrl: string | null;
  experiences: string[];
  itinerary: AssistantPlanStop[];
};

export type AssistantReply = {
  reply: string;
  intent: "chat" | "clarify" | "recommend" | "plan" | "experience";
  status: "ok" | "empty" | "need_info";
  questions: string[];
  suggestions: string[];
  plan: AssistantPlan | null;
  planProgress: { step: number; total: number } | null;
  experiences: AssistantExperienceCard[];
};

type CatalogItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  price: unknown;
  duration: string | null;
  imageUrl: string | null;
  category: string | null;
};

const SYSTEM = `Eres "Tu guía", el asistente de Entre Caminos. Ayudas a las personas a descubrir experiencias en Colombia y a crear planes personalizados.

Habla en español, con tono cercano, calmado y premium. No eres un buscador: conversas, pides lo que falta y recomiendas con criterio.

Reglas:
- Si falta ciudad, fecha, compañía, presupuesto o interés para armar un plan, pregunta UNA cosa a la vez.
- Nunca inventes experiencias que no estén en el catálogo. Usa solo los id del catálogo.
- Si no hay coincidencias, dilo y ofrece alternativas del catálogo.
- Responde SOLO un JSON con esta forma:
{
  "reply": "texto para la persona",
  "intent": "chat" | "clarify" | "recommend" | "plan" | "experience",
  "status": "ok" | "empty" | "need_info",
  "questions": ["pregunta opcional"],
  "suggestions": ["atajo corto"],
  "plan": null | {
    "title": "",
    "city": "",
    "date": "",
    "duration": "",
    "people": "",
    "tags": ["Naturaleza"],
    "experiences": ["id"],
    "itinerary": [{ "time": "9:00 a. m.", "title": "", "subtitle": "" }]
  },
  "planProgress": null | { "step": 1, "total": 5 },
  "experienceIds": ["id"]
}`;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => asString(item)).filter(Boolean);
}

function catalogLine(item: CatalogItem) {
  return `- ${item.id} | ${item.title} | ${item.category ?? "Experiencia"} | ${item.location} | ${String(item.price)} | ${item.duration ?? "duración variable"}`;
}

function hydrate(ids: string[], catalog: CatalogItem[]): AssistantExperienceCard[] {
  const seen = new Set<string>();
  const cards: AssistantExperienceCard[] = [];
  for (const id of ids) {
    const match =
      catalog.find((item) => item.id === id) ||
      catalog.find((item) => item.title.toLowerCase() === id.toLowerCase()) ||
      catalog.find((item) => item.title.toLowerCase().includes(id.toLowerCase()));
    if (!match || seen.has(match.id)) {
      continue;
    }
    seen.add(match.id);
    cards.push({
      id: match.id,
      title: match.title,
      location: match.location,
      price: match.price as string | number,
      duration: match.duration,
      category: match.category,
      imageUrl: match.imageUrl,
    });
  }
  return cards.slice(0, 4);
}

const PLAN_TIMES = ["9:00 a. m.", "11:00 a. m.", "2:00 p. m.", "4:00 p. m."];

function asObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Record<string, unknown>[];
  }
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function buildPlan(planRaw: Record<string, unknown>, cards: AssistantExperienceCard[], cityFallback: string): AssistantPlan {
  const rawStops = asObjectArray(planRaw.itinerary);
  const itinerary: AssistantPlanStop[] =
    cards.length > 0
      ? cards.map((card, index) => ({
          time: asString(rawStops[index]?.time) || PLAN_TIMES[index] || `${9 + index}:00 a. m.`,
          title: card.title,
          subtitle: asString(rawStops[index]?.subtitle) || [card.category, card.location].filter(Boolean).join(" · "),
          imageUrl: card.imageUrl,
        }))
      : asStringArray(planRaw.experiences).map((title, index) => ({
          time: asString(rawStops[index]?.time) || PLAN_TIMES[index] || `${9 + index}:00 a. m.`,
          title: asString(rawStops[index]?.title) || title,
          subtitle: asString(rawStops[index]?.subtitle),
          imageUrl: null,
        }));
  const tags = asStringArray(planRaw.tags).slice(0, 3);
  const fromCards = [...new Set(cards.map((item) => item.category).filter(Boolean))] as string[];
  return {
    title: asString(planRaw.title) || "Plan Entre Caminos",
    city: asString(planRaw.city) || cityFallback,
    date: asString(planRaw.date),
    duration: asString(planRaw.duration) || "1 día",
    people: asString(planRaw.people) || "2 personas",
    tags: tags.length ? tags : fromCards.slice(0, 3),
    coverImageUrl: cards[0]?.imageUrl ?? null,
    experiences: cards.length ? cards.map((item) => item.title) : asStringArray(planRaw.experiences),
    itinerary,
  };
}

function fallbackSearch(query: string, catalog: CatalogItem[]) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3);
  const scored = catalog
    .map((item) => {
      const hay = `${item.title} ${item.description} ${item.location} ${item.category ?? ""}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.item.id);
  return scored;
}

export async function chatWithGuide(input: {
  userId: string;
  message: string;
  history: AssistantChatMessage[];
  experienceId?: string;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const [profile, focus, published] = await Promise.all([
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
    input.experienceId
      ? prisma.experience.findFirst({
          where: { id: input.experienceId, status: "PUBLISHED" },
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

  const catalog: CatalogItem[] = published.map((item) => ({
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
    .slice(-12)
    .map((item) => `${item.role === "user" ? "Persona" : "Guía"}: ${item.content}`)
    .join("\n");

  const userBlock = [
    profile
      ? `Perfil: ciudad ${profile.city ?? "sin definir"}, intereses ${profile.interests.join(", ") || "sin definir"}, compañía ${profile.companions.join(", ") || "sin definir"}, presupuesto ${profile.budget.join(", ") || "sin definir"}, climas ${profile.climate.join(", ") || "sin definir"}.`
      : "Perfil: aún no hay preferencias guardadas.",
    input.location?.city ? `Ubicación actual declarada: ${input.location.city}.` : "",
    focus
      ? `Estás hablando de esta experiencia: ${focus.title}. Categoría: ${focus.category?.name ?? "N/A"}. Lugar: ${focus.location}. Precio: ${String(focus.price)}. Duración: ${focus.duration ?? "variable"}. Descripción: ${focus.description.slice(0, 500)}. Cómo llegar: ${focus.howToGetThere ?? "no indicado"}.`
      : "No hay una experiencia abierta. Eres el guía general.",
    "Catálogo (id | título | categoría | lugar | precio | duración):",
    catalog.map(catalogLine).join("\n") || "(vacío)",
    history ? `Conversación:\n${history}` : "",
    `Mensaje nuevo: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = parseGeminiJson(await generateGeminiText(SYSTEM, userBlock));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }

  if (!parsed) {
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }

  const ids = asStringArray(parsed.experienceIds);
  const planRaw = parsed.plan && typeof parsed.plan === "object" ? (parsed.plan as Record<string, unknown>) : null;
  const progressRaw =
    parsed.planProgress && typeof parsed.planProgress === "object"
      ? (parsed.planProgress as Record<string, unknown>)
      : null;
  let cards = hydrate(ids, catalog);
  if (planRaw) {
    const fromPlan = hydrate(asStringArray(planRaw.experiences), catalog);
    cards = [...cards, ...fromPlan.filter((item) => !cards.some((card) => card.id === item.id))].slice(0, 4);
  }

  let status = asString(parsed.status) as AssistantReply["status"];
  if (status !== "empty" && status !== "need_info") {
    status = "ok";
  }
  if (!cards.length && (asString(parsed.intent) === "recommend" || asString(parsed.intent) === "plan")) {
    cards = hydrate(fallbackSearch(input.message, catalog), catalog);
    if (!cards.length) {
      status = "empty";
    }
  }

  const plan = planRaw ? buildPlan(planRaw, cards, profile?.city || "") : null;

  return {
    reply:
      asString(parsed.reply) ||
      (status === "empty"
        ? "No encontré experiencias exactas, pero puedo buscar alternativas."
        : "Cuéntame un poco más para afinarte el plan."),
    intent: (["chat", "clarify", "recommend", "plan", "experience"].includes(asString(parsed.intent))
      ? asString(parsed.intent)
      : "chat") as AssistantReply["intent"],
    status,
    questions: asStringArray(parsed.questions).slice(0, 3),
    suggestions: asStringArray(parsed.suggestions).slice(0, 4),
    plan,
    planProgress:
      progressRaw && Number(progressRaw.step) > 0
        ? { step: Number(progressRaw.step), total: Number(progressRaw.total) || 5 }
        : null,
    experiences: cards,
  } satisfies AssistantReply;
}
