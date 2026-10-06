import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Heart } from "lucide-react";
import { ExperienceEditorialDossier, type ExperienceEditorialFact } from "./ExperienceEditorialDossier";
import { ExperienceEditorialGallery } from "./ExperienceEditorialGallery";
import { ExperienceEditorialNearby } from "./ExperienceEditorialNearby";
import { ExperienceEditorialPlace } from "./ExperienceEditorialPlace";
import { ExperiencePlaceTabs } from "./ExperiencePlaceTabs";
import { COMPANY_OPTIONS, PLACE_OPTIONS, type OnboardingOption } from "../../data/onboarding";
import { formatDepartmentMunicipality } from "../../data/colombia-locations";
import { formatPrice } from "../../utils/cn";
import { experienceCategoryNames, formatExperienceCategories } from "../../utils/experience-categories";
import {
  availabilityDetailFacts,
  durationParts,
  formatDuration,
} from "../../utils/experience-details";
import { experienceImages, mediaUrl } from "../../utils/media";
import { placeTabLabel, placesFromExperience, projectExperience } from "../../utils/experience-places";
import type { Experience, ExperienceStatus, PublicOrganizationProfile } from "../../types";

const PLACE_FACT_LABELS = new Set([
  "Ubicación",
  "Disponibilidad",
  "Días disponibles",
  "Fechas",
  "Horario",
  "Horarios",
  "Cómo llegar",
]);

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente de revisión",
  PUBLISHED: "Activa",
  ARCHIVED: "Inactiva",
  REJECTED: "Rechazada",
};

function hasMapCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function experienceLink(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function phoneHref(value: string) {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]{7,24}$/.test(trimmed)) {
    return "";
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "";
  }
  return `tel:${trimmed.replace(/[^\d+]/g, "")}`;
}

function preferenceLabels(options: OnboardingOption[], values?: string[] | null) {
  const labels: string[] = [];
  for (const value of values ?? []) {
    const label = options.find((option) => option.value === value)?.label;
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
function detailOrganization(experience: Experience): PublicOrganizationProfile | null {
  const creator = experience.creator as
    | (NonNullable<Experience["creator"]> & {
        organizationProfile?: PublicOrganizationProfile | null;
      })
    | null
    | undefined;
  if (creator?.organization?.tradeName?.trim()) {
    return creator.organization;
  }
  const profile = creator?.organizationProfile;
  const tradeName = profile?.tradeName?.trim() || "";
  if (!profile || !tradeName) {
    return null;
  }
  return {
    tradeName,
    description: profile.description?.trim() || "",
    logoUrl: profile.logoUrl?.trim() || null,
    department: profile.department?.trim() || "",
    city: profile.city?.trim() || "",
    contactPhone: profile.contactPhone?.trim() || null,
    contactEmail: profile.contactEmail?.trim() || null,
    website: profile.website?.trim() || null,
    address: profile.address?.trim() || null,
    publishedCount: profile.publishedCount,
  };
}

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
  const publisherName = experience.creator?.name?.trim() || "";
  const publisherAvatar = experience.creator?.avatarUrl ?? null;

  const noteFacts: ExperienceEditorialFact[] =
    mode === "admin"
      ? [
          ...(publisherName
            ? [{ label: "Creada por", value: publisherName, avatarUrl: publisherAvatar }]
            : []),
          ...(experience.creator?.email ? [{ label: "Contacto interno", value: experience.creator.email }] : []),
          ...(published ? [{ label: "Fecha de publicación", value: published }] : []),
        ]
      : [];

  const detailFacts: ExperienceEditorialFact[] = [
    ...(experience.description?.trim() ? [{ label: "Descripción", value: experience.description }] : []),
    { label: "Precio", value: formatPrice(experience.price, experience.currency) },
    {
      label: experienceCategoryNames(experience).length > 1 ? "Categorías" : "Categoría",
      value: formatExperienceCategories(experience, "Sin categoría"),
    },
    ...(mode === "admin" ? [{ label: "Estado", value: STATUS_LABEL[experience.status] }] : []),
    { label: "Ubicación", value: experience.location || "—" },
    ...(durationText ? [{ label: "Duración", value: durationText }] : []),
    ...(() => {
      const chips = preferenceLabels(PLACE_OPTIONS, experience.environments);
      return chips.length ? [{ label: "Ambiente", value: chips.join(", "), chips }] : [];
    })(),
    ...(() => {
      const chips = preferenceLabels(COMPANY_OPTIONS, experience.idealFor);
      return chips.length ? [{ label: "Ideal para", value: chips.join(", "), chips }] : [];
    })(),
    ...availabilityDetailFacts(experience.availability),
    ...(experience.howToGetThere?.trim()
      ? [{ label: "Cómo llegar", value: experience.howToGetThere.trim() }]
      : []),
    ...(experience.companyContact?.trim()
      ? [
          {
            label: "Contacto",
            value: experience.companyContact.trim(),
            ...(phoneHref(experience.companyContact)
              ? { href: phoneHref(experience.companyContact) }
              : {}),
          },
        ]
      : []),
    ...(experience.externalUrl?.trim()
      ? [
          {
            label: "Enlace",
            value: "Visitar página oficial",
            href: experienceLink(experience.externalUrl),
            external: true,
          },
        ]
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
  const places = useMemo(() => placesFromExperience(experience), [experience]);
  const [placeIndex, setPlaceIndex] = useState(0);
  useEffect(() => {
    setPlaceIndex(0);
  }, [experience.id]);
  const activePlace = Math.min(placeIndex, Math.max(places.length - 1, 0));
  const selectedPlace = places[activePlace] ?? places[0];
  const view = selectedPlace ? projectExperience(experience, selectedPlace) : experience;
  const locationByline = formatDepartmentMunicipality(view.location);
  const lat = view.latitude ? Number(view.latitude) : null;
  const lng = view.longitude ? Number(view.longitude) : null;
  const hasPoint = hasMapCoordinates(lat, lng);
  const photos = experienceImages(experience);
  const mainPhoto = photos[0] ? mediaUrl(photos[0], 1200) : null;
  const { noteFacts, detailFacts } = buildExperienceEditorialFacts(view, mode);
  const organization = detailOrganization(experience);
  const showPlaceTabs = places.length > 1;
  const generalFacts = showPlaceTabs ? detailFacts.filter((fact) => !PLACE_FACT_LABELS.has(fact.label)) : detailFacts;
  const placeFacts = showPlaceTabs ? detailFacts.filter((fact) => PLACE_FACT_LABELS.has(fact.label)) : [];
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
        facts={generalFacts}
        organization={organization}
        placeFacts={placeFacts}
        organization={experience.creator?.organization ?? null}
        places={
          showPlaceTabs ? (
            <ExperiencePlaceTabs
              label="Disponible en"
              tabs={places.map((place, index) => placeTabLabel(place, index, places))}
              active={activePlace}
              onSelect={setPlaceIndex}
            />
          ) : null
        }
      />

      <ExperienceEditorialPlace
        experience={view}
        latitude={lat}
        longitude={lng}
        hasPoint={hasPoint}
      />

      <ExperienceEditorialNearby
        experience={view}
        hrefFor={nearbyHref}
        fetchPublished={fetchNearby}
      />
    </section>
  );
}
