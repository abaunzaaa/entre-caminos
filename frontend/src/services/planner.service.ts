import type { AiPlanFolderKey } from "../data/ai-plan-folders";
import { api } from "./api";

export type PlanType = "aventura" | "tranquilo" | "romantico" | "familia" | "aire";
export type DurationKey = "1-2" | "3-5" | "5-8" | "8+";
export type PlannerCompanion = "Solo" | "En pareja" | "Amigos" | "Familia";

export type PlannerPreferences = {
  date: string;
  budgetCop: number;
  budgetChosen?: boolean;
  touched?: boolean;
  categoryIds: string[];
  interests: string[];
  environments: string[];
  companion: PlannerCompanion | "";
  durationKey: DurationKey | "";
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
  location?: string;
  price: number;
  currency: string;
  durationLabel: string | null;
  durationMinutes?: number | null;
  imageUrl: string | null;
  suggestedAt: string;
  suggestedEnd?: string;
  stopType?: "experience" | "suggestion";
  included?: boolean;
  additionalCost?: string;
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
  scheduleLabel?: string;
  budgetCop: number;
  estimatedCop: number;
  currency: string;
  costNotes?: string;
  planType: PlanType | null;
  note: string;
  coverImageUrl?: string | null;
  primaryExperienceId?: string | null;
  scheduleIsSuggested?: boolean;
  requestedMunicipality?: string;
  usedAlternativeMunicipality?: boolean;
  alternativeMessage?: string;
  stops: PlannerStop[];
};

export type PlannerListItem = {
  id: string;
  title: string;
  summary?: string;
  municipality: string;
  date: string;
  people: number;
  budgetCop?: number;
  durationKey?: DurationKey;
  folderKey?: AiPlanFolderKey;
  estimatedCop?: number;
  currency?: string;
  imageUrl?: string | null;
  category?: string;
  primaryExperienceId?: string | null;
  stops: number;
};

export async function loadPlannerOptions() {
  const { data } = await api.get<{ categories: { id: string; name: string }[]; municipalities: string[] }>("/planner/options");
  return data;
}

export async function generatePlanner(
  preferences: PlannerPreferences,
  avoid: string[] = [],
  hints?: { profileEnvironments?: string[]; profileCompanions?: string[] },
) {
  const body = { ...preferences };
  delete body.budgetChosen;
  delete body.touched;
  const { data } = await api.post<PlannerItinerary>("/planner/generate", {
    ...body,
    companion: preferences.companion || undefined,
    profileEnvironments: hints?.profileEnvironments ?? [],
    profileCompanions: hints?.profileCompanions ?? [],
    avoid,
  });
  return data;
}

export async function savePlanner(itinerary: PlannerItinerary, preferences: PlannerPreferences, folderKey: AiPlanFolderKey) {
  const { data } = await api.post<PlannerItinerary>("/planner/itineraries", {
    ...preferences,
    municipality: itinerary.municipality,
    alternativeMessage: itinerary.alternativeMessage ?? "",
    folderKey,
    title: itinerary.title,
    summary: itinerary.summary,
    why: itinerary.why,
    scheduleLabel: itinerary.scheduleLabel ?? "",
    costNotes: itinerary.costNotes ?? "",
    stops: itinerary.stops.map((stop) => ({
      experienceId: stop.experienceId,
      suggestedAt: stop.suggestedAt,
      suggestedEnd: stop.suggestedEnd ?? "",
      blurb: stop.description,
      title: stop.title,
      location: stop.location ?? stop.municipality,
      stopType: stop.stopType ?? "experience",
      included: stop.included ?? stop.stopType !== "suggestion",
      additionalCost: stop.additionalCost ?? "",
      durationMinutes: stop.durationMinutes ?? null,
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
