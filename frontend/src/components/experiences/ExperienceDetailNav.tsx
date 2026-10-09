import { useEffect, useState } from "react";
import { EXPERIENCE_DETAIL_SECTIONS, scrollToExperienceSection } from "../../utils/experience-detail-sections";

const SECTIONS = [
  { id: EXPERIENCE_DETAIL_SECTIONS.info, label: "Información" },
  { id: EXPERIENCE_DETAIL_SECTIONS.location, label: "Ubicación" },
  { id: EXPERIENCE_DETAIL_SECTIONS.reviews, label: "Reseñas" },
] as const;

export function ExperienceDetailNav() {
  const [active, setActive] = useState<string>(EXPERIENCE_DETAIL_SECTIONS.info);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!nodes.length || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!SECTIONS.some((section) => section.id === id) && id !== EXPERIENCE_DETAIL_SECTIONS.ownReview) {
      return;
    }
    const timer = window.setTimeout(() => scrollToExperienceSection(id), 60);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <nav className="experience-detail-nav" aria-label="Secciones de la experiencia">
      {SECTIONS.map((section) => {
        const selected = active === section.id;
        return (
          <button
            key={section.id}
            type="button"
            className={`experience-detail-nav__tab${selected ? " is-active" : ""}`}
            aria-current={selected ? "true" : undefined}
            onClick={() => {
              setActive(section.id);
              scrollToExperienceSection(section.id);
            }}
          >
            <span className="experience-detail-nav__label">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
