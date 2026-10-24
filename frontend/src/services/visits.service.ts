import { api } from "./api";

type ApiResponse<T> = { success: boolean; data: T };

export type VisitedJourneyStop = {
  id: string;
  title: string;
  imageUrl: string | null;
  imageUrls: string[];
  location: string;
  description: string;
  department: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  visitedAt: string;
  venueCount: number;
  categories: Array<{ id: string; name: string }>;
};

export async function listVisitedJourney() {
  const { data } = await api.get<ApiResponse<{ stops: VisitedJourneyStop[] }>>("/visits/journey");
  return data.data.stops;
}

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
