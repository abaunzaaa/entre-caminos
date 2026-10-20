import { Info, MapPin, Star } from "lucide-react";
import { EXPERIENCE_DETAIL_SECTIONS } from "../../utils/experience-detail-sections";

const SECTIONS = [
  { id: EXPERIENCE_DETAIL_SECTIONS.info, label: "Información", icon: Info },
  { id: EXPERIENCE_DETAIL_SECTIONS.location, label: "Ubicación", icon: MapPin },
  { id: EXPERIENCE_DETAIL_SECTIONS.reviews, label: "Reseñas", icon: Star },
] as const;

type ExperienceDetailNavProps = {
  active: string;
  onChange: (id: string) => void;
};

export function ExperienceDetailNav({ active, onChange }: ExperienceDetailNavProps) {
  return (
    <nav className="experience-detail-nav" role="tablist" aria-label="Secciones de la experiencia">
      {SECTIONS.map((section) => {
        const selected = active === section.id;
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            className={`experience-detail-nav__tab${selected ? " is-active" : ""}`}
            aria-selected={selected}
            aria-controls="experience-detail-panel"
            onClick={() => onChange(section.id)}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="experience-detail-nav__label">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
