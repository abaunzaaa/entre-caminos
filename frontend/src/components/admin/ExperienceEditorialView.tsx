import { useState, type CSSProperties } from "react";
import { Heart } from "lucide-react";
import { ExperienceEditorialDossier, type ExperienceEditorialFact } from "./ExperienceEditorialDossier";
import { ExperienceEditorialGallery } from "./ExperienceEditorialGallery";
import { ExperienceEditorialNearby } from "./ExperienceEditorialNearby";
import { ExperienceEditorialPlace } from "./ExperienceEditorialPlace";
import { formatDepartmentMunicipality } from "../../data/colombia-locations";
import { formatPrice } from "../../utils/cn";
import {
  displayExternalUrl,
  durationParts,
  formatAvailability,
  formatDuration,
} from "../../utils/experience-details";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Experience, ExperienceStatus } from "../../types";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente de revisión",
  PUBLISHED: "Activa",
  ARCHIVED: "Inactiva",
  REJECTED: "Rechazada",
};

function formatPublishedDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export type ExperienceEditorialViewProps = {
  experience: Experience;
  mode?: "admin" | "tourist";
  favoriteOn?: boolean;
  onFavoriteToggle?: () => void;
  nearbyHref?: (id: string) => string;
  fetchNearby?: () => Promise<Experience[]>;
};

export function buildExperienceEditorialFacts(
  experience: Experience,
  mode: "admin" | "tourist" = "admin",
): { noteFacts: ExperienceEditorialFact[]; detailFacts: ExperienceEditorialFact[] } {
  const published =
    experience.status === "PUBLISHED"
      ? formatPublishedDate(experience.reviewedAt || experience.createdAt)
      : "";
  const durationChoice = durationParts(experience.durationValue, experience.durationUnit);
  const durationText = durationChoice
    ? `${durationChoice.value} ${durationChoice.unitLabel}`
    : formatDuration(experience.durationValue, experience.durationUnit, experience.duration);

  const noteFacts: ExperienceEditorialFact[] =
    mode === "admin"
      ? [
          ...(experience.creator?.name ? [{ label: "Creada por", value: experience.creator.name }] : []),
          ...(experience.creator?.email ? [{ label: "Contacto", value: experience.creator.email }] : []),
          ...(published ? [{ label: "Fecha de publicación", value: published }] : []),
        ]
      : published
        ? [{ label: "Fecha de publicación", value: published }]
        : [];

  const detailFacts: ExperienceEditorialFact[] = [
    ...(experience.description.trim() ? [{ label: "Descripción", value: experience.description }] : []),
    { label: "Precio", value: formatPrice(experience.price) },
    { label: "Categoría", value: experience.category?.name || "Sin categoría" },
    ...(mode === "admin" ? [{ label: "Estado", value: STATUS_LABEL[experience.status] }] : []),
    { label: "Ubicación", value: experience.location || "—" },
    ...(durationText ? [{ label: "Duración", value: durationText }] : []),
    ...(formatAvailability(experience.availability)
      ? [{ label: "Disponibilidad", value: formatAvailability(experience.availability) }]
      : []),
    ...(experience.howToGetThere?.trim()
      ? [{ label: "Cómo llegar", value: experience.howToGetThere.trim() }]
      : []),
    ...(experience.externalUrl
      ? [{ label: "Enlace", value: displayExternalUrl(experience.externalUrl) }]
      : []),
    ...(mode === "admin" && experience.rejectionReason
      ? [{ label: "Motivo del rechazo", value: experience.rejectionReason }]
      : []),
  ];

  return { noteFacts, detailFacts };
}

export function ExperienceEditorialView({
  experience,
  mode = "admin",
  favoriteOn = false,
  onFavoriteToggle,
  nearbyHref,
  fetchNearby,
}: ExperienceEditorialViewProps) {
  const [localFavorite, setLocalFavorite] = useState(false);
  const isFavorite = onFavoriteToggle ? favoriteOn : localFavorite;
  const locationByline = formatDepartmentMunicipality(experience.location);
  const lat = experience.latitude ? Number(experience.latitude) : null;
  const lng = experience.longitude ? Number(experience.longitude) : null;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const photos = experienceImages(experience);
  const mainPhoto = photos[0] ? mediaUrl(photos[0], 1200) : null;
  const { noteFacts, detailFacts } = buildExperienceEditorialFacts(experience, mode);

  function toggleFavorite() {
    if (onFavoriteToggle) {
      onFavoriteToggle();
      return;
    }
    setLocalFavorite((value) => !value);
  }

  return (
    <section
      className="dash-exps-preview-page"
      aria-label="Detalle de la experiencia"
      style={mainPhoto ? ({ "--preview-glow": `url(${JSON.stringify(mainPhoto)})` } as CSSProperties) : undefined}
    >
      <section className="dash-exps-editorial" aria-label="Galería de la experiencia">
        <div className="dash-exps-editorial__hero">
          <button
            type="button"
            className={`dash-exps-preview-fav${isFavorite ? " is-on" : ""}`}
            aria-label="Guardar en favoritos"
            aria-pressed={isFavorite}
            onClick={toggleFavorite}
          >
            <Heart
              size={18}
              strokeWidth={1.7}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
          <ExperienceEditorialGallery
            slides={photos.map((url) => mediaUrl(url, 1400))}
            label={experience.title}
          />
        </div>
        <h2 className="dash-exps-editorial__title">{experience.title}</h2>
        {locationByline ? <p className="dash-exps-editorial__byline">{locationByline}</p> : null}
      </section>

      <ExperienceEditorialDossier
        photoUrl={mainPhoto}
        photoLabel={experience.title}
        noteFacts={noteFacts}
        facts={detailFacts}
      />

      <ExperienceEditorialPlace
        experience={experience}
        latitude={lat}
        longitude={lng}
        hasPoint={hasPoint}
      />

      <ExperienceEditorialNearby
        experience={experience}
        hrefFor={nearbyHref}
        fetchPublished={fetchNearby}
      />
    </section>
  );
}
