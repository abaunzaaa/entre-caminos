import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReviewCard } from "../experiences/ExperienceReviewsSection";
import { ReviewComposerModal, type ReviewDraft } from "../experiences/ReviewComposerModal";
import { useAuth } from "../../hooks/useAuth";
import {
  deleteExperienceReview,
  listMyReviews,
  updateExperienceReview,
  type MyVisitorReview,
  type VisitorReviewInput,
  type VisitorReviewPhotos,
} from "../../services/reviews.service";
import { showFavoriteToast } from "../../services/favorites-sync";
import { getApiErrorMessage } from "../../utils/api-error";
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

export function ProfileReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<MyVisitorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<MyVisitorReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(1);
  const [offset, setOffset] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setReviews([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    listMyReviews()
      .then((data) => {
        if (!cancelled) {
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "No se pudieron cargar las reseñas."));
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
  }, [user?.id]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    function measure() {
      const node = viewportRef.current;
      if (!node) {
        return;
      }
      const style = getComputedStyle(node);
      const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const available = Math.max(0, node.clientWidth - padX);
      const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gap = 1.75 * root;
      const preferred = 17.25 * root;
      const card = available > 0 ? Math.min(preferred, available) : preferred;
      const count = card > 0 ? Math.max(1, Math.floor((available + gap) / (card + gap))) : 1;
      const shown = Math.min(count, Math.max(reviews.length, 1));
      const windowWidth = shown * card + Math.max(0, shown - 1) * gap;
      node.style.setProperty("--profile-review-card", `${card}px`);
      setVisible(shown);
      setStep(card + gap);
      setOffset(Math.max(0, (available - windowWidth) / 2));
      setIndex((current) => Math.min(current, Math.max(0, reviews.length - shown)));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [reviews.length]);

  async function saveReview(input: VisitorReviewInput, photos: VisitorReviewPhotos) {
    if (!editing || busy) {
      return;
    }
    setBusy(true);
    try {
      const data = await updateExperienceReview(editing.experienceId, editing.id, input, photos);
      setReviews((current) =>
        current.map((review) =>
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
      setReviews((current) => current.filter((item) => item.id !== review.id));
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
      {loading ? <p className="experience-reviews__note">Cargando reseñas…</p> : null}
      {!loading && error ? <p className="experience-reviews__note">{error}</p> : null}
      {!loading && !error && reviews.length === 0 ? (
        <div className="profile-reviews__empty">
          <h2 className="explorer-discover-title">Aún no tienes reseñas</h2>
          <p className="experience-reviews__empty">Cuando compartas tus experiencias, tus reseñas aparecerán aquí.</p>
        </div>
      ) : null}
      {!loading && !error && reviews.length > 0 ? (
        <div className="profile-reviews__carousel">
          {reviews.length > visible ? (
            <button
              type="button"
              className="profile-reviews__nav"
              aria-label="Reseñas anteriores"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft size={18} strokeWidth={1.85} aria-hidden="true" />
            </button>
          ) : null}
          <div className="profile-reviews__viewport" ref={viewportRef}>
            <ul
              className="profile-reviews__track"
              style={{ transform: `translate3d(${offset - index * step}px, 0, 0)` }}
            >
              {reviews.map((review) => {
                const own = Boolean(user && review.user.id === user.id);
                return (
                  <li key={review.id}>
                    <ReviewCard
                      review={review}
                      experienceTitle={review.experience.title}
                      own={own}
                      busy={busy}
                      deleting={deletingId === review.id}
                      onEdit={own ? () => setEditing(review) : undefined}
                      onDelete={own ? () => void removeReview(review) : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
          {reviews.length > visible ? (
            <button
              type="button"
              className="profile-reviews__nav"
              aria-label="Reseñas siguientes"
              disabled={index >= reviews.length - visible}
              onClick={() => setIndex((current) => Math.min(reviews.length - visible, current + 1))}
            >
              <ChevronRight size={18} strokeWidth={1.85} aria-hidden="true" />
            </button>
          ) : null}
        </div>
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
