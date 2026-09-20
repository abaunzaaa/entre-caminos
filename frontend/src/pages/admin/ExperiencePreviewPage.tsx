import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ExperienceEditorialView } from "../../components/admin/ExperienceEditorialView";
import { Button } from "../../components/ui/Button";
import { KeyConfirmDialog } from "../../components/ui/KeyConfirmDialog";
import { SuccessConfirmDialog } from "../../components/ui/SuccessConfirmDialog";
import { AuthKeyIcon } from "../../components/auth/AuthKeyIcon";
import { useAuth } from "../../hooks/useAuth";
import {
  approveExperience,
  deleteExperience,
  getAdminExperience,
  rejectExperience,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { canDeleteExperience, canEditExperience, canReviewExperiences } from "../../utils/admin-access";
import type { Experience } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";
import "../../styles/auth-recovery-modal.css";
import "../../styles/experience-editorial-gallery.css";
import "../../styles/experience-editorial-dossier.css";
import "../../styles/experience-editorial-map.css";
import "../../styles/experience-editorial-nearby.css";

export function ExperiencePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canReview = canReviewExperiences(hasPermission);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const canEdit = experience ? canEditExperience(experience.status, hasPermission, user?.role) : false;
  const canDelete = experience ? canDeleteExperience(experience.status, hasPermission, user?.role) : false;
  const pending = experience?.status === "PENDING";

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

  async function confirmDelete() {
    if (!experience || deleting) {
      return;
    }
    setError("");
    try {
      setDeleting(true);
      await deleteExperience(experience.id);
      setPendingDelete(false);
      setDeletedOpen(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar la experiencia"));
      setPendingDelete(false);
    } finally {
      setDeleting(false);
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
    <div className="dash dash--exps dash--exps-preview">
      {toast ? (
        <p className="dash-team-toast" role="status">
          {toast}
        </p>
      ) : null}

      <article className="dash-profile dash-profile--review">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <div className="dash-exps-preview-heading">
              <Link
                to="/admin/experiencias"
                className="dash-exps-preview-back"
                aria-label="Volver al listado"
                title="Volver al listado"
              >
                <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <h1 className="dash-profile__name">
                {pending && canReview ? "Revisar experiencia" : "Vista previa"}
              </h1>
            </div>
            <p className="dash-profile__row">
              <span>
                {pending && canReview
                  ? "Consulta toda la información antes de aprobar o rechazar esta experiencia."
                  : "Así vería un explorador esta experiencia en Entre Caminos."}
              </span>
            </p>
            {experience ? (
              <div className="dash-cats-actions dash-exps-preview-actions">
                {pending && canReview ? (
                  <>
                    <Button type="button" disabled={busy || deleting} onClick={() => void onApprove()}>
                      {busy ? "Procesando..." : "Aprobar y publicar"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy || deleting}
                      onClick={() => setRejectOpen(true)}
                    >
                      Rechazar
                    </Button>
                  </>
                ) : null}
                {canEdit ? (
                  <Link
                    to={`/admin/experiencias/${experience.id}`}
                    className="admin-cta inline-flex items-center justify-center"
                  >
                    Editar
                  </Link>
                ) : null}
                {canDelete ? (
                  <Button type="button" variant="secondary" disabled={deleting} onClick={() => setPendingDelete(true)}>
                    Eliminar
                  </Button>
                ) : null}
              </div>
            ) : null}
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
        <ExperienceEditorialView
          experience={experience}
          mode="admin"
          favoriteOn={favoriteOn}
          onFavoriteToggle={onPreviewFavorite}
        />
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

      {pendingDelete ? (
        <KeyConfirmDialog
          open={pendingDelete}
          title="¿Eliminar esta experiencia?"
          description="Se borrará del catálogo de forma permanente. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          busy={deleting}
          onCancel={() => {
            if (!deleting) {
              setPendingDelete(false);
            }
          }}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      <SuccessConfirmDialog
        open={deletedOpen}
        onClose={() => {
          setDeletedOpen(false);
          navigate("/admin/experiencias");
        }}
        className="contact-success--subtle"
        title="Experiencia eliminada"
        description="La experiencia se eliminó correctamente. Volverás al listado de experiencias."
        actionLabel="Ver experiencias"
        closeLabel="Cerrar"
        initialFocus="action"
        icon={<AuthKeyIcon className="auth-reset-success__mark" />}
      />
    </div>
  );
}
