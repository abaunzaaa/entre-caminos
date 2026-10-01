import { api } from "./api";
import type { Experience } from "../types";

type ApiResponse<T> = { success: boolean; data: T };

export async function listFavoriteExperiences(options?: { limit?: number }) {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/favorites", {
    params: options?.limit ? { limit: options.limit } : undefined,
  });
  return data.data.experiences;
}

export async function getFavoriteStatus(experienceId: string) {
  const { data } = await api.get<ApiResponse<{ favorited: boolean }>>(`/favorites/${experienceId}`);
  return Boolean(data.data.favorited);
}

export async function addFavorite(experienceId: string) {
  const { data } = await api.post<ApiResponse<{ favorited: boolean }>>(`/favorites/${experienceId}`);
  return Boolean(data.data.favorited);
}

export async function removeFavorite(experienceId: string) {
  const { data } = await api.delete<ApiResponse<{ favorited: boolean }>>(`/favorites/${experienceId}`);
  return Boolean(data.data.favorited);
}
