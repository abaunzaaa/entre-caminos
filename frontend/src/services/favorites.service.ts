import { api } from "./api";
import type { Experience } from "../types";

type ApiResponse<T> = { success: boolean; data: T };

export async function listFavoriteExperiences(options?: { limit?: number }) {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/favorites", {
    params: options?.limit ? { limit: options.limit } : undefined,
  });
  return data.data.experiences;
}

let favoriteIdsInflight: Promise<string[]> | null = null;

/** Ids publicados. Comparte la petición en curso entre el home y la guía. */
export function listFavoriteIds() {
  if (!favoriteIdsInflight) {
    favoriteIdsInflight = api
      .get<ApiResponse<{ ids: string[] }>>("/favorites", { params: { ids: 1 } })
      .then((response) => response.data.data.ids)
      .finally(() => {
        favoriteIdsInflight = null;
      });
  }
  return favoriteIdsInflight;
}

export async function getFavoriteStatus(experienceId: string) {
  const { data } = await api.get<ApiResponse<{ favorited: boolean }>>(`/favorites/${experienceId}`);
  return Boolean(data.data.favorited);
}

export async function addFavorite(experienceId: string, options?: { collectionIds?: string[] }) {
  const { data } = await api.post<ApiResponse<{ favorited: boolean; collectionIds?: string[] }>>(
    `/favorites/${experienceId}`,
    options?.collectionIds?.length ? { collectionIds: options.collectionIds } : undefined,
  );
  return Boolean(data.data.favorited);
}

export async function removeFavorite(experienceId: string) {
  const { data } = await api.delete<ApiResponse<{ favorited: boolean }>>(`/favorites/${experienceId}`);
  return Boolean(data.data.favorited);
}
