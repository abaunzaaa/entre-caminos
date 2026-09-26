import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Experience } from "../../types";
import fotoInicioTurista from "../../assets/foto-inicio-turista.png";
import { ExperienceGallery } from "./ExperienceGallery";
import { municipalityLabel } from "./explorer-media";

type TouristHomeHeroProps = {
  experiences: Experience[];
  selected: Experience | null;
  onSelect: (experience: Experience) => void;
};

export function TouristHomeHero({ experiences, selected, onSelect }: TouristHomeHeroProps) {
  const place = selected ? municipalityLabel(selected.location) : "";
  const category = selected?.category?.name ?? "Experiencia";

  return (
    <section className="tourist-hero" aria-label="Elegidos para ti">
      <img
        className="tourist-hero__decor"
        src={fotoInicioTurista}
        alt=""
        draggable={false}
        decoding="async"
        aria-hidden="true"
      />

      <div className="tourist-hero__panel">
        <div className="tourist-hero__sheet">
          <span className="tourist-hero__sheet-art" aria-hidden="true" />
          <div className="tourist-hero__copy">
            {selected ? (
              <>
                <span className="tourist-hero__bloom" aria-hidden="true" />
                <p className="tourist-hero__kicker">{category}</p>
                <h1 className="tourist-hero__title">{selected.title}</h1>
                {place ? (
                  <p className="tourist-hero__place">
                    <MapPin size={14} strokeWidth={1.85} aria-hidden="true" />
                    <span>{place}</span>
                  </p>
                ) : null}
                <Link to={`/explorar/${selected.id}`} className="tourist-hero__cta">
                  Explorar experiencia
                </Link>
              </>
            ) : (
              <>
                <span className="tourist-hero__bloom" aria-hidden="true" />
                <p className="tourist-hero__kicker">Entre Caminos</p>
                <h1 className="tourist-hero__title">Descubre tu próximo camino</h1>
              </>
            )}
          </div>
        </div>
      </div>

      <ExperienceGallery
        experiences={experiences}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
      />
    </section>
  );
}
