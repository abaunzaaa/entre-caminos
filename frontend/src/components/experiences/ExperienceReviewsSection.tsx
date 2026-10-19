import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ReviewPhotoStage, ReviewPhotoViewer } from "./ReviewPhotoStage";
import { useAuth } from "../../hooks/useAuth";
import {
  createExperienceReview,
  deleteExperienceReview,
  listExperienceReviews,
  updateExperienceReview,
  type VisitorReview,
  type VisitorReviewInput,
  type VisitorReviewPhotos,
  type VisitorReviewSummary,
} from "../../services/reviews.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { EXPERIENCE_DETAIL_SECTIONS } from "../../utils/experience-detail-sections";
import { sedeChoices } from "../../utils/experience-places";
import { showFavoriteToast } from "../../services/favorites-sync";
import { mediaUrl } from "../../utils/media";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import { ReviewComposerModal, generalMood, type ReviewDraft, type ReviewModalMark } from "./ReviewComposerModal";

const EMPTY_SUMMARY: VisitorReviewSummary = { averageRating: null, count: 0 };
const REVIEW_PUBLISHED = "Reseña publicada correctamente";
const REVIEW_UPDATED = "Reseña actualizada correctamente";
const REVIEW_DELETED = "Reseña eliminada correctamente";
const REVIEW_PUBLISH_FAILED = "No pudimos publicar la reseña.";
const REVIEW_UPDATE_FAILED = "No pudimos actualizar la reseña.";
const REVIEW_DELETE_FAILED = "No pudimos eliminar la reseña.";
const EXPERIENCE_FORM_ERROR = /datos de la experiencia/i;

function reviewErrorMessage(err: unknown, fallback: string) {
  const message = getApiErrorMessage(err, fallback);
  if (EXPERIENCE_FORM_ERROR.test(message)) {
    return fallback;
  }
  return message;
}

function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "EC";
}

function starFill(index: number, value: number) {
  const shown = Math.round(value * 2) / 2;
  if (shown >= index) {
    return "full";
  }
  if (shown >= index - 0.5) {
    return "half";
  }
  return "empty";
}

function Stars({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="experience-reviews__stars" aria-label={`${shown} de 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = starFill(index + 1, value);
        return (
          <span key={index} className={`experience-reviews__star is-${fill}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.7 14.7 8.2l6 .9-4.35 4.24 1.03 6L12 16.6 6.62 19.34l1.03-6L3.3 9.1l6-.9L12 2.7Z" />
            </svg>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="is-fill">
              <path d="M12 2.7 14.7 8.2l6 .9-4.35 4.24 1.03 6L12 16.6 6.62 19.34l1.03-6L3.3 9.1l6-.9L12 2.7Z" />
            </svg>
          </span>
        );
      })}
    </span>
  );
}

const REVIEW_PAGE = 4;

function reviewScore(review: VisitorReview) {
  const value = Number.isFinite(review.score) ? review.score : review.rating;
  return Number.isFinite(value) ? value : review.rating;
}

function scoreLabel(value: number) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function ReviewDetailModal({
  review,
  score,
  own = false,
  busy = false,
  deleting = false,
  onEdit,
  onDelete,
  onClose,
}: {
  review: VisitorReview;
  score: number;
  own?: boolean;
  busy?: boolean;
  deleting?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const avatar = review.user.avatarUrl?.trim() && !avatarFailed ? mediaUrl(review.user.avatarUrl, 240) : "";
  const images = [...(review.images ?? [])].sort((left, right) => left.position - right.position);
  const galleryUrls = images.map((image) => mediaUrl(image.imageUrl, 1200));
  const viewerUrls = images.map((image) => mediaUrl(image.imageUrl, 1600));
  const mood = generalMood(score);
  const comment = review.comment.trim();

  const onCloseRef = useRef(onClose);
  const viewerRef = useRef(viewerIndex);
  onCloseRef.current = onClose;
  viewerRef.current = viewerIndex;

  usePageScrollLock(true);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (viewerRef.current != null) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div className="experience-review-detail" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="experience-review-detail__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="experience-review-detail__close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <div className="experience-review-detail__body">
          <div className={`experience-review-detail__top${galleryUrls.length ? "" : " is-solo"}`}>
            <div className="experience-review-detail__identity">
              <span className="experience-reviews__avatar experience-reviews__avatar--detail" aria-hidden="true">
                {avatar ? <img src={avatar} alt="" onError={() => setAvatarFailed(true)} /> : nameInitials(review.user.name)}
              </span>
              <div className="experience-review-detail__facts">
                <h2 id={titleId} className="experience-review-detail__name">{review.user.name}</h2>
                <p className="experience-review-detail__rate">
                  <Stars value={score} />
                  <span>{scoreLabel(score)}</span>
                </p>
                {mood !== "Selecciona una calificación" ? <p className="experience-review-detail__mood">{mood}</p> : null}
                {review.recommended != null ? (
                  <p className="experience-review-detail__recommend">
                    {review.recommended ? "La recomienda" : "No la recomienda"}
                  </p>
                ) : null}
                {own && onEdit && onDelete ? (
                  <p className="experience-reviews__card-actions">
                    <button type="button" onClick={onEdit} disabled={busy}>
                      Editar
                    </button>
                    <span aria-hidden="true">·</span>
                    <button type="button" onClick={onDelete} disabled={busy}>
                      {deleting ? "Eliminando…" : "Eliminar"}
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
            {galleryUrls.length ? (
              <div className="experience-review-detail__media">
                <ReviewPhotoStage
                  urls={galleryUrls}
                  index={photoIndex}
                  onIndexChange={setPhotoIndex}
                  onOpen={(next) => {
                    setPhotoIndex(next);
                    setViewerIndex(next);
                  }}
                />
              </div>
            ) : null}
          </div>
          {comment ? (
            <div className="experience-review-detail__story">
              <p className="experience-review-detail__kicker">Descripción</p>
              <p className="experience-review-detail__comment">{review.comment}</p>
            </div>
          ) : null}
        </div>
      </div>
      {viewerIndex != null && viewerUrls.length ? (
        <ReviewPhotoViewer
          urls={viewerUrls}
          index={viewerIndex}
          onIndexChange={(next) => {
            setViewerIndex(next);
            setPhotoIndex(next);
          }}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>,
    document.body,
  );
}

function ReviewCard({
  review,
  own = false,
  anchor = false,
  busy = false,
  deleting = false,
  onEdit,
  onDelete,
}: {
  review: VisitorReview;
  own?: boolean;
  anchor?: boolean;
  busy?: boolean;
  deleting?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const avatar = review.user.avatarUrl?.trim() && !avatarFailed ? mediaUrl(review.user.avatarUrl, 240) : "";
  const score = reviewScore(review);
  const shown = Math.round(score * 2) / 2;
  const mood = generalMood(shown);

  return (
    <article
      id={anchor ? EXPERIENCE_DETAIL_SECTIONS.ownReview : undefined}
      className={`experience-reviews__quote${own ? " is-own" : ""}`}
      tabIndex={anchor ? -1 : undefined}
    >
      <span className="experience-reviews__avatar" aria-hidden="true">
        {avatar ? <img src={avatar} alt="" onError={() => setAvatarFailed(true)} /> : nameInitials(review.user.name)}
      </span>
      <strong className="experience-reviews__quote-name">{review.user.name}</strong>
      <Stars value={shown} />
      {mood !== "Selecciona una calificación" ? <p className="experience-reviews__quote-mood">{mood}</p> : null}
      {review.recommended != null ? (
        <p className="experience-reviews__quote-recommend">{review.recommended ? "La recomienda" : "No la recomienda"}</p>
      ) : null}
      <button type="button" className="experience-reviews__quote-more" onClick={() => setDetailOpen(true)}>
        Ver más →
      </button>
      {own && onEdit && onDelete ? (
        <p className="experience-reviews__card-actions">
          <button type="button" onClick={onEdit} disabled={busy}>
            Editar
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onDelete} disabled={busy}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </p>
      ) : null}
      {detailOpen ? (
        <ReviewDetailModal
          review={review}
          score={shown}
          own={own}
          busy={busy}
          deleting={deleting}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </article>
  );
}

function draftFromReview(review: VisitorReview | null): ReviewDraft {
  return {
    rating: review?.rating ?? 0,
    organizationRating: review?.organizationRating ?? 0,
    valueRating: review?.valueRating ?? 0,
    recommended: review?.recommended ?? null,
    comment: review?.comment ?? "",
  };
}

export function ExperienceReviewsSection({
  experienceId,
  experienceTitle,
  marks = [],
  coverUrl = null,
  visited,
  composeRequest = 0,
  locations = [],
}: {
  experienceId: string;
  experienceTitle: string;
  marks?: ReviewModalMark[];
  coverUrl?: string | null;
  visited: boolean;
  composeRequest?: number;
  locations?: Array<{ id: string; municipality?: string | null; address?: string | null }>;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mineRef = useRef<VisitorReview[]>([]);
  const sedeRef = useRef(sedeChoices(locations));
  const [summary, setSummary] = useState<VisitorReviewSummary>(EMPTY_SUMMARY);
  const [reviews, setReviews] = useState<VisitorReview[]>([]);
  const [mine, setMine] = useState<VisitorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteLock = useRef(false);
  const [visibleCount, setVisibleCount] = useState(REVIEW_PAGE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listExperienceReviews(experienceId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setSummary(data.summary);
        setReviews(data.reviews);
        setMine(Array.isArray(data.mine) ? data.mine : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(reviewErrorMessage(err, "No se pudieron cargar las reseñas."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId, user?.id]);

  useEffect(() => {
    setVisibleCount(REVIEW_PAGE);
  }, [experienceId]);

  const sedeOptions = sedeChoices(locations);
  mineRef.current = mine;
  sedeRef.current = sedeOptions;
  const reviewedSedes = new Set(mine.flatMap((review) => (review.location?.id ? [review.location.id] : [])));
  const openSedes = sedeOptions.filter((place) => !reviewedSedes.has(place.id));
  const editing = mine.find((review) => review.id === editingId) ?? null;

  useEffect(() => {
    if (!composeRequest) {
      return;
    }
    const options = sedeRef.current;
    const reviewed = new Set(mineRef.current.flatMap((review) => (review.location?.id ? [review.location.id] : [])));
    const pending = options.filter((place) => !reviewed.has(place.id));
    if (pending.length) {
      setEditingId(null);
      setComposer("create");
    } else if (mineRef.current.length === 1) {
      setEditingId(mineRef.current[0]?.id ?? null);
      setComposer("edit");
    }
  }, [composeRequest]);

  function openComposer(mode: "create" | "edit", reviewId?: string) {
    setEditingId(mode === "edit" ? reviewId ?? null : null);
    setComposer(mode);
  }

  async function submit(input: VisitorReviewInput, photos: VisitorReviewPhotos) {
    if (busy) {
      return;
    }
    const editingExisting = composer === "edit" && editing;
    const canAssignSede = !editingExisting || !editingExisting.location;
    const locationId = canAssignSede
      ? input.locationId || (sedeOptions.length === 1 ? sedeOptions[0]?.id : undefined)
      : undefined;
    if (
      editingExisting &&
      !editingExisting.location &&
      locationId &&
      mine.some((review) => review.id !== editingExisting.id && review.location?.id === locationId)
    ) {
      showFavoriteToast("Ya publicaste una reseña para esta sede.", "error");
      return;
    }
    const payload = locationId ? { ...input, locationId } : input;
    setBusy(true);
    try {
      const data = editingExisting
        ? await updateExperienceReview(experienceId, editingExisting.id, payload, photos)
        : await createExperienceReview(experienceId, payload, photos);
      setMine((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);
      setSummary(data.summary);
      setReviews((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);
      setComposer(null);
      showFavoriteToast(editingExisting ? REVIEW_UPDATED : REVIEW_PUBLISHED);
    } catch (err) {
      showFavoriteToast(
        reviewErrorMessage(err, editingExisting ? REVIEW_UPDATE_FAILED : REVIEW_PUBLISH_FAILED),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeOwn(reviewId: string) {
    if (!reviewId || busy || deleteLock.current) {
      return;
    }
    deleteLock.current = true;
    setDeletingId(reviewId);
    setBusy(true);
    try {
      const data = await deleteExperienceReview(experienceId, reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setMine((current) => current.filter((review) => review.id !== reviewId));
      setSummary(data.summary);
      setComposer(null);
      showFavoriteToast(REVIEW_DELETED);
    } catch (err) {
      showFavoriteToast(reviewErrorMessage(err, REVIEW_DELETE_FAILED), "error");
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
      setBusy(false);
    }
  }

  const mineIds = new Set(mine.map((review) => review.id));
  const orderedReviews = [
    ...reviews.filter((review) => mineIds.has(review.id)),
    ...reviews.filter((review) => !mineIds.has(review.id)),
  ];
  const firstOwnId = orderedReviews.find((review) => mineIds.has(review.id))?.id;
  const visibleReviews = orderedReviews.slice(0, visibleCount);
  const canCompose = Boolean(user && visited && openSedes.length > 0);

  return (
    <section className="experience-reviews experience-detail-target" aria-label="Reseñas">
      <header className="experience-reviews__intro">
        <p className="experience-reviews__subtitle">Descubre opiniones compartidas por otros viajeros</p>
        {summary.count > 0 && summary.averageRating != null ? (
          <p
            className="experience-reviews__summary"
            aria-live="polite"
            aria-label={`Calificación promedio ${scoreLabel(summary.averageRating)}, ${summary.count} ${summary.count === 1 ? "reseña" : "reseñas"}`}
          >
            <strong className="experience-reviews__score">{scoreLabel(summary.averageRating)}</strong>
            <span className="experience-reviews__count">
              {summary.count} {summary.count === 1 ? "reseña" : "reseñas"}
            </span>
          </p>
        ) : null}
      </header>

      {loading ? <p className="experience-reviews__note">Cargando reseñas…</p> : null}
      {error ? <p className="experience-reviews__note">{error}</p> : null}

      <div className="experience-reviews__own">
        {!user ? (
          <p className="experience-reviews__note">
            <button
              type="button"
              className="experience-reviews__link"
              onClick={() =>
                navigate("/login", { state: { from: `/explorar/${experienceId}` } })
              }
            >
              Inicia sesión para compartir tu experiencia.
            </button>
          </p>
        ) : null}

        {user && mine.length === 0 && !visited ? (
          <p className="experience-reviews__note">Marca esta experiencia como visitada para poder calificarla.</p>
        ) : null}

        {canCompose && !loading ? (
          <button type="button" className="experience-reviews__primary" onClick={() => openComposer("create")}>
            Calificar experiencia
          </button>
        ) : null}

        {!loading && !error && summary.count === 0 ? (
          <p className="experience-reviews__empty">
            Aún no hay reseñas.
            {canCompose ? " Sé la primera persona en compartir tu experiencia." : ""}
          </p>
        ) : null}
      </div>

      {visibleReviews.length ? (
        <div className="experience-reviews__board">
          <ul className="experience-reviews__list">
            {visibleReviews.map((review) => {
              const own = mineIds.has(review.id);
              return (
              <li key={review.id}>
                <ReviewCard
                  review={review}
                  own={own}
                  anchor={review.id === firstOwnId}
                  busy={busy}
                  deleting={deletingId === review.id}
                  onEdit={own ? () => openComposer("edit", review.id) : undefined}
                  onDelete={own ? () => void removeOwn(review.id) : undefined}
                />
              </li>
              );
            })}
          </ul>
          {orderedReviews.length > visibleCount ? (
            <p className="experience-reviews__pager">
              <button type="button" onClick={() => setVisibleCount((count) => count + REVIEW_PAGE)}>
                Ver más reseñas →
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {composer ? (
        <ReviewComposerModal
          mode={composer}
          experienceTitle={experienceTitle}
          marks={marks}
          coverUrl={coverUrl}
          initial={composer === "edit" ? draftFromReview(editing) : undefined}
          initialPhotos={composer === "edit" ? editing?.images ?? [] : []}
          locations={
            sedeOptions.length > 1 && (composer === "create" || (composer === "edit" && !editing?.location))
              ? sedeOptions
              : []
          }
          sedeLabel={composer === "edit" ? editing?.location?.label ?? null : null}
          placeName={
            locations.length === 1 && (composer === "create" || (composer === "edit" && !editing?.location))
              ? locations[0]?.municipality?.trim() || null
              : null
          }
          busy={busy}
          onClose={() => {
            setComposer(null);
          }}
          onSubmit={(input, photos) => void submit(input, photos)}
        />
      ) : null}
    </section>
  );
}
