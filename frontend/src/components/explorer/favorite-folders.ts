import type { Experience } from "../../types";
import { experienceCategoryNames } from "../../utils/experience-categories";
import { experienceCoverUrl, municipalityLabel } from "./explorer-media";

export type FavoriteFolderTone = "cream" | "rose" | "blue" | "sand";

export type FavoriteFolder = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  tone: FavoriteFolderTone;
  href?: string;
  count?: number;
};

const TONES: FavoriteFolderTone[] = ["cream", "rose", "blue", "sand"];

export function experiencesToFavoriteFolders(experiences: Experience[], limit = 4): FavoriteFolder[] {
  return experiences.slice(0, limit).map((experience, index) => ({
    id: experience.id,
    category: experienceCategoryNames(experience)[0] || "Experiencia",
    title: experience.title,
    subtitle: municipalityLabel(experience.location) || "Colombia",
    imageSrc: experienceCoverUrl(experience, 640),
    tone: TONES[index % TONES.length],
    href: `/explorar/${experience.id}`,
  }));
}
