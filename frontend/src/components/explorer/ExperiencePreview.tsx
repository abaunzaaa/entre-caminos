import type { Experience } from "../../types";
import { experienceCoverUrl } from "./explorer-media";

type ExperiencePreviewProps = {
  experience: Experience;
  selected?: boolean;
  onSelect: (experience: Experience) => void;
};

export function ExperiencePreview({ experience, selected, onSelect }: ExperiencePreviewProps) {
  return (
    <button
      type="button"
      className={`experience-preview${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(experience)}
      aria-pressed={selected}
      aria-label={`Ver experiencia ${experience.title}`}
    >
      <img src={experienceCoverUrl(experience, 720)} alt="" loading="lazy" />
    </button>
  );
}
