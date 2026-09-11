import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { ExperienceEditorialNearby } from "../../components/admin/ExperienceEditorialNearby";
import { ExperienceEditorialPlace } from "../../components/admin/ExperienceEditorialPlace";
import { ExperienceEditorialDossier } from "../../components/admin/ExperienceEditorialDossier";
import { ExperienceEditorialGallery } from "../../components/admin/ExperienceEditorialGallery";
import { Button } from "../../components/ui/Button";
import { formatDepartmentMunicipality } from "../../data/colombia-locations";
import { useAuth } from "../../hooks/useAuth";
import { approveExperience, getAdminExperience, rejectExperience } from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { formatPrice } from "../../utils/cn";
import { formatAvailability, displayExternalUrl, durationParts, formatDuration } from "../../utils/experience-details";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Experience, ExperienceStatus } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";
import "../../styles/experience-editorial-gallery.css";
import "../../styles/experience-editorial-dossier.css";
import "../../styles/experience-editorial-map.css";
import "../../styles/experience-editorial-nearby.css";

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
  const [toast, setToast] = useState("");
  const [favoriteOn, setFavoriteOn] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    setFavoriteOn(false);
    setToast("");
    getAdminExperience(id)
      .then(setExperience)
      .catch((err) => setError(getApiErrorMessage(err, "No se pudo cargar la experiencia")));
  }, [id]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const locationByline = experience ? formatDepartmentMunicipality(experience.location) : "";
  const lat = experience?.latitude ? Number(experience.latitude) : null;
  const lng = experience?.longitude ? Number(experience.longitude) : null;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const published =
    experience?.status === "PUBLISHED"
      ? formatPublishedDate(experience.reviewedAt || experience.createdAt)
      : "";
  const pending = experience?.status === "PENDING";
  const photos = experience ? experienceImages(experience) : [];
  const mainPhoto = photos[0] ? mediaUrl(photos[0]) : null;
  const noteFacts = experience
    ? [
        ...(experience.creator?.name ? [{ label: "Creada por", value: experience.creator.name }] : []),
        ...(experience.creator?.email ? [{ label: "Contacto", value: experience.creator.email }] : []),
        ...(published ? [{ label: "Fecha de publicación", value: published }] : []),
      ]
    : [];
  const durationChoice = experience
    ? durationParts(experience.durationValue, experience.durationUnit)
    : null;
  const durationText = durationChoice
    ? `${durationChoice.value} ${durationChoice.unitLabel}`
    : experience
      ? formatDuration(experience.durationValue, experience.durationUnit, experience.duration)
      : "";
  const detailFacts = experience
    ? [
        ...(experience.description.trim() ? [{ label: "Descripción", value: experience.description }] : []),
        { label: "Precio", value: formatPrice(experience.price) },
        { label: "Categoría", value: experience.category?.name || "Sin categoría" },
        { label: "Estado", value: STATUS_LABEL[experience.status] },
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
        ...(experience.rejectionReason
          ? [{ label: "Motivo del rechazo", value: experience.rejectionReason }]
          : []),
      ]
    : [];

  function onPreviewFavorite() {
    setFavoriteOn((on) => !on);
    setToast("Los turistas pueden guardar esta experiencia en favoritos.");
  }

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
    <div
      className="dash dash--exps dash--exps-preview"
      style={mainPhoto ? ({ "--preview-glow": `url(${JSON.stringify(mainPhoto)})` } as CSSProperties) : undefined}
    >
      {toast ? (
        <p className="dash-team-toast" role="status">
          {toast}
        </p>
      ) : null}

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
          <section className="dash-exps-editorial" aria-label="Galería de la experiencia">
            <div className="dash-exps-editorial__hero">
              <button
                type="button"
                className={`dash-exps-preview-fav${favoriteOn ? " is-on" : ""}`}
                aria-label="Guardar en favoritos"
                aria-pressed={favoriteOn}
                onClick={onPreviewFavorite}
              >
                <Heart size={18} strokeWidth={1.7} fill={favoriteOn ? "currentColor" : "none"} aria-hidden="true" />
              </button>
              <ExperienceEditorialGallery
                slides={experienceImages(experience).map((url) => mediaUrl(url))}
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

          <ExperienceEditorialPlace experience={experience} latitude={lat} longitude={lng} hasPoint={hasPoint} />

          <ExperienceEditorialNearby
            experience={experience}
            footer={
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
            }
          />
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
