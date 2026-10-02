import type { CSSProperties } from "react";
import { Heart } from "lucide-react";
import { ExperienceOfferedBy } from "../explorer/ExperienceOfferedBy";
import { ExperienceEditorialDossier, type ExperienceEditorialFact } from "./ExperienceEditorialDossier";
import { ExperienceEditorialGallery } from "./ExperienceEditorialGallery";
import { ExperienceEditorialNearby } from "./ExperienceEditorialNearby";
import { ExperienceEditorialPlace } from "./ExperienceEditorialPlace";
import { formatDepartmentMunicipality } from "../../data/colombia-locations";
import { formatPrice } from "../../utils/cn";
import { experienceCategoryNames, formatExperienceCategories } from "../../utils/experience-categories";
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
  favoriteBusy?: boolean;
  onFavoriteToggle?: () => void;
  nearbyHref?: (id: string) => string;
  fetchNearby?: () => Promise<Experience[]>;
  onConsultAi?: () => void;
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
  const publisherName =
    experience.creator?.organization?.tradeName?.trim() || experience.creator?.name?.trim() || "";
  const publisherAvatar =
    experience.creator?.organization?.logoUrl ?? experience.creator?.avatarUrl ?? null;

  const noteFacts: ExperienceEditorialFact[] =
    mode === "admin"
      ? [
          ...(publisherName
            ? [{ label: "Creada por", value: publisherName, avatarUrl: publisherAvatar }]
            : []),
          ...(experience.creator?.email ? [{ label: "Contacto interno", value: experience.creator.email }] : []),
          ...(published ? [{ label: "Fecha de publicación", value: published }] : []),
        ]
      : [...(published ? [{ label: "Fecha de publicación", value: published }] : [])];

  const detailFacts: ExperienceEditorialFact[] = [
    ...(experience.description.trim() ? [{ label: "Descripción", value: experience.description }] : []),
    { label: "Precio", value: formatPrice(experience.price, experience.currency) },
    {
      label: experienceCategoryNames(experience).length > 1 ? "Categorías" : "Categoría",
      value: formatExperienceCategories(experience, "Sin categoría"),
    },
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
  favoriteBusy = false,
  onFavoriteToggle,
  nearbyHref,
  fetchNearby,
  onConsultAi,
}: ExperienceEditorialViewProps) {
  const isFavorite = favoriteOn;
  const locationByline = formatDepartmentMunicipality(experience.location);
  const lat = experience.latitude ? Number(experience.latitude) : null;
  const lng = experience.longitude ? Number(experience.longitude) : null;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const photos = experienceImages(experience);
  const mainPhoto = photos[0] ? mediaUrl(photos[0], 1200) : null;
  const { noteFacts, detailFacts } = buildExperienceEditorialFacts(experience, mode);
  const showTouristActions = mode === "tourist" && (onConsultAi || onFavoriteToggle);

  return (
    <section
      className="dash-exps-preview-page"
      aria-label="Detalle de la experiencia"
      style={mainPhoto ? ({ "--preview-glow": `url(${JSON.stringify(mainPhoto)})` } as CSSProperties) : undefined}
    >
      <section className="dash-exps-editorial" aria-label="Galería de la experiencia">
        <div className="dash-exps-editorial__hero">
          <ExperienceEditorialGallery
            slides={photos.map((url) => mediaUrl(url, 1400))}
            label={experience.title}
          />
        </div>
        <h2 className="dash-exps-editorial__title">{experience.title}</h2>
        {locationByline ? <p className="dash-exps-editorial__byline">{locationByline}</p> : null}
        {showTouristActions ? (
          <div className="dash-exps-editorial__actions">
            {onConsultAi ? (
              <button
                type="button"
                className="dash-exps-editorial__guide"
                aria-label="Pregúntale a tu guía"
                title="Pregúntale a tu guía"
                onClick={onConsultAi}
              >
                Pregúntale a tu guía
              </button>
            ) : null}
            {onFavoriteToggle ? (
              <button
                type="button"
                className={`dash-exps-editorial__favorite${isFavorite ? " is-on" : ""}`}
                aria-pressed={isFavorite}
                disabled={favoriteBusy}
                onClick={() => {
                  if (!favoriteBusy) {
                    onFavoriteToggle();
                  }
                }}
              >
                <Heart
                  size={14}
                  strokeWidth={1.8}
                  fill={isFavorite ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                <span>{isFavorite ? "En favoritos" : "Añadir a favoritos"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <ExperienceEditorialDossier
        photoUrl={mainPhoto}
        photoLabel={experience.title}
        noteFacts={noteFacts}
        facts={detailFacts}
      />

      {mode === "tourist" ? (
        <ExperienceOfferedBy
          organization={experience.creator?.organization}
          fallbackName={experience.creator?.name}
          fallbackAvatarUrl={experience.creator?.avatarUrl}
        />
      ) : null}

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
