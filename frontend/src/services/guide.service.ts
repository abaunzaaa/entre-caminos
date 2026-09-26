import { api } from "./api";
import {
  chronologicalMessages,
  isPlaceholderTitle,
  titleFromText,
  type GuideStoredMessage,
  type GuideThread,
} from "../utils/guide-storage";

export type GuideMessagePayload = {
  role: "user" | "assistant";
  content: string;
};

export type GuideExperienceCard = {
  id: string;
  title: string;
  location: string;
  price: string | number;
  duration: string | null;
  category: string | null;
  imageUrl: string | null;
};

export type GuidePlan = {
  title: string;
  city: string;
  date?: string;
  duration: string;
  people: string;
  tags?: string[];
  coverImageUrl?: string | null;
  experiences: string[];
  itinerary?: Array<{
    time: string;
    title: string;
    subtitle: string;
    imageUrl: string | null;
  }>;
};

export type GuideConversation = {
  id: string;
  userId: string;
  title: string;
  contextType: "general" | "experience";
  experienceId: string | null;
  experienceName: string | null;
  experienceData: {
    id?: string;
    name?: string;
    category?: string;
    location?: string;
    price?: string | number;
    duration?: string;
    description?: string;
    availableDays?: unknown;
    howToGetThere?: string;
    imageUrl?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  pinned?: boolean;
  folderId?: string | null;
  messages: GuideStoredMessage[];
};

export type GuideReply = {
  reply: string;
  intent: "chat" | "clarify" | "recommend" | "plan" | "experience";
  status: "ok" | "empty" | "need_info";
  questions: string[];
  suggestions: string[];
  plan: GuidePlan | null;
  planProgress: { step: number; total: number } | null;
  experiences: GuideExperienceCard[];
  conversation: GuideConversation;
};

export function conversationToThread(conversation: GuideConversation): GuideThread {
  const firstUser = conversation.messages?.find((item) => item.role === "user" && item.content.trim());
  const stored = conversation.title?.trim() || "";
  const generated = firstUser ? titleFromText(firstUser.content) : "Nueva conversación";
  const title =
    stored && !isPlaceholderTitle(stored)
      ? stored
      : generated !== "Nueva conversación"
        ? generated
        : stored || "Nueva conversación";
  return {
    id: conversation.id,
    title,
    updatedAt: conversation.updatedAt,
    experienceId: conversation.experienceId ?? undefined,
    experienceName: conversation.experienceName ?? undefined,
    folderId: conversation.folderId ?? undefined,
    favorite: Boolean(conversation.favorite),
    pinned: Boolean(conversation.pinned),
    messages: chronologicalMessages(conversation.messages),
  };
}

export async function listGuideConversations() {
  const { data } = await api.get<{ success: boolean; data: { conversations: GuideConversation[] } }>(
    "/assistant/conversations",
  );
  return data.data.conversations;
}

export async function getGuideConversation(id: string) {
  const { data } = await api.get<{ success: boolean; data: { conversation: GuideConversation } }>(
    `/assistant/conversations/${id}`,
  );
  return data.data.conversation;
}

export async function createGuideConversation(payload?: {
  contextType?: "general" | "experience";
  experienceId?: string;
  experienceName?: string;
  experienceData?: GuideConversation["experienceData"];
  starter?: "plan" | "search" | "nearby" | "interests";
}) {
  const { data } = await api.post<{ success: boolean; data: { conversation: GuideConversation } }>(
    "/assistant/conversations",
    payload ?? {},
  );
  return data.data.conversation;
}

export async function patchGuideConversation(
  id: string,
  payload: { favorite?: boolean; pinned?: boolean; folderId?: string | null; title?: string },
) {
  const { data } = await api.patch<{ success: boolean; data: { conversation: GuideConversation } }>(
    `/assistant/conversations/${id}`,
    payload,
  );
  return data.data.conversation;
}

export async function deleteGuideConversation(id: string) {
  await api.delete(`/assistant/conversations/${id}`);
}

export type GuideFolderPayload = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  createdAt: string;
};

export async function listGuideFolders() {
  const { data } = await api.get<{ success: boolean; data: { folders: GuideFolderPayload[] } }>(
    "/assistant/folders",
  );
  return data.data.folders;
}

export async function createGuideFolder(payload: { name: string; icon?: string }) {
  const { data } = await api.post<{ success: boolean; data: { folder: GuideFolderPayload } }>(
    "/assistant/folders",
    payload,
  );
  return data.data.folder;
}

export async function patchGuideFolder(id: string, payload: { name?: string; icon?: string }) {
  const { data } = await api.patch<{ success: boolean; data: { folder: GuideFolderPayload } }>(
    `/assistant/folders/${id}`,
    payload,
  );
  return data.data.folder;
}

export async function deleteGuideFolder(id: string) {
  await api.delete(`/assistant/folders/${id}`);
}

export async function sendGuideMessage(payload: {
  message?: string;
  conversationId?: string;
  regenerate?: boolean;
  history?: GuideMessagePayload[];
  experienceId?: string;
  context?: {
    mode: "general" | "experience";
    experience?: GuideConversation["experienceData"];
  };
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const { data } = await api.post<{ success: boolean; data: GuideReply }>("/assistant/chat", payload);
  return data.data;
}
