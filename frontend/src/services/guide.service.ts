import { api } from "./api";

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

export type GuideReply = {
  reply: string;
  intent: "chat" | "clarify" | "recommend" | "plan" | "experience";
  status: "ok" | "empty" | "need_info";
  questions: string[];
  suggestions: string[];
  plan: GuidePlan | null;
  planProgress: { step: number; total: number } | null;
  experiences: GuideExperienceCard[];
};

export async function sendGuideMessage(payload: {
  message: string;
  history: GuideMessagePayload[];
  experienceId?: string;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const { data } = await api.post<{ success: boolean; data: GuideReply }>("/assistant/chat", payload);
  return data.data;
}
