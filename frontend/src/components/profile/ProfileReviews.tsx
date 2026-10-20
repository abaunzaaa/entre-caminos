import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ReviewPhotoViewer } from "../experiences/ReviewPhotoStage";
import { Stars } from "../experiences/ExperienceReviewsSection";
import { ReviewComposerModal, type ReviewDraft } from "../experiences/ReviewComposerModal";
import {
  deleteExperienceReview,
  updateExperienceReview,
  type MyVisitorReview,
  type VisitorReviewInput,
  type VisitorReviewPhotos,
} from "../../services/reviews.service";
import { showFavoriteToast } from "../../services/favorites-sync";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import "../../styles/experience-reviews.css";

function draftFromReview(review: MyVisitorReview): ReviewDraft {
  return {
    rating: review.rating ?? 0,
    organizationRating: review.organizationRating ?? 0,
    valueRating: review.valueRating ?? 0,
    recommended: review.recommended ?? null,
    comment: review.comment ?? "",
  };
}

function formatReviewDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const month = new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date).replace(".", "").toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} ${day}, ${date.getFullYear()}`;
}

function ReviewComment({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || open) {
      return;
    }
    setOverflows(node.scrollHeight > node.clientHeight + 1);
  }, [text, open]);

  return (
    <>
      <p ref={ref} className={`experience-reviews__comment${open ? " is-open" : ""}`}>
        “{text}”
      </p>
      {overflows || open ? (
        <button type="button" className="experience-reviews__more" onClick={() => setOpen((current) => !current)}>
          {open ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </>
  );
}

function ProfileReviewCard({
  review,
  busy,
  deleting,
  onEdit,
  onDelete,
}: {
  review: MyVisitorReview;
  busy: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const cover = mediaUrl(review.experience.imageUrl, 640);
  const sede = review.location?.label?.trim() ?? "";
  const comment = review.comment.trim();
  const images = [...(review.images ?? [])].sort((left, right) => left.position - right.position);
  const photoUrls = images.map((image) => mediaUrl(image.imageUrl, 960));
  const detailPath = `/explorar/${review.experience.id}`;

  return (
    <article className="profile-review-card">
      <Link className="profile-review-card__media" to={detailPath} aria-label={review.experience.title}>
        <img src={cover} alt="" />
      </Link>
      <div className="profile-review-card__body">
        <h3 className="profile-review-card__title">
          <Link to={detailPath}>{review.experience.title}</Link>
        </h3>
        <Stars value={review.rating} />
        {sede ? <p className="profile-review-card__sede">Visitó · {sede}</p> : null}
        {review.recommended != null ? (
          <p className="profile-review-card__recommend">{review.recommended ? "La recomienda" : "No la recomienda"}</p>
        ) : null}
        {comment ? <ReviewComment text={comment} /> : null}
        {photoUrls.length ? (
          <ul className="profile-review-card__photos">
            {photoUrls.map((url, index) => (
              <li key={images[index]?.id ?? url}>
                <button type="button" aria-label={`Ver foto ${index + 1} de la reseña`} onClick={() => setPhotoIndex(index)}>
                  <img src={mediaUrl(images[index]?.imageUrl, 240)} alt="" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <footer className="profile-review-card__footer">
          <time dateTime={review.createdAt}>{formatReviewDate(review.createdAt)}</time>
          <p className="experience-reviews__card-actions">
            <button type="button" onClick={onEdit} disabled={busy}>
              Editar
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={onDelete} disabled={busy}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </p>
        </footer>
      </div>
      {photoIndex != null ? (
        <ReviewPhotoViewer
          urls={photoUrls}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          onClose={() => setPhotoIndex(null)}
        />
      ) : null}
    </article>
  );
}

export function ProfileReviews({
  reviews,
  loading,
  error,
  onChange,
  onRetry,
}: {
  reviews: MyVisitorReview[];
  loading: boolean;
  error: string;
  onChange: (reviews: MyVisitorReview[]) => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState<MyVisitorReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveReview(input: VisitorReviewInput, photos: VisitorReviewPhotos) {
    if (!editing || busy) {
      return;
    }
    setBusy(true);
    try {
      const data = await updateExperienceReview(editing.experienceId, editing.id, input, photos);
      onChange(
        reviews.map((review) =>
          review.id === editing.id ? { ...review, ...data.review, experience: review.experience } : review,
        ),
      );
      setEditing(null);
      showFavoriteToast("Reseña actualizada correctamente");
    } catch (err) {
      showFavoriteToast(getApiErrorMessage(err, "No pudimos actualizar la reseña."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeReview(review: MyVisitorReview) {
    if (busy) {
      return;
    }
    setBusy(true);
    setDeletingId(review.id);
    try {
      await deleteExperienceReview(review.experienceId, review.id);
      onChange(reviews.filter((item) => item.id !== review.id));
      setEditing((current) => (current?.id === review.id ? null : current));
      showFavoriteToast("Reseña eliminada correctamente");
    } catch (err) {
      showFavoriteToast(getApiErrorMessage(err, "No pudimos eliminar la reseña."), "error");
    } finally {
      setDeletingId(null);
      setBusy(false);
    }
  }

  const editingLocations =
    editing && !editing.location && editing.experience.locations.length > 1 ? editing.experience.locations : [];

  return (
    <div className="profile-reviews">
      {loading ? <p className="profile-stamps__status">Cargando reseñas…</p> : null}
      {!loading && error ? (
        <div className="profile-stamps__status">
          <p>{error}</p>
          <button type="button" className="profile-stamps__retry" onClick={onRetry}>
            Intentar de nuevo
          </button>
        </div>
      ) : null}
      {!loading && !error && reviews.length === 0 ? (
        <div className="profile-reviews__empty">
          <h2 className="explorer-discover-title">Aún no tienes reseñas</h2>
          <p className="experience-reviews__empty">Cuando compartas tus experiencias, tus reseñas aparecerán aquí.</p>
        </div>
      ) : null}
      {!loading && !error && reviews.length > 0 ? (
        <ul className="profile-review-list">
          {reviews.map((review) => (
            <li key={review.id}>
              <ProfileReviewCard
                review={review}
                busy={busy}
                deleting={deletingId === review.id}
                onEdit={() => setEditing(review)}
                onDelete={() => void removeReview(review)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {editing ? (
        <ReviewComposerModal
          mode="edit"
          experienceTitle={editing.experience.title}
          initial={draftFromReview(editing)}
          initialPhotos={editing.images}
          locations={editingLocations}
          sedeLabel={editing.location?.label ?? null}
          placeName={
            !editing.location && editing.experience.locations.length === 1
              ? editing.experience.locations[0]?.label ?? null
              : null
          }
          busy={busy}
          onClose={() => setEditing(null)}
          onSubmit={(input, photos) => void saveReview(input, photos)}
        />
      ) : null}
    </div>
  );
}
