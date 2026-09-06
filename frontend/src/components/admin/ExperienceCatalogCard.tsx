import { Link } from "react-router-dom";
import { experienceImages, mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import type { Experience, ExperienceStatus } from "../../types";
import { StatusDot } from "./Panel";
import { TeamInviteCarousel } from "./TeamInviteCarousel";

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
  const slides = experienceImages(experience).map((url) => mediaUrl(url));
  const gallery = slides.length ? slides : [mediaUrl(null)];

  return (
    <article className="dash-exps-tile">
      <div className="dash-exps-tile__photo">
        <TeamInviteCarousel className="dash-exps-tile__gallery" slides={gallery} label={experience.title} />
        <Link to={`/admin/experiencias/${experience.id}/ver`} className="dash-exps-tile__glass">
          Ver
        </Link>
      </div>
      <div className="dash-exps-tile__body">
        <div className="dash-exps-tile__chips">
          <StatusDot active>{experience.category?.name || "Sin categoría"}</StatusDot>
          <StatusDot active={active}>{active ? "Activa" : "Inactiva"}</StatusDot>
          <StatusDot active>{catalogPrice(experience.price)}</StatusDot>
        </div>
        <h3>{experience.title}</h3>
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
    </article>
  );
}
