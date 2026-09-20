import { canonicalizeInterest, getPreferenceLabel } from "../data/onboarding";
import type { Experience } from "../types";

function normalizeMatchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Soft aliases between onboarding interests and catalog category names. */
const INTEREST_CATEGORY_HINTS: Record<string, string[]> = {
  naturaleza: ["naturaleza", "outdoor", "aire libre", "ecologia", "ecologia"],
  gastronomia: ["gastronomia", "comida", "cocina", "cafe", "cafe"],
  cultura: ["cultura", "patrimonio", "museo"],
  aventura: ["aventura", "extremo", "outdoor"],
  relajacion: ["relajacion", "bienestar", "spa", "mindfulness"],
  "arte y creatividad": ["arte", "creatividad", "creativo", "taller artistico"],
  deportes: ["deporte", "deportes", "fitness"],
  "historia y patrimonio": ["historia", "patrimonio", "museo"],
  musica: ["musica", "concierto", "festival"],
  talleres: ["taller", "talleres", "workshop"],
  "planes urbanos": ["urbano", "ciudad", "city"],
  cafe: ["cafe", "cafeteria"],
  fotografia: ["fotografia", "foto"],
  danza: ["danza", "baile"],
  literatura: ["literatura", "lectura", "libro"],
  "fiesta / vida nocturna": ["fiesta", "nocturna", "nightlife"],
};

const SHORT_TAB_LABELS: Record<string, string> = {
  naturaleza: "Naturaleza",
  gastronomia: "Gastronomía",
  cultura: "Cultura",
  aventura: "Aventura",
  relajacion: "Bienestar",
  "arte y creatividad": "Arte",
  deportes: "Deportes",
  "historia y patrimonio": "Historia",
  musica: "Música",
  talleres: "Talleres",
  "planes urbanos": "Urbano",
  cafe: "Café",
  fotografia: "Foto",
  danza: "Danza",
  literatura: "Lectura",
  "fiesta / vida nocturna": "Noche",
};

function interestKey(interest: string) {
  return normalizeMatchText(canonicalizeInterest(interest));
}

export function interestMatchesCategory(interest: string, categoryName?: string | null) {
  const category = normalizeMatchText(categoryName || "");
  if (!category) {
    return false;
  }
  const key = interestKey(interest);
  if (!key) {
    return false;
  }
  if (category === key || category.includes(key) || key.includes(category)) {
    return true;
  }
  const hints = INTEREST_CATEGORY_HINTS[key] ?? [];
  return hints.some((hint) => category.includes(hint) || hint.includes(category));
}

export function experienceMatchesInterest(experience: Experience, interest: string) {
  if (interestMatchesCategory(interest, experience.category?.name)) {
    return true;
  }
  const haystack = normalizeMatchText(
    `${experience.title} ${experience.description} ${experience.category?.name ?? ""}`,
  );
  const key = interestKey(interest);
  if (!key) {
    return false;
  }
  if (haystack.includes(key)) {
    return true;
  }
  const hints = INTEREST_CATEGORY_HINTS[key] ?? [];
  return hints.some((hint) => haystack.includes(hint));
}

function byNewest(left: Experience, right: Experience) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

export function shortInterestTabLabel(interest: string) {
  const key = interestKey(interest);
  return SHORT_TAB_LABELS[key] || getPreferenceLabel(canonicalizeInterest(interest));
}

export type RecommendationTab = {
  id: string;
  interest: string;
  label: string;
  shortLabel: string;
  experience: Experience;
};

/**
 * Builds up to 5 tabs from onboarding interests, each with one matching experience.
 * Falls back to recent category-based picks when the user has no interests.
 */
export function buildRecommendationTabs(
  experiences: Experience[],
  interests: string[],
  limit = 5,
): RecommendationTab[] {
  if (!experiences.length || limit < 1) {
    return [];
  }

  const pool = [...experiences].sort(byNewest);
  const used = new Set<string>();
  const tabs: RecommendationTab[] = [];

  const uniqueInterests = [
    ...new Set(interests.map((item) => canonicalizeInterest(item)).filter(Boolean)),
  ].slice(0, limit);

  for (const interest of uniqueInterests) {
    const match = pool.find(
      (experience) => !used.has(experience.id) && experienceMatchesInterest(experience, interest),
    );
    if (!match) {
      continue;
    }
    used.add(match.id);
    tabs.push({
      id: `interest:${interest}`,
      interest,
      label: getPreferenceLabel(interest),
      shortLabel: shortInterestTabLabel(interest),
      experience: match,
    });
    if (tabs.length >= limit) {
      return tabs;
    }
  }

  if (tabs.length > 0) {
    return tabs;
  }

  // No onboarding interests (or no matches): use up to 5 recent experiences by category.
  for (const experience of pool) {
    if (used.has(experience.id)) {
      continue;
    }
    const category = experience.category?.name?.trim() || "Para ti";
    used.add(experience.id);
    tabs.push({
      id: `fallback:${experience.id}`,
      interest: category,
      label: category,
      shortLabel: category.split(/\s+/)[0] || category,
      experience,
    });
    if (tabs.length >= limit) {
      break;
    }
  }

  return tabs;
}

/**
 * Picks up to `limit` experiences: one per user interest when possible,
 * then fills with recent leftovers.
 */
export function pickRecommendedExperiences(
  experiences: Experience[],
  interests: string[],
  limit = 4,
): Experience[] {
  return buildRecommendationTabs(experiences, interests, limit).map((tab) => tab.experience);
}
