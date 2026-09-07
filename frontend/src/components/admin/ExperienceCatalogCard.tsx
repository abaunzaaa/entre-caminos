import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { parseStoredLocation } from "../../data/colombia-locations";
import { experienceImages, mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import type { Experience, ExperienceStatus } from "../../types";
import { StatusDot } from "./Panel";
import { TeamInviteCarousel } from "./TeamInviteCarousel";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente de revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
  REJECTED: "Rechazada",
};

const REVIEWER_STATUSES: ExperienceStatus[] = ["PUBLISHED", "ARCHIVED"];

function isCatalogActive(status: ExperienceStatus) {
  return status === "PUBLISHED";
}

function catalogPrice(value: string | number) {
  return formatPrice(value).replace(/\s/g, "");
}

function catalogPlace(location: string) {
  const parsed = parseStoredLocation(location);
  if (parsed.department && parsed.municipality) {
    return `${parsed.department} · ${parsed.municipality}`;
  }
  return parsed.department || parsed.municipality;
}

function formatSentAt(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ExperienceCatalogCard({
  experience,
  statusOpen = false,
  statusBusy = false,
  canReview,
  showManage = true,
  onToggleStatus,
  onChangeStatus,
  onDelete,
}: {
  experience: Experience;
  statusOpen?: boolean;
  statusBusy?: boolean;
  canReview: boolean;
  showManage?: boolean;
  onToggleStatus?: () => void;
  onChangeStatus?: (status: ExperienceStatus) => void;
  onDelete?: () => void;
}) {
  const active = isCatalogActive(experience.status);
  const slides = experienceImages(experience).map((url) => mediaUrl(url));
  const gallery = slides.length ? slides : [mediaUrl(null)];
  const place = catalogPlace(experience.location);
  const sent = formatSentAt(experience.submittedAt || experience.createdAt);
  const pending = experience.status === "PENDING";
  const viewLabel = pending && canReview ? "Revisar" : "Ver";
  const canEdit =
    canReview || experience.status === "PENDING" || experience.status === "REJECTED" || experience.status === "DRAFT";
  const canChangeStatus = canReview && (experience.status === "PUBLISHED" || experience.status === "ARCHIVED");

  return (
    <article className="dash-exps-tile">
      <div className="dash-exps-tile__photo">
        <TeamInviteCarousel className="dash-exps-tile__gallery" slides={gallery} label={experience.title} />
        <Link
          to={`/admin/experiencias/${experience.id}/ver`}
          className="dash-exps-tile__glass"
          onClick={(event) => event.stopPropagation()}
        >
          {viewLabel}
        </Link>
      </div>
      <div className="dash-exps-tile__body">
        <div className="dash-exps-tile__chips">
          <StatusDot active>{experience.category?.name || "Sin categoría"}</StatusDot>
          <StatusDot active={active}>{STATUS_LABEL[experience.status]}</StatusDot>
          <StatusDot active>{catalogPrice(experience.price)}</StatusDot>
        </div>
        <h3>{experience.title}</h3>
        {place ? (
          <p className="dash-exps-tile__place">
            <MapPin size={13} strokeWidth={2} aria-hidden="true" />
            <span>{place}</span>
          </p>
        ) : null}
        {experience.creator?.name ? (
          <p className="dash-exps-tile__place">Creada por {experience.creator.name}{sent ? ` · ${sent}` : ""}</p>
        ) : sent ? (
          <p className="dash-exps-tile__place">Enviada el {sent}</p>
        ) : null}
        {showManage ? (
          <div className="dash-exps-tile__manage">
          {canEdit ? <Link to={`/admin/experiencias/${experience.id}`}>Editar</Link> : null}
          {canChangeStatus ? (
            <>
              {canEdit ? (
                <span className="dash-exps-tile__sep" aria-hidden="true">
                  |
                </span>
              ) : null}
              <div className="dash-exps-status" data-exp-status={experience.id}>
                <button
                  type="button"
                  aria-expanded={statusOpen}
                  disabled={statusBusy}
                  onClick={onToggleStatus}
                >
                  {statusBusy ? "Actualizando..." : "Cambiar estado"}
                </button>
                <div className={`dash-team-filters__menu dash-exps-status__menu${statusOpen ? " is-open" : ""}`} role="listbox">
                  {REVIEWER_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      role="option"
                      className={`dash-team-filters__option${experience.status === status ? " is-active" : ""}`}
                      onClick={() => onChangeStatus?.(status)}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {pending && canReview ? (
            <>
              <span className="dash-exps-tile__sep" aria-hidden="true">
                |
              </span>
              <Link to={`/admin/experiencias/${experience.id}/ver`}>Revisar</Link>
            </>
          ) : null}
          {canEdit || canChangeStatus || (pending && canReview) ? (
            <span className="dash-exps-tile__sep" aria-hidden="true">
              |
            </span>
          ) : null}
          <button type="button" onClick={onDelete}>
            Eliminar
          </button>
        </div>
        ) : null}
      </div>
    </article>
  );
}
