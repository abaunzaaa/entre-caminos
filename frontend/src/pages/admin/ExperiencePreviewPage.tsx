import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExperienceLocationMap } from "../../components/admin/ExperienceLocationMap";
import { StatusDot } from "../../components/admin/Panel";
import { TeamInviteCarousel } from "../../components/admin/TeamInviteCarousel";
import { Button } from "../../components/ui/Button";
import { parseStoredLocation } from "../../data/colombia-locations";
import { useAuth } from "../../hooks/useAuth";
import { approveExperience, getAdminExperience, rejectExperience } from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatPrice } from "../../utils/cn";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Experience, ExperienceStatus } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "Pendiente de revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
  REJECTED: "Rechazada",
};

function isCatalogActive(status: ExperienceStatus) {
  return status === "PUBLISHED";
}

function formatCreatedAt(value?: string | null) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ExperiencePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canReview = hasPermission("experiences.review");
  const [experience, setExperience] = useState<Experience | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
  const submitted = experience ? formatCreatedAt(experience.submittedAt) : "";
  const pending = experience?.status === "PENDING";

  async function onApprove() {
    if (!experience) {
      return;
    }
    setError("");
    try {
      setBusy(true);
      const updated = await approveExperience(experience.id);
      setExperience(updated);
      navigate("/admin/experiencias?vista=pendientes");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo aprobar la experiencia"));
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!experience) {
      return;
    }
    if (rejectReason.trim().length < 8) {
      setError("El motivo del rechazo es obligatorio.");
      return;
    }
    setError("");
    try {
      setBusy(true);
      await rejectExperience(experience.id, rejectReason.trim());
      setRejectOpen(false);
      navigate("/admin/experiencias?vista=pendientes");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo rechazar la experiencia"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash dash--exps">
      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">{pending && canReview ? "Revisar experiencia" : "Vista previa"}</h1>
            <p className="dash-profile__row">
              <span>
                {pending && canReview
                  ? "Consulta toda la información antes de aprobar o rechazar esta experiencia."
                  : "Así vería un explorador esta experiencia en Entre Caminos."}
              </span>
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
                <StatusDot active={active}>{active ? "Activa" : STATUS_LABEL[experience.status]}</StatusDot>
                <StatusDot>{STATUS_LABEL[experience.status]}</StatusDot>
              </div>
              <h2>{experience.title}</h2>
              <p className="dash-exps-preview-hero__price">{formatPrice(experience.price)}</p>
              <p className="dash-exps-preview-hero__copy">{experience.description}</p>
              {experience.rejectionReason ? (
                <p className="dash-exps-reject">Motivo del rechazo: {experience.rejectionReason}</p>
              ) : null}
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
                {experience.creator?.name ? (
                  <div>
                    <dt>Creada por</dt>
                    <dd>
                      {experience.creator.name}
                      {experience.creator.email ? ` · ${experience.creator.email}` : ""}
                    </dd>
                  </div>
                ) : null}
                {submitted ? (
                  <div>
                    <dt>Enviada a revisión</dt>
                    <dd>{submitted}</dd>
                  </div>
                ) : created ? (
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
            {pending && canReview ? (
              <>
                <Button type="button" disabled={busy} onClick={() => void onApprove()}>
                  {busy ? "Procesando..." : "Aprobar y publicar"}
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setRejectOpen(true)}>
                  Rechazar
                </Button>
              </>
            ) : null}
            <Link to="/admin/experiencias" className="admin-cta inline-flex items-center justify-center">
              Volver al listado
            </Link>
          </div>
        </section>
      ) : !error ? (
        <p className="dash-section__lead">Cargando experiencia…</p>
      ) : null}

      {rejectOpen ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => {
            if (!busy) {
              setRejectOpen(false);
            }
          }}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exp-reject-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="exp-reject-title" className="dash-team-confirm__title">
              Rechazar experiencia
            </h2>
            <p className="dash-team-confirm__lead">Motivo del rechazo</p>
            <textarea
              className="dash-exps-review-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Explica qué debe corregir el administrador"
              required
            />
            <div className="dash-team-confirm__actions">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={busy} onClick={() => void onReject()}>
                {busy ? "Rechazando..." : "Rechazar experiencia"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
