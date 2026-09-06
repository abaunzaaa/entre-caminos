import { Calendar, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { parseStoredLocation } from "../../data/colombia-locations";
import { formatPrice } from "../../utils/cn";
import { mediaUrl } from "../../utils/media";
import type { Experience, ExperienceStatus } from "../../types";
import { StatusDot } from "./Panel";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

const STATUSES: ExperienceStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"];

function isCatalogActive(status: ExperienceStatus) {
  return status === "PUBLISHED";
}

function formatCreatedAt(value?: string) {
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

function catalogPlace(location: string) {
  const parsed = parseStoredLocation(location);
  if (parsed.municipality && parsed.department) {
    return `${parsed.municipality}, ${parsed.department}`;
  }
  return parsed.municipality || parsed.department || location || "Sin ubicación";
}

function catalogPrice(value: string | number) {
  return formatPrice(value).replace(/\s/g, "");
}

export function ExperienceCatalogCard({
  experience,
  statusOpen,
  statusBusy,
  onToggleStatus,
  onChangeStatus,
  onDelete,
}: {
  experience: Experience;
  statusOpen: boolean;
  statusBusy: boolean;
  onToggleStatus: () => void;
  onChangeStatus: (status: ExperienceStatus) => void;
  onDelete: () => void;
}) {
  const active = isCatalogActive(experience.status);
  const created = formatCreatedAt(experience.createdAt);

  return (
    <article className="dash-exps-tile">
      <div className="dash-exps-tile__photo">
        <img src={mediaUrl(experience.imageUrl)} alt="" />
        <span className="dash-exps-tile__fav" aria-hidden="true">
          <Heart size={15} strokeWidth={1.9} />
        </span>
        <span className="dash-exps-tile__dots" aria-hidden="true">
          <i className="is-on" />
          <i />
          <i />
        </span>
        <span className="dash-exps-tile__price">{catalogPrice(experience.price)}</span>
      </div>
      <div className="dash-exps-tile__body">
        <div className="dash-exps-tile__copy">
          <h3>{experience.title}</h3>
          <p className="dash-exps-tile__place">
            <MapPin size={14} strokeWidth={1.9} aria-hidden="true" />
            <span>{catalogPlace(experience.location)}</span>
          </p>
          <div className="dash-exps-tile__chips">
            <StatusDot active>{experience.category?.name || "Sin categoría"}</StatusDot>
            <StatusDot active={active}>{active ? "Activa" : "Inactiva"}</StatusDot>
          </div>
          {created ? (
            <p className="dash-exps-tile__date">
              <Calendar size={14} strokeWidth={1.9} aria-hidden="true" />
              <span>{created}</span>
            </p>
          ) : null}
        </div>
        <div className="dash-exps-tile__actions">
          <Link to={`/admin/experiencias/${experience.id}/ver`} className="admin-cta admin-cta--sm dash-exps-tile__view">
            Ver
          </Link>
          <div className="dash-exps-tile__manage">
            <Link to={`/admin/experiencias/${experience.id}`}>Editar</Link>
            <span className="dash-exps-tile__sep" aria-hidden="true">
              |
            </span>
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
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="option"
                    className={`dash-team-filters__option${experience.status === status ? " is-active" : ""}`}
                    onClick={() => onChangeStatus(status)}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>
            <span className="dash-exps-tile__sep" aria-hidden="true">
              |
            </span>
            <button type="button" onClick={onDelete}>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
