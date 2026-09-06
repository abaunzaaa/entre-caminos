import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExperienceLocationMap } from "../../components/admin/ExperienceLocationMap";
import { StatusDot } from "../../components/admin/Panel";
import { TeamInviteCarousel } from "../../components/admin/TeamInviteCarousel";
import { parseStoredLocation } from "../../data/colombia-locations";
import { getAdminExperience } from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatPrice } from "../../utils/cn";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Experience, ExperienceStatus } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

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

export function ExperiencePreviewPage() {
  const { id } = useParams();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }
    getAdminExperience(id)
      .then(setExperience)
      .catch((err) => setError(getApiErrorMessage(err, "No se pudo cargar la experiencia")));
  }, [id]);

  const parsed = experience ? parseStoredLocation(experience.location) : null;
  const lat = experience?.latitude ? Number(experience.latitude) : null;
  const lng = experience?.longitude ? Number(experience.longitude) : null;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const active = experience ? isCatalogActive(experience.status) : false;
  const created = experience ? formatCreatedAt(experience.createdAt) : "";

  return (
    <div className="dash dash--exps">
      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Vista previa</h1>
            <p className="dash-profile__row">
              <span>Así vería un explorador esta experiencia en Entre Caminos.</span>
            </p>
          </div>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={superadmIlus2} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {experience ? (
        <section className="dash-exps-preview-page" aria-label="Detalle de la experiencia">
          <article className="dash-split__panel dash-exps-preview-hero">
            <div className="dash-exps-preview-hero__media">
              {experienceImages(experience).length ? (
                <TeamInviteCarousel
                  className="dash-exps-preview-hero__gallery"
                  slides={experienceImages(experience).map((url) => mediaUrl(url))}
                  label={experience.title}
                />
              ) : (
                <div className="dash-exps-preview-hero__empty">Sin imagen</div>
              )}
            </div>
            <div className="dash-exps-preview-hero__body">
              <div className="dash-team-card__facts">
                <StatusDot active={Boolean(experience.category?.name)}>
                  {experience.category?.name || "Sin categoría"}
                </StatusDot>
                <StatusDot active={active}>{active ? "Activa" : "Inactiva"}</StatusDot>
                <StatusDot>{STATUS_LABEL[experience.status]}</StatusDot>
              </div>
              <h2>{experience.title}</h2>
              <p className="dash-exps-preview-hero__price">{formatPrice(experience.price)}</p>
              <p className="dash-exps-preview-hero__copy">{experience.description}</p>
              <dl className="dash-exps-preview-facts">
                <div>
                  <dt>Ubicación</dt>
                  <dd>{experience.location || "—"}</dd>
                </div>
                <div>
                  <dt>Departamento</dt>
                  <dd>{parsed?.department || "—"}</dd>
                </div>
                <div>
                  <dt>Municipio</dt>
                  <dd>{parsed?.municipality || "—"}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{parsed?.address || "—"}</dd>
                </div>
                {created ? (
                  <div>
                    <dt>Fecha de creación</dt>
                    <dd>{created}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </article>

          <section className="dash-split__panel dash-exps-preview-map" aria-label="Mapa de la experiencia">
            <h3 className="dash-section__title">Ubicación en el mapa</h3>
            {hasPoint ? (
              <div className="dash-exps-preview-map__frame">
                <ExperienceLocationMap latitude={lat} longitude={lng} zoom={15} interactive={false} />
              </div>
            ) : (
              <p className="dash-section__lead">Esta experiencia aún no tiene un punto geográfico registrado.</p>
            )}
          </section>

          <div className="dash-cats-actions">
            <Link to="/admin/experiencias" className="admin-cta inline-flex items-center justify-center">
              Volver al listado
            </Link>
          </div>
        </section>
      ) : !error ? (
        <p className="dash-section__lead">Cargando experiencia…</p>
      ) : null}
    </div>
  );
}
