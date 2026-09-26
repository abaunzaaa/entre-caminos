import type { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { chatWithGuide, type AssistantChatMessage, type AssistantReply } from "./assistant.service.js";
import type { GuideChatContext, GuideExperienceContext } from "./context.service.js";
import { assertOwnedFolder } from "./folder.service.js";

const WELCOME_SUGGESTIONS = ["¿Qué incluye?", "¿Cuánto dura?", "¿Cómo llegar?", "¿Qué debo llevar?", "Armar un plan con esto"];

export type StoredExperienceData = GuideExperienceContext & { imageUrl?: string };

export type SerializedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  experiences?: unknown;
  plan?: unknown;
  planProgress?: unknown;
  suggestions?: string[];
  status?: string;
};

export type SerializedConversation = {
  id: string;
  userId: string;
  title: string;
  contextType: "general" | "experience";
  experienceId: string | null;
  experienceName: string | null;
  experienceData: StoredExperienceData | null;
  favorite: boolean;
  pinned: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
};

const GENERIC_TITLES = new Set(["hola", "hoy", "ok", "okay", "sí", "si", "no", "gracias", "hey", "buenas", "hello", "hi"]);

const PLACEHOLDER_TITLES = new Set([
  "nueva conversación",
  "nuevo chat",
  "hoy",
  "ayer",
  "creando un plan",
  "nuevo plan",
  "buscar experiencias",
  "explorar cerca",
  "según mis intereses",
]);

export function isPlaceholderTitle(value?: string | null) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!clean || PLACEHOLDER_TITLES.has(clean)) {
    return true;
  }
  if (/^(hoy|ayer)$/.test(clean)) {
    return true;
  }
  if (/^\d{1,2}:\d{2}/.test(clean) && clean.length < 20) {
    return true;
  }
  if (/\b(a\.?\s*m\.?|p\.?\s*m\.?)\b/.test(clean) && clean.length < 22) {
    return true;
  }
  return false;
}

function clipTitle(value: string) {
  return value.length <= 42 ? value : `${value.slice(0, 42).trim()}…`;
}

export function conversationTitleFromText(value: string) {
  let clean = value.replace(/\s+/g, " ").trim();
  clean = clean.replace(/^[¿¡]+/, "").replace(/[?!.]+$/g, "").trim();
  const lower = clean.toLowerCase();
  if (!clean) {
    return "Nueva conversación";
  }
  if (PLACEHOLDER_TITLES.has(lower) || /^(hoy|ayer)$/.test(lower)) {
    return "Nueva conversación";
  }
  if (/^\d{1,2}:\d{2}/.test(lower) && clean.length < 20) {
    return "Nueva conversación";
  }
  if (GENERIC_TITLES.has(lower) && lower !== "hoy") {
    return clipTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
  }
  if (clean.length < 3) {
    return "Nueva conversación";
  }

  const hacer = clean.match(/^qu[eé]\s+(puedo\s+|podemos\s+)?hacer\s+(en|por)\s+(.+)$/i);
  if (hacer) {
    const place = hacer[3].trim();
    return clipTitle(`Experiencias en ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  const experiencias = clean.match(/experiencias?\s+(.+?)\s+en\s+(.+)$/i);
  if (experiencias) {
    const kind = experiencias[1].trim();
    const place = experiencias[2].trim();
    return clipTitle(`Experiencias ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  let rest = clean
    .replace(/^(créame|creame|crea|quiero|necesito|busca|búscame|buscame)\s+/i, "")
    .replace(/^(un|una|el|la)\s+/i, "")
    .trim();

  const planEn = rest.match(/^plan(?:\s+de)?\s+(.+?)\s+en\s+(.+)$/i);
  if (planEn) {
    const kind = planEn[1].trim();
    const place = planEn[2].trim();
    return clipTitle(`Plan ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  const conocer = clean.match(/(?:conocer\s+)?(?:lugares|experiencias?)\s+([^]+?)\s+en\s+(.+)$/i);
  if (conocer) {
    const kind = conocer[1].trim();
    const place = conocer[2].trim();
    return clipTitle(`Experiencias ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  if (/^plan(\b)/i.test(rest)) {
    rest = rest.replace(/^plan\s*/i, "Plan ").replace(/^Plan\s+de\s+/i, "Plan de ");
    if (!/^Plan\b/.test(rest)) {
      rest = `Plan ${rest}`;
    }
  }

  if (rest) {
    rest = rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  const titled = rest || clean.charAt(0).toUpperCase() + clean.slice(1);
  return clipTitle(titled);
}

function repairedTitle(current: string, messages?: Array<{ role: string; content: string }>) {
  if (!isPlaceholderTitle(current)) {
    return current;
  }
  const firstUser = messages?.find((item) => item.role === "user" && item.content.trim());
  if (!firstUser) {
    return current || "Nueva conversación";
  }
  const generated = conversationTitleFromText(firstUser.content);
  return generated === "Nueva conversación" ? current || "Nueva conversación" : generated;
}

export function conversationTitleFromPlan(plan: {
  title?: string | null;
  city?: string | null;
  people?: string | null;
  tags?: string[] | null;
}) {
  const explicit = plan.title?.replace(/\s+/g, " ").trim();
  if (explicit && !isPlaceholderTitle(explicit) && !/^plan(es)?$/i.test(explicit)) {
    return clipTitle(explicit);
  }
  const parts = ["Plan"];
  const tag = plan.tags?.find((item) => item.trim());
  if (tag) {
    parts.push(tag.trim().toLowerCase());
  }
  if (plan.city?.trim()) {
    parts.push(plan.city.trim());
  }
  const people = plan.people?.trim();
  if (people && !/^solo$/i.test(people)) {
    parts.push(`con ${people.toLowerCase()}`);
  }
  const titled = parts.join(" ");
  return clipTitle(titled.charAt(0).toUpperCase() + titled.slice(1));
}

export const FLOW_STARTERS = {
  plan: {
    title: "Creando un plan",
    content:
      "¡Claro! Te ayudo a crear un plan personalizado 😊\n\nPrimero cuéntame:\n¿Qué tipo de experiencia quieres realizar?",
    suggestions: ["Cultura", "Naturaleza", "Gastronomía", "Aventura", "Relax", "Otra"],
  },
  search: {
    title: "Buscar experiencias",
    content: "Claro. ¿Qué tipo de experiencia estás buscando?",
    suggestions: ["Naturaleza", "Cultura", "Gastronomía", "Aventura"],
  },
  nearby: {
    title: "Explorar cerca",
    content: "Puedo sugerirte planes cerca de ti. ¿Usamos tu ubicación guardada o prefieres decirme un barrio o ciudad?",
    suggestions: ["Usa mi ubicación", "Medellín", "Otro lugar"],
  },
  interests: {
    title: "Según mis intereses",
    content: "Puedo recomendarte con base en tus intereses. ¿Quieres que te sugiera ahora o prefieres afinar el tipo de plan?",
    suggestions: ["Recomiéndame ahora", "Naturaleza", "Gastronomía", "Cultura"],
  },
} as const;

export type GuideFlowKind = keyof typeof FLOW_STARTERS;

function metadataOf(message: { metadata: Prisma.JsonValue | null }) {
  if (!message.metadata || typeof message.metadata !== "object" || Array.isArray(message.metadata)) {
    return {} as Record<string, unknown>;
  }
  return message.metadata as Record<string, unknown>;
}

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
}): SerializedMessage {
  const meta = metadataOf(message);
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    experiences: Array.isArray(meta.experiences) ? meta.experiences : undefined,
    plan: meta.plan ?? undefined,
    planProgress: meta.planProgress ?? undefined,
    suggestions: Array.isArray(meta.suggestions)
      ? (meta.suggestions as string[]).filter((item) => typeof item === "string" && !item.includes("?"))
      : undefined,
    status: typeof meta.status === "string" ? meta.status : undefined,
  };
}

function asContextType(value: string): "general" | "experience" {
  return value === "experience" ? "experience" : "general";
}

function serializeConversation(
  conversation: {
    id: string;
    userId: string;
    title: string;
    contextType: string;
    experienceId: string | null;
    experienceName: string | null;
    experienceData: Prisma.JsonValue | null;
    favorite?: boolean;
    pinned?: boolean;
    folderId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages?: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
      metadata: Prisma.JsonValue | null;
    }>;
  },
  messages?: SerializedMessage[],
): SerializedConversation {
  const experienceData =
    conversation.experienceData && typeof conversation.experienceData === "object" && !Array.isArray(conversation.experienceData)
      ? (conversation.experienceData as StoredExperienceData)
      : null;
  return {
    id: conversation.id,
    userId: conversation.userId,
    title: repairedTitle(conversation.title, conversation.messages),
    contextType: asContextType(conversation.contextType),
    experienceId: conversation.experienceId,
    experienceName: conversation.experienceName,
    experienceData,
    favorite: Boolean(conversation.favorite),
    pinned: Boolean(conversation.pinned),
    folderId: conversation.folderId ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: messages ?? (conversation.messages ?? []).map(serializeMessage),
  };
}

async function getOwned(userId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    throw ApiError.notFound("Conversación no encontrada");
  }
  return conversation;
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 80,
      },
    },
  });
  await Promise.all(
    rows.map(async (row) => {
      const nextTitle = repairedTitle(row.title, row.messages);
      if (nextTitle && nextTitle !== row.title) {
        row.title = nextTitle;
        await prisma.conversation.update({
          where: { id: row.id },
          data: { title: nextTitle },
        });
      }
    }),
  );
  return rows.map((row) => serializeConversation(row));
}

export async function getConversation(userId: string, id: string) {
  return serializeConversation(await getOwned(userId, id));
}

export async function createConversation(
  userId: string,
  input?: {
    contextType?: "general" | "experience";
    experienceId?: string;
    experienceName?: string;
    experienceData?: StoredExperienceData | null;
    starter?: GuideFlowKind;
  },
) {
  const contextType = input?.experienceId || input?.contextType === "experience" ? "experience" : "general";
  const starter = input?.starter ? FLOW_STARTERS[input.starter] : null;
  const title = starter?.title || input?.experienceName?.trim() || "Nueva conversación";
  let experienceId = input?.experienceId;
  if (experienceId) {
    const found = await prisma.experience.findUnique({ where: { id: experienceId }, select: { id: true } });
    if (!found) {
      experienceId = undefined;
    }
  }
  const seed =
    starter
      ? {
          role: "assistant" as const,
          content: starter.content,
          metadata: { suggestions: [...starter.suggestions], intent: input?.starter, status: "need_info" } as Prisma.InputJsonValue,
        }
      : contextType === "experience"
        ? {
            role: "assistant" as const,
            content: "Estoy lista para ayudarte con esta experiencia.\n\n¿Qué quieres saber?",
            metadata: { suggestions: WELCOME_SUGGESTIONS },
          }
        : undefined;
  let experienceData = input?.experienceData ?? undefined;
  if (experienceData) {
    try {
      experienceData = JSON.parse(JSON.stringify(experienceData)) as StoredExperienceData;
    } catch {
      experienceData = undefined;
    }
  }
  const data = {
    userId,
    title,
    contextType,
    experienceId,
    experienceName: input?.experienceName,
    experienceData: experienceData as Prisma.InputJsonValue | undefined,
    messages: seed ? { create: seed } : undefined,
  };
  try {
    const conversation = await prisma.conversation.create({
      data,
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return serializeConversation(conversation);
  } catch {
    const conversation = await prisma.conversation.create({
      data: { ...data, experienceData: undefined },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return serializeConversation(conversation);
  }
}

export async function updateConversation(
  userId: string,
  id: string,
  input: { favorite?: boolean; pinned?: boolean; folderId?: string | null; title?: string },
) {
  await getOwned(userId, id);
  if (input.folderId) {
    await assertOwnedFolder(userId, input.folderId);
  }
  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      favorite: input.favorite,
      pinned: input.pinned,
      folderId: input.folderId === undefined ? undefined : input.folderId,
      title: input.title?.trim() || undefined,
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return serializeConversation(conversation);
}

export async function deleteConversation(userId: string, id: string) {
  await getOwned(userId, id);
  await prisma.conversation.delete({ where: { id } });
}

function historyFromMessages(messages: SerializedMessage[]): AssistantChatMessage[] {
  return messages
    .filter((item) => item.content.trim())
    .slice(-20)
    .map((item) => ({ role: item.role, content: item.content }));
}

export async function chatInConversation(input: {
  userId: string;
  message?: string;
  conversationId?: string;
  regenerate?: boolean;
  history?: AssistantChatMessage[];
  experienceId?: string;
  context?: GuideChatContext;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const contextExperience = input.context?.experience;
  const experienceId = input.experienceId || contextExperience?.id;
  let conversation = input.conversationId
    ? await getOwned(input.userId, input.conversationId)
    : null;

  if (!conversation) {
    const created = await createConversation(input.userId, {
      contextType: input.context?.mode === "experience" || experienceId ? "experience" : "general",
      experienceId,
      experienceName: contextExperience?.name,
      experienceData: contextExperience,
    });
    conversation = await getOwned(input.userId, created.id);
  }

  const stored = serializeConversation(conversation);
  const storedExperience = stored.experienceData ?? undefined;
  const context: GuideChatContext =
    stored.contextType === "experience"
      ? {
          mode: "experience",
          experience: {
            id: stored.experienceId ?? storedExperience?.id,
            name: stored.experienceName ?? storedExperience?.name,
            ...storedExperience,
          },
        }
      : input.context ?? { mode: "general" };

  let working = stored.messages;

  if (input.regenerate) {
    const lastUserIndex = [...working].map((item) => item.role).lastIndexOf("user");
    if (lastUserIndex < 0) {
      throw ApiError.badRequest("No hay un mensaje para regenerar");
    }
    const toRemove = working.slice(lastUserIndex + 1);
    if (toRemove.length) {
      await prisma.conversationMessage.deleteMany({
        where: { id: { in: toRemove.map((item) => item.id) } },
      });
    }
    working = working.slice(0, lastUserIndex + 1);
  }

  const content = (input.message ?? working.filter((item) => item.role === "user").at(-1)?.content ?? "").trim();
  if (!content) {
    throw ApiError.badRequest("Escribe un mensaje");
  }

  let currentTitle = conversation.title;
  if (!input.regenerate) {
    const firstUser = !working.some((item) => item.role === "user");
    const userRow = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content,
      },
    });
    const generated = conversationTitleFromText(content);
    const canReplace =
      generated !== "Nueva conversación" && (firstUser || isPlaceholderTitle(currentTitle));
    working = [...working, serializeMessage(userRow)];
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        title: canReplace ? generated : undefined,
        updatedAt: new Date(),
      },
    });
    if (canReplace) {
      currentTitle = generated;
    }
  }

  const prior = historyFromMessages(working.slice(0, -1));

  const reply: AssistantReply = await chatWithGuide({
    userId: input.userId,
    message: content,
    history: prior.length ? prior : input.history ?? [],
    experienceId: stored.experienceId ?? experienceId,
    context,
    location: input.location,
  });

  await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply.reply,
      metadata: {
        experiences: reply.experiences,
        plan: reply.plan,
        planProgress: reply.planProgress,
        suggestions: reply.suggestions.length ? reply.suggestions : undefined,
        status: reply.status,
        intent: reply.intent,
      } as Prisma.InputJsonValue,
    },
  });

  const applyPlanTitle =
    Boolean(reply.plan) &&
    (isPlaceholderTitle(currentTitle) ||
      /^(cultura|naturaleza|gastronom[ií]a|aventura|relax|otra)$/i.test(currentTitle.trim()));
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      title: applyPlanTitle && reply.plan ? conversationTitleFromPlan(reply.plan) : undefined,
      updatedAt: new Date(),
    },
  });

  const fresh = await getConversation(input.userId, conversation.id);
  return {
    ...reply,
    conversation: fresh,
  };
}

export type { AssistantChatMessage, AssistantReply };
