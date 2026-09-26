import { ApiError } from "../utils/api-error.js";
import { loadGuideContext, type GuideCatalogItem } from "./context.service.js";
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

type CatalogItem = GuideCatalogItem;

const SYSTEM = `Eres Tu guía, el asistente inteligente de Entre Caminos. Ayudas a usuarios a descubrir experiencias, resolver dudas y crear planes personalizados.

Habla en español, con tono cercano, calmado y premium. No eres un buscador: conversas, pides lo que falta y recomiendas con criterio.

Reglas:
- Si falta ciudad, fecha, compañía, presupuesto o interés para armar un plan, pregunta UNA cosa a la vez.
- Nunca inventes experiencias que no estén en el catálogo. Usa solo los id del catálogo.
- Si el catálogo está vacío, dilo con claridad: aún no hay experiencias publicadas. No inventes lugares ni precios.
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

function extractIds(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractIds);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return extractIds(record.id ?? record.experienceId ?? record.title ?? record.name);
  }
  return [];
}

function idsFromText(text: string, catalog: CatalogItem[]) {
  const lower = text.toLowerCase();
  return catalog
    .filter((item) => item.title.length > 3 && lower.includes(item.title.toLowerCase()))
    .map((item) => item.id);
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .filter((term) => !["encuentra", "encuentreme", "experiencia", "experiencias", "encajen", "gustos", "quiero", "recomiendame", "recomienda", "cerca", "plan", "planes", "lugar", "lugares", "segun", "mis"].includes(term));
  const scored = catalog
    .map((item) => {
      const hay = `${item.title} ${item.description} ${item.location} ${item.category ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((row) => row.item.id);
  return scored.length ? scored : catalog.slice(0, 4).map((item) => item.id);
}

export async function chatWithGuide(input: {
  userId: string;
  message: string;
  history: AssistantChatMessage[];
  experienceId?: string;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const { catalog, cityFallback, prompt } = await loadGuideContext(input);

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = parseGeminiJson(await generateGeminiText(SYSTEM, prompt));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }

  if (!parsed) {
    throw ApiError.unavailable("No pude encontrar información en este momento.");
  }

  const ids = [
    ...extractIds(parsed.experienceIds),
    ...extractIds(parsed.experiences),
    ...idsFromText(asString(parsed.reply), catalog),
  ];
  const planRaw = parsed.plan && typeof parsed.plan === "object" ? (parsed.plan as Record<string, unknown>) : null;
  const progressRaw =
    parsed.planProgress && typeof parsed.planProgress === "object"
      ? (parsed.planProgress as Record<string, unknown>)
      : null;
  let cards = hydrate(ids, catalog);
  if (planRaw) {
    const fromPlan = hydrate(extractIds(planRaw.experiences), catalog);
    cards = [...cards, ...fromPlan.filter((item) => !cards.some((card) => card.id === item.id))].slice(0, 4);
  }

  let status = asString(parsed.status) as AssistantReply["status"];
  if (status !== "empty" && status !== "need_info") {
    status = "ok";
  }
  const wantsCatalog =
    asString(parsed.intent) === "recommend" ||
    asString(parsed.intent) === "plan" ||
    asString(parsed.intent) === "experience" ||
    /experiencia|recomiend|buscar|gustos|cerca|plan|lugar/i.test(input.message);
  if (!cards.length && wantsCatalog && catalog.length) {
    cards = hydrate(fallbackSearch(input.message, catalog), catalog);
  }
  if (!cards.length && wantsCatalog) {
    status = "empty";
  }

  const emptyCatalog = catalog.length === 0;
  if (emptyCatalog) {
    status = "empty";
  }
  const plan = emptyCatalog || !planRaw ? null : buildPlan(planRaw, cards, cityFallback);

  return {
    reply: emptyCatalog
      ? "Aún no hay experiencias publicadas en Entre Caminos, así que no puedo mostrarte tarjetas ahora. Cuando el equipo publique el catálogo, aquí aparecerán recomendaciones reales."
      : asString(parsed.reply) ||
        (status === "empty"
          ? "No encontré experiencias exactas en el catálogo publicado. ¿Quieres que busque con otra ciudad, interés o presupuesto?"
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
