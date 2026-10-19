import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { listExperienceReviews, type VisitorReview, type VisitorReviewSummary } from "../../services/reviews.service";
import { mediaUrl } from "../../utils/media";
import { formatPersonName } from "../../utils/person-name";

type ReviewsState = {
  summary: VisitorReviewSummary;
  reviews: VisitorReview[];
};

function formatScore(value: number) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function reviewScore(review: VisitorReview) {
  const value = Number.isFinite(review.score) ? review.score : review.rating;
  return Number.isFinite(value) ? value : null;
}

function ReviewStars({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="explorer-map-reviews__stars" aria-label={`${formatScore(shown)} de 5`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const amount = Math.max(0, Math.min(1, shown - index));
        return (
          <span key={index} className="explorer-map-reviews__star" aria-hidden="true">
            <span>★</span>
            <span style={{ width: `${amount * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

function initials(name: string) {
  const parts = formatPersonName(name).split(" ").filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0)).join("") || "EC";
}

function ReviewAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const source = avatarUrl?.trim() && !failed ? mediaUrl(avatarUrl, 128) : "";
  return (
    <span className="explorer-map-reviews__avatar" aria-hidden="true">
      {source ? <img src={source} alt="" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}

export function MapExperienceReviews({
  experienceId,
  title,
  place,
  imageUrl,
  onBack,
}: {
  experienceId: string;
  title: string;
  place: string;
  imageUrl: string;
  onBack: () => void;
}) {
  const [state, setState] = useState<ReviewsState | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError(false);
    listExperienceReviews(experienceId)
      .then((data) => {
        if (!cancelled) {
          setState({ summary: data.summary, reviews: data.reviews });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, experienceId]);

  const average = state?.summary.averageRating ?? null;
  const count = state?.summary.count ?? 0;
  const showSummary = average != null && count > 0;

  return (
    <section className="explorer-map-reviews" aria-label={`Reseñas de ${title}`}>
      <button type="button" className="explorer-map-reviews__back" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        Volver a experiencias
      </button>
      <header className="explorer-map-reviews__experience">
        <img src={imageUrl} alt="" />
        <div>
          <h2>{title}</h2>
          {place ? <p>{place}</p> : null}
          {showSummary ? (
            <p className="explorer-map-reviews__summary">
              <ReviewStars value={average} />
              <strong>{formatScore(average)}</strong>
              <span className="explorer-map-reviews__count">{count === 1 ? "1 reseña" : `${count} reseñas`}</span>
            </p>
          ) : null}
        </div>
      </header>
      <h3 className="explorer-map-page__section">Reseñas</h3>
      {error ? (
        <div className="explorer-map-reviews__void">
          <p className="explorer-map-reviews__void-title">No pudimos cargar las reseñas</p>
          <p>Inténtalo de nuevo en un momento.</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Intentar de nuevo
          </button>
        </div>
      ) : !state ? (
        <p className="explorer-map-reviews__loading">Cargando reseñas…</p>
      ) : state.reviews.length === 0 ? (
        <div className="explorer-map-reviews__void">
          <span className="explorer-map-reviews__void-icon" aria-hidden="true">
            <Star size={22} strokeWidth={1.6} />
          </span>
          <p className="explorer-map-reviews__void-title">Aún no hay reseñas</p>
          <p>Esta experiencia todavía no tiene reseñas de otros viajeros.</p>
        </div>
      ) : (
        <ul>
          {state.reviews.map((review) => {
            const score = reviewScore(review);
            const comment = review.comment.trim();
            const name = formatPersonName(review.user.name) || "Viajero";
            return (
              <li key={review.id}>
                <article className="explorer-map-reviews__card">
                  <div className="explorer-map-reviews__person">
                    <ReviewAvatar name={review.user.name} avatarUrl={review.user.avatarUrl} />
                    <div>
                      <strong>{name}</strong>
                      {score != null ? (
                        <p>
                          <ReviewStars value={score} />
                          <span className="explorer-map-reviews__value">{formatScore(score)}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {comment ? <p className="explorer-map-reviews__comment">{comment}</p> : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
