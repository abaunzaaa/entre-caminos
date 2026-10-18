import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listExperienceReviews, type VisitorReview, type VisitorReviewSummary } from "../../services/reviews.service";
import { EXPERIENCE_DETAIL_SECTIONS } from "../../utils/experience-detail-sections";
import { formatPersonName } from "../../utils/person-name";

type ReviewsState = {
  summary: VisitorReviewSummary;
  reviews: VisitorReview[];
};

function starLabel(value: number) {
  const shown = Math.round(value * 2) / 2;
  return `${shown} de 5`;
}

function Stars({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="explorer-map-reviews__stars" aria-label={starLabel(shown)}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = shown >= index + 1 ? "is-full" : shown >= index + 0.5 ? "is-half" : "is-empty";
        return (
          <span key={index} className={fill} aria-hidden="true">
            ★
          </span>
        );
      })}
    </span>
  );
}

function reviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function firstName(name: string) {
  return formatPersonName(name).split(" ")[0] || "Viajero";
}

export function MapExperienceReviews({ experienceId }: { experienceId: string }) {
  const [state, setState] = useState<ReviewsState | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError(false);
    listExperienceReviews(experienceId)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const ownIds = new Set(data.mine.map((review) => review.id));
        setState({
          summary: data.summary,
          reviews: data.reviews.filter((review) => !ownIds.has(review.id)).slice(0, 3),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId]);

  if (error) {
    return <p className="explorer-map-reviews__empty">No pudimos cargar las reseñas.</p>;
  }
  if (!state) {
    return <p className="explorer-map-reviews__empty">Cargando reseñas…</p>;
  }

  const average = state.summary.averageRating;
  return (
    <div className="explorer-map-reviews">
      {average != null && state.summary.count > 0 ? (
        <p className="explorer-map-reviews__score">
          <Stars value={average} />
          <span>
            {new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average)}
            {" · "}
            {state.summary.count} {state.summary.count === 1 ? "reseña" : "reseñas"}
          </span>
        </p>
      ) : null}
      <p className="explorer-map-reviews__label">Reseñas</p>
      {state.reviews.length === 0 ? (
        <p className="explorer-map-reviews__empty">Aún no hay reseñas para esta experiencia.</p>
      ) : (
        <ul>
          {state.reviews.map((review) => (
            <li key={review.id}>
              <p className="explorer-map-reviews__person">
                <Stars value={review.score || review.rating} />
                <strong>{firstName(review.user.name)}</strong>
                {reviewDate(review.createdAt) ? <span>{reviewDate(review.createdAt)}</span> : null}
              </p>
              {review.comment.trim() ? <p className="explorer-map-reviews__comment">{review.comment.trim()}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <Link to={`/explorar/${experienceId}#${EXPERIENCE_DETAIL_SECTIONS.reviews}`}>Ver experiencia</Link>
    </div>
  );
}
