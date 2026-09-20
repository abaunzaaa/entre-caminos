import { useEffect, useMemo, useState } from "react";
import type { Experience } from "../../types";
import { AnimatedExperienceColumn } from "./AnimatedExperienceColumn";

type ExperienceGalleryProps = {
  experiences: Experience[];
  selectedId: string | null;
  onSelect: (experience: Experience) => void;
};

type GalleryBreakpoint = "mobile" | "medium" | "large";

function useGalleryBreakpoint(): GalleryBreakpoint {
  const [breakpoint, setBreakpoint] = useState<GalleryBreakpoint>("large");

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 860px)");
    const mediumQuery = window.matchMedia("(max-width: 1099px)");

    const update = () => {
      if (mobileQuery.matches) {
        setBreakpoint("mobile");
      } else if (mediumQuery.matches) {
        setBreakpoint("medium");
      } else {
        setBreakpoint("large");
      }
    };

    update();
    mobileQuery.addEventListener("change", update);
    mediumQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      mediumQuery.removeEventListener("change", update);
    };
  }, []);

  return breakpoint;
}

function splitColumns(experiences: Experience[], count: 1 | 2 | 3) {
  const columns: Experience[][] = Array.from({ length: count }, () => []);
  experiences.forEach((item, index) => {
    columns[index % count].push(item);
  });

  const nonEmpty = columns.filter((column) => column.length > 0);
  if (nonEmpty.length === 0) {
    return columns;
  }

  return columns.map((column) => (column.length > 0 ? column : nonEmpty[0]));
}

export function ExperienceGallery({ experiences, selectedId, onSelect }: ExperienceGalleryProps) {
  const breakpoint = useGalleryBreakpoint();
  const columnCount: 1 | 2 | 3 =
    breakpoint === "large" ? 3 : breakpoint === "medium" ? 2 : 1;
  const columns = useMemo(
    () => splitColumns(experiences, columnCount),
    [experiences, columnCount],
  );

  if (experiences.length === 0) {
    return (
      <div className="experience-gallery experience-gallery--empty" aria-hidden="true">
        <div className="experience-gallery__placeholder" />
        <div className="experience-gallery__placeholder" />
        <div className="experience-gallery__placeholder experience-gallery__placeholder--tertiary" />
      </div>
    );
  }

  const animate = breakpoint !== "mobile";
  const configs: Array<{
    experiences: Experience[];
    direction: "up" | "down";
    durationSec: number;
    className: string;
  }> = [
    {
      experiences: columns[0] ?? [],
      direction: "down",
      durationSec: 34,
      className: "experience-column--primary",
    },
  ];

  if (columnCount >= 2) {
    configs.push({
      experiences: columns[1] ?? [],
      direction: "up",
      durationSec: 27,
      className: "experience-column--secondary",
    });
  }

  if (columnCount === 3) {
    configs.push({
      experiences: columns[2] ?? [],
      direction: "down",
      durationSec: 40,
      className: "experience-column--tertiary",
    });
  }

  return (
    <div
      className={`experience-gallery${breakpoint === "mobile" ? " experience-gallery--static" : ""}`}
      aria-label="Galería de experiencias"
    >
      {configs.map((config) => (
        <AnimatedExperienceColumn
          key={config.className}
          experiences={config.experiences}
          selectedId={selectedId}
          onSelect={onSelect}
          direction={config.direction}
          durationSec={config.durationSec}
          loop={animate}
          className={config.className}
        />
      ))}
    </div>
  );
}
