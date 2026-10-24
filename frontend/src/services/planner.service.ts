import { api } from "./api";

export type PlanType = "aventura" | "tranquilo" | "romantico" | "familia" | "aire";
export type DurationKey = "1-2" | "3-5" | "5-8" | "8+";

export type PlannerPreferences = {
  date: string;
  budgetCop: number;
  categoryIds: string[];
  planType: PlanType;
  durationKey: DurationKey;
  municipality: string;
  people: number;
  note: string;
};

export type PlannerStop = {
  position: number;
  experienceId: string;
  title: string;
  description: string;
  category: string;
  municipality: string;
  price: number;
  currency: string;
  durationLabel: string | null;
  imageUrl: string | null;
  suggestedAt: string;
};

export type PlannerItinerary = {
  id?: string;
  title: string;
  summary: string;
  why: string;
  date: string;
  municipality: string;
  people: number;
  durationKey: DurationKey;
  durationLabel?: string | null;
  budgetCop: number;
  estimatedCop: number;
  currency: string;
  planType: PlanType;
  note: string;
  stops: PlannerStop[];
};

export type PlannerListItem = {
  id: string;
  title: string;
  municipality: string;
  date: string;
  people: number;
  stops: number;
};

export async function loadPlannerOptions() {
  const { data } = await api.get<{ categories: { id: string; name: string }[]; municipalities: string[] }>("/planner/options");
  return data;
}

export async function generatePlanner(preferences: PlannerPreferences, avoid: string[] = []) {
  const { data } = await api.post<PlannerItinerary>("/planner/generate", { ...preferences, avoid });
  return data;
}

export async function savePlanner(itinerary: PlannerItinerary, preferences: PlannerPreferences) {
  const { data } = await api.post<PlannerItinerary>("/planner/itineraries", {
    ...preferences,
    title: itinerary.title,
    summary: itinerary.summary,
    why: itinerary.why,
    stops: itinerary.stops.map((stop) => ({
      experienceId: stop.experienceId,
      suggestedAt: stop.suggestedAt,
      blurb: stop.description,
    })),
  });
  return data;
}

export async function listPlannerItineraries() {
  const { data } = await api.get<PlannerListItem[]>("/planner/itineraries");
  return data;
}

export async function loadPlannerItinerary(id: string) {
  const { data } = await api.get<PlannerItinerary>(`/planner/itineraries/${id}`);
  return data;
}
