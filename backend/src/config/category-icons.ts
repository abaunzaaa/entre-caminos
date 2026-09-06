export const DEFAULT_CATEGORY_ICON = "tags";

export const CATEGORY_ICON_IDS = [
  "tags",
  "nature",
  "culture",
  "art",
  "music",
  "sport",
  "adventure",
  "food",
  "coffee",
  "photo",
  "history",
  "family",
  "wellness",
  "education",
  "tech",
  "travel",
  "shopping",
  "events",
] as const;

export type CategoryIconId = (typeof CATEGORY_ICON_IDS)[number];

export function normalizeCategoryIcon(value: unknown): CategoryIconId {
  if (typeof value === "string" && CATEGORY_ICON_IDS.includes(value as CategoryIconId)) {
    return value as CategoryIconId;
  }
  return DEFAULT_CATEGORY_ICON;
}
