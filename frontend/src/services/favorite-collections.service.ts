import { api } from "./api";
import type { Experience } from "../types";

type ApiResponse<T> = { success: boolean; data: T };

export type FavoriteCollection = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  count: number;
  previewExperiences: Experience[];
  experiences?: Experience[];
};

export async function listFavoriteCollections() {
  const { data } = await api.get<ApiResponse<{ collections: FavoriteCollection[] }>>(
    "/favorites/collections",
  );
  return data.data.collections;
}

export async function getFavoriteCollection(collectionId: string) {
  const { data } = await api.get<ApiResponse<{ collection: FavoriteCollection }>>(
    `/favorites/collections/${collectionId}`,
  );
  return data.data.collection;
}

export async function createFavoriteCollection(payload: { name: string; experienceId?: string }) {
  const { data } = await api.post<ApiResponse<{ collection: FavoriteCollection }>>(
    "/favorites/collections",
    payload,
  );
  return data.data.collection;
}

export async function renameFavoriteCollection(collectionId: string, name: string) {
  const { data } = await api.patch<ApiResponse<{ collection: FavoriteCollection }>>(
    `/favorites/collections/${collectionId}`,
    { name },
  );
  return data.data.collection;
}

export async function deleteFavoriteCollection(collectionId: string) {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
    `/favorites/collections/${collectionId}`,
  );
  return data.data;
}

export async function addExperienceToCollection(collectionId: string, experienceId: string) {
  const { data } = await api.post<ApiResponse<{ collection: FavoriteCollection }>>(
    `/favorites/collections/${collectionId}/experiences`,
    { experienceId },
  );
  return data.data.collection;
}

export async function removeExperienceFromCollection(collectionId: string, experienceId: string) {
  const { data } = await api.delete<ApiResponse<{ collection: FavoriteCollection }>>(
    `/favorites/collections/${collectionId}/experiences/${experienceId}`,
  );
  return data.data.collection;
}

export async function setExperienceCollections(experienceId: string, collectionIds: string[]) {
  const { data } = await api.put<ApiResponse<{ favorited: boolean; collectionIds: string[] }>>(
    `/favorites/${experienceId}/collections`,
    { collectionIds },
  );
  return data.data;
}

export async function listCollectionsForExperience(experienceId: string) {
  const { data } = await api.get<ApiResponse<{ collectionIds: string[] }>>(
    `/favorites/${experienceId}/collections`,
  );
  return data.data.collectionIds;
}
