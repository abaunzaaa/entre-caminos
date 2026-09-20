import type { Experience } from "../../types";
import { ExperiencePreview } from "./ExperiencePreview";

type AnimatedExperienceColumnProps = {
  experiences: Experience[];
  selectedId: string | null;
  onSelect: (experience: Experience) => void;
  direction: "up" | "down";
  durationSec?: number;
  loop?: boolean;
  className?: string;
};

function loopedList(items: Experience[], minCount = 6) {
  if (items.length === 0) {
    return [];
  }
  const list = [...items];
  while (list.length < minCount) {
    list.push(...items);
  }
  return [...list, ...list];
}

export function AnimatedExperienceColumn({
  experiences,
  selectedId,
  onSelect,
  direction,
  durationSec = 28,
  loop = true,
  className = "",
}: AnimatedExperienceColumnProps) {
  const track = loop ? loopedList(experiences) : experiences;

  if (track.length === 0) {
    return null;
  }

  return (
    <div className={`experience-column experience-column--${direction} ${className}`.trim()}>
      <div
        className="experience-column__track"
        style={loop ? { animationDuration: `${durationSec}s` } : undefined}
      >
        {track.map((experience, index) => (
          <ExperiencePreview
            key={`${experience.id}-${index}`}
            experience={experience}
            selected={experience.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
