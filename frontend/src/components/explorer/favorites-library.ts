import type { Experience } from "../../types";
import { experienceCategoryNames } from "../../utils/experience-categories";
import { experienceCoverUrl } from "./explorer-media";

export type FavoriteCategoryGroup = {
  key: string;
  name: string;
  count: number;
  /** Hasta 3 covers reales para el apilado visual de la carpeta. */
  imageSrcs: string[];
  experiences: Experience[];
};

/** Mismos tonos pastel que las carpetas de la vista de inicio. */
export type FavoriteCategoryTone = "cream" | "rose" | "blue" | "sand";

const TONES: FavoriteCategoryTone[] = ["cream", "rose", "blue", "sand"];

function categoryKey(name: string) {
  return name.trim().toLocaleLowerCase("es");
}

function coverStack(experiences: Experience[]) {
  return experiences.slice(0, 3).map((experience) => experienceCoverUrl(experience, 720));
}

/** Agrupa favoritos por cada categoría real que tengan asignada. */
export function groupFavoritesByCategory(experiences: Experience[]): FavoriteCategoryGroup[] {
  const groups = new Map<string, FavoriteCategoryGroup>();

  for (const experience of experiences) {
    const names = experienceCategoryNames(experience);
    const labels = names.length ? names : ["Experiencia"];

    for (const label of labels) {
      const key = categoryKey(label) || "experiencia";
      const existing = groups.get(key);
      if (existing) {
        if (!existing.experiences.some((item) => item.id === experience.id)) {
          existing.experiences.push(experience);
          existing.count = existing.experiences.length;
          existing.imageSrcs = coverStack(existing.experiences);
        }
        continue;
      }
      groups.set(key, {
        key,
        name: label,
        count: 1,
        imageSrcs: coverStack([experience]),
        experiences: [experience],
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
  );
}

export function favoriteCategoryTone(index: number): FavoriteCategoryTone {
  return TONES[index % TONES.length];
}
