import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Experience } from "../../types";
import { ExperienceGallery } from "./ExperienceGallery";
import { municipalityLabel } from "./explorer-media";
type TouristHomeHeroProps = {
  experiences: Experience[];
  selected: Experience | null;
  onSelect: (experience: Experience) => void;
};

function normalizeCopy(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Editorial teaser for the explore hero: ~3–4 lines, whole sentences, no ellipsis. */
function summarizeLead(text: string, maxChars = 210) {
  const value = normalizeCopy(text);
  if (!value) {
    return "";
  }
  if (value.length <= maxChars) {
    return value;
  }

  const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [
    value,
  ];

  let summary = "";
  for (const sentence of sentences) {
    const next = summary ? `${summary} ${sentence}` : sentence;
    if (next.length > maxChars) {
      break;
    }
    summary = next;
    if (summary.length >= Math.min(140, maxChars * 0.65)) {
      break;
    }
  }

  if (summary) {
    return summary;
  }

  // Single long sentence: cut at the last natural pause before the limit.
  const window = value.slice(0, maxChars);
  const pause = Math.max(window.lastIndexOf("; "), window.lastIndexOf(", "), window.lastIndexOf(" — "), window.lastIndexOf(" - "));
  if (pause > maxChars * 0.45) {
    return `${window.slice(0, pause).trim()}.`;
  }

  const lastSpace = window.lastIndexOf(" ");
  const clipped = (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim();
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

function editorialLead(experience: Experience, place: string) {
  const category = experience.category?.name?.trim() || "territorio";
  const where = place || "Colombia";
  const raw = normalizeCopy(experience.description ?? "");

  if (raw.length >= 48) {
    const body = /^(vive|descubre|explora|sumérgete|disfruta|aprende|recorre)/i.test(raw)
      ? raw
      : `Vive una experiencia de ${category.toLowerCase()} en ${where}. ${raw}`;
    return summarizeLead(body);
  }

  return summarizeLead(
    `Vive una experiencia de ${category.toLowerCase()} en ${where}, pensada para conectar con el territorio. ` +
      `Descubre ${experience.title.trim()} y llévate un recuerdo auténtico lleno de sentido.`,
  );
}

export function TouristHomeHero({ experiences, selected, onSelect }: TouristHomeHeroProps) {
  const place = selected ? municipalityLabel(selected.location) : "";
  const category = selected?.category?.name ?? "Experiencia";
  const excerpt = selected ? editorialLead(selected, place) : "";

  return (
    <section className="tourist-hero" aria-label="Descubrir experiencias">
      <div className="tourist-hero__panel">
        <div className="tourist-hero__copy" key={selected?.id ?? "empty"}>
          {selected ? (
            <>
              <span className="tourist-hero__bloom" aria-hidden="true" />
              <p className="tourist-hero__kicker">{category}</p>
              <h1 className="tourist-hero__title">{selected.title}</h1>
              {place ? (
                <p className="tourist-hero__place">
                  <MapPin size={15} strokeWidth={1.85} aria-hidden="true" />
                  <span>{place}</span>
                </p>
              ) : null}
              {excerpt ? <p className="tourist-hero__lead">{excerpt}</p> : null}
              <Link to={`/explorar/${selected.id}`} className="tourist-hero__cta">
                Explorar experiencia
              </Link>
            </>
          ) : (
            <>
              <span className="tourist-hero__bloom" aria-hidden="true" />
              <p className="tourist-hero__kicker">Entre Caminos</p>
              <h1 className="tourist-hero__title">Descubre tu próximo camino</h1>
              <p className="tourist-hero__lead">
                Aún no hay experiencias publicadas. Vuelve pronto para explorar el territorio.
              </p>
            </>
          )}
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
