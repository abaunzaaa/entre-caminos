import { api } from "./api";

export type JourneyTheme = "olive" | "cream" | "sand" | "sage";
export type JourneyBackground = "cream" | "linen" | "olive" | "pressed";
export type JourneyStickerKey = "leaf" | "bloom" | "sprig" | "fern" | "sun" | "ribbon" | "compass" | "cup" | "heart" | "star" | "camera";

export type JourneyExperience = {
  id: string;
  title: string;
  imageUrl: string | null;
  location: string;
  description?: string;
  category: string;
  status?: string;
};

export type JourneyPlan = {
  id: string;
  plannedAt: string;
  experience: JourneyExperience;
};

export type JourneyDecoration = {
  id: string;
  kind: string;
  stickerKey: string | null;
  text: string | null;
  color: string | null;
  day: string | null;
  x: number;
  y: number;
  rotation: number;
};

export type JourneyPhoto = { id: string; url: string; sortOrder: number };

export type JourneyMemorySticker = {
  id: string;
  stickerKey: string;
  x: number;
  y: number;
  rotation: number;
};

export type JourneyMemory = {
  id: string;
  title: string;
  happenedOn: string;
  story: string;
  background: string;
  attended: boolean;
  planId: string | null;
  experience: Omit<JourneyExperience, "category" | "status"> | null;
  photos: JourneyPhoto[];
  stickers: JourneyMemorySticker[];
};

export type JourneyBundle = {
  board: { theme: JourneyTheme };
  plans: JourneyPlan[];
  decorations: JourneyDecoration[];
  memories: JourneyMemory[];
};

type ApiResponse<T> = { success: boolean; data: T };

export async function loadJourney() {
  const { data } = await api.get<ApiResponse<JourneyBundle>>("/journeys");
  return data.data;
}

export async function searchJourneyCatalog(q: string, signal?: AbortSignal) {
  const { data } = await api.get<ApiResponse<{ experiences: JourneyExperience[] }>>("/journeys/catalog", {
    params: { q },
    signal,
  });
  return data.data.experiences;
}

export async function createJourneyPlan(input: { experienceId: string; plannedAt: string }) {
  const { data } = await api.post<ApiResponse<{ plan: JourneyPlan }>>("/journeys/plans", input);
  return data.data.plan;
}

export async function updateJourneyPlan(planId: string, plannedAt: string) {
  const { data } = await api.patch<ApiResponse<{ plan: JourneyPlan }>>(`/journeys/plans/${planId}`, { plannedAt });
  return data.data.plan;
}

export async function deleteJourneyPlan(planId: string) {
  await api.delete(`/journeys/plans/${planId}`);
}

export async function saveJourneyTheme(theme: JourneyTheme) {
  const { data } = await api.put<ApiResponse<{ board: { theme: JourneyTheme } }>>("/journeys/board", { theme });
  return data.data.board;
}

export async function createJourneyDecoration(input: {
  kind: "sticker" | "note";
  stickerKey?: JourneyStickerKey | null;
  text?: string | null;
  color?: string | null;
  day?: string | null;
  x?: number;
  y?: number;
  rotation?: number;
}) {
  const { data } = await api.post<ApiResponse<{ decoration: JourneyDecoration }>>("/journeys/decorations", input);
  return data.data.decoration;
}

export async function updateJourneyDecoration(
  decorationId: string,
  input: Partial<{ x: number; y: number; rotation: number; text: string; color: string; stickerKey: string }>,
) {
  const { data } = await api.patch<ApiResponse<{ decoration: JourneyDecoration }>>(
    `/journeys/decorations/${decorationId}`,
    input,
  );
  return data.data.decoration;
}

export async function deleteJourneyDecoration(decorationId: string) {
  await api.delete(`/journeys/decorations/${decorationId}`);
}

export type MemoryInput = {
  title: string;
  happenedOn: string;
  story?: string;
  background?: JourneyBackground;
  experienceId?: string | null;
  planId?: string | null;
  attended?: boolean;
};

export async function createJourneyMemory(input: MemoryInput) {
  const { data } = await api.post<ApiResponse<{ memory: JourneyMemory }>>("/journeys/memories", input);
  return data.data.memory;
}

export async function updateJourneyMemory(memoryId: string, input: MemoryInput) {
  const { data } = await api.patch<ApiResponse<{ memory: JourneyMemory }>>(`/journeys/memories/${memoryId}`, input);
  return data.data.memory;
}

export async function deleteJourneyMemory(memoryId: string) {
  await api.delete(`/journeys/memories/${memoryId}`);
}

export async function uploadJourneyPhoto(memoryId: string, file: File) {
  const body = new FormData();
  body.append("image", file);
  const { data } = await api.post<ApiResponse<{ photo: JourneyPhoto }>>(`/journeys/memories/${memoryId}/photos`, body);
  return data.data.photo;
}

export async function deleteJourneyPhoto(memoryId: string, photoId: string) {
  await api.delete(`/journeys/memories/${memoryId}/photos/${photoId}`);
}

export async function addJourneyMemorySticker(memoryId: string, stickerKey: JourneyStickerKey, x = 24, y = 28) {
  const { data } = await api.post<ApiResponse<{ sticker: JourneyMemorySticker }>>(
    `/journeys/memories/${memoryId}/stickers`,
    { stickerKey, x, y, rotation: -8 },
  );
  return data.data.sticker;
}

export async function moveJourneyMemorySticker(
  memoryId: string,
  stickerId: string,
  stickerKey: string,
  x: number,
  y: number,
  rotation: number,
) {
  const { data } = await api.patch<ApiResponse<{ sticker: JourneyMemorySticker }>>(
    `/journeys/memories/${memoryId}/stickers/${stickerId}`,
    { stickerKey, x, y, rotation },
  );
  return data.data.sticker;
}

export async function deleteJourneyMemorySticker(memoryId: string, stickerId: string) {
  await api.delete(`/journeys/memories/${memoryId}/stickers/${stickerId}`);
}
