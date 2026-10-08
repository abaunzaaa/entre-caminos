import { api } from "./api";

type ApiResponse<T> = { success: boolean; data: T };

let visitedIdsInflight: Promise<string[]> | null = null;

export function listVisitedIds() {
  if (!visitedIdsInflight) {
    visitedIdsInflight = api
      .get<ApiResponse<{ ids: string[] }>>("/visits")
      .then((response) => response.data.data.ids)
      .finally(() => {
        visitedIdsInflight = null;
      });
  }
  return visitedIdsInflight;
}

export async function getVisitedStatus(experienceId: string) {
  const { data } = await api.get<ApiResponse<{ visited: boolean }>>(`/visits/${experienceId}`);
  return Boolean(data.data.visited);
}

export async function addVisit(experienceId: string) {
  const { data } = await api.post<ApiResponse<{ visited: boolean }>>(`/visits/${experienceId}`);
  return Boolean(data.data.visited);
}

export async function removeVisit(experienceId: string) {
  const { data } = await api.delete<ApiResponse<{ visited: boolean }>>(`/visits/${experienceId}`);
  return Boolean(data.data.visited);
}
