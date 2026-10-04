import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Experience } from "../../types";
import fotoInicioTurista from "../../assets/foto-inicio-turista.png";
import { ExperienceGallery } from "./ExperienceGallery";
import { municipalityLabel } from "./explorer-media";
import { formatExperienceCategories } from "../../utils/experience-categories";

type TouristHomeHeroProps = {
  experiences: Experience[];
  selected: Experience | null;
  onSelect: (experience: Experience) => void;
  recommendationsLoading?: boolean;
  hasInterests?: boolean;
  interestsHref?: string;
};

function HeroShowcaseStatus({
  loading,
  hasInterests,
  interestsHref,
}: {
  loading: boolean;
  hasInterests: boolean;
  interestsHref?: string;
}) {
  let kicker = "Nuevos caminos";
  let title = "Aún no encontramos experiencias relacionadas con tus intereses";
  let note = "Pronto habrá más por descubrir";

  if (loading) {
    kicker = "Preparando tu camino";
    title = "Estamos buscando experiencias pensadas para ti";
    note = "";
  } else if (!hasInterests) {
    kicker = "Personaliza tu camino";
    title = "Cuéntanos qué te gusta para elegir experiencias para ti";
    note = "";
  }

  return (
    <div className="tourist-hero__showcase-card" role="status">
      <p className="tourist-hero__kicker">{kicker}</p>
      <p className="tourist-hero__title">{title}</p>
      {note ? <p className="tourist-hero__place">{note}</p> : null}
      {!loading && !hasInterests && interestsHref ? (
        <Link to={interestsHref} className="tourist-hero__cta">
          Elegir intereses
        </Link>
      ) : null}
    </div>
  );
}

export function TouristHomeHero({
  experiences,
  selected,
  onSelect,
  recommendationsLoading = false,
  hasInterests = false,
  interestsHref,
}: TouristHomeHeroProps) {
  const place = selected ? municipalityLabel(selected.location) : "";
  const category = selected ? formatExperienceCategories(selected, "Experiencia") : "Experiencia";

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
            <span className="tourist-hero__bloom" aria-hidden="true" />
            <header className="tourist-hero__intro">
              <h1 className="explorer-discover-title">Caminos elegidos para ti</h1>
              <p className="explorer-discover-lead">Inspirado en tus intereses</p>
            </header>
            {selected ? (
              <>
                <p className="tourist-hero__kicker">{category}</p>
                <h2 className="tourist-hero__title">{selected.title}</h2>
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
                <p className="tourist-hero__kicker">Entre Caminos</p>
                <h2 className="tourist-hero__title">Descubre tu próximo camino</h2>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tourist-hero__showcase">
        {experiences.length > 0 ? (
          <ExperienceGallery
            experiences={experiences}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
          />
        ) : (
          <HeroShowcaseStatus
            loading={recommendationsLoading}
            hasInterests={hasInterests}
            interestsHref={interestsHref}
          />
        )}
      </div>
    </section>
  );
}
