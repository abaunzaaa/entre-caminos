import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { EXPERIENCE_DETAIL_SECTIONS, scrollToExperienceSection } from "../../utils/experience-detail-sections";
import { sedeChoices } from "../../utils/experience-places";
import { showFavoriteToast } from "../../services/favorites-sync";
import { mediaUrl } from "../../utils/media";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import reviewBloom from "../../assets/ilustracion-reseña.png";
import { ReviewComposerModal, type ReviewDraft, type ReviewModalMark } from "./ReviewComposerModal";

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

function reviewDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const month = new Intl.DateTimeFormat("es-CO", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
  return {
    month,
    day: new Intl.DateTimeFormat("es-CO", { day: "2-digit" }).format(date),
    year: String(date.getFullYear()),
  };
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
const REVIEW_PHOTO_PREVIEW = 2;

function ReviewLightbox({
  images,
  index,
  onClose,
  onChange,
}: {
  images: NonNullable<VisitorReview["images"]>;
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  usePageScrollLock(true);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight" && index < images.length - 1) {
        onChange(index + 1);
      } else if (event.key === "ArrowLeft" && index > 0) {
        onChange(index - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [images.length, index, onChange, onClose]);

  const image = images[index];
  if (!image) {
    return null;
  }

  return createPortal(
    <div
      className="experience-reviews__lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Foto de la reseña"
      onMouseDown={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="experience-reviews__lightbox-close"
        aria-label="Cerrar"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onClose}
      >
        <X size={18} strokeWidth={1.75} />
      </button>
      {index > 0 ? (
        <button
          type="button"
          className="experience-reviews__lightbox-nav is-prev"
          aria-label="Foto anterior"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onChange(index - 1)}
        >
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
      ) : null}
      <img src={mediaUrl(image.imageUrl, 1600)} alt="" onMouseDown={(event) => event.stopPropagation()} />
      {index < images.length - 1 ? (
        <button
          type="button"
          className="experience-reviews__lightbox-nav is-next"
          aria-label="Foto siguiente"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onChange(index + 1)}
        >
          <ChevronRight size={22} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

function SedeLine({ label }: { label?: string | null }) {
  if (!label) {
    return null;
  }
  return <p className="experience-reviews__sede">Visitó · {label}</p>;
}

function RecommendMark({
  recommended,
  corner = false,
}: {
  recommended: boolean | null;
  corner?: boolean;
}) {
  if (recommended == null) {
    return null;
  }
  return (
    <span className={`experience-reviews__chip${corner ? " is-corner" : ""}`}>
      {recommended ? "La recomienda" : "No la recomienda"}
    </span>
  );
}

function ReviewPhotos({ images }: { images: VisitorReview["images"] }) {
  const [start, setStart] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (!images?.length) {
    return null;
  }
  const maxStart = Math.max(0, images.length - REVIEW_PHOTO_PREVIEW);
  const safeStart = Math.min(start, maxStart);
  const visible = images.slice(safeStart, safeStart + REVIEW_PHOTO_PREVIEW);
  const canPrev = safeStart > 0;
  const canNext = safeStart < maxStart;

  return (
    <div className={`experience-reviews__media${images.length === 1 ? " is-single" : ""}`}>
      <div className="experience-reviews__media-frame">
        {canPrev ? (
          <button
            type="button"
            className="experience-reviews__media-nav is-prev"
            aria-label="Fotos anteriores"
            onClick={(event) => {
              event.stopPropagation();
              setStart((current) => Math.max(0, current - 1));
            }}
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
          </button>
        ) : null}
        <div className="experience-reviews__media-strip">
          {visible.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`experience-reviews__media-item${index === 0 ? " is-primary" : " is-secondary"}`}
              aria-label="Ver foto"
              onClick={() => setLightbox(images.findIndex((item) => item.id === image.id))}
            >
              <img src={mediaUrl(image.imageUrl, 800)} alt="" />
            </button>
          ))}
        </div>
        {canNext ? (
          <button
            type="button"
            className="experience-reviews__media-nav is-next"
            aria-label="Más fotos"
            onClick={(event) => {
              event.stopPropagation();
              setStart((current) => Math.min(maxStart, current + 1));
            }}
          >
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      {lightbox !== null ? (
        <ReviewLightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
        />
      ) : null}
    </div>
  );
}

function commentOverflows(node: HTMLParagraphElement) {
  const width = node.clientWidth;
  if (!width) {
    return false;
  }
  const probe = node.cloneNode(true) as HTMLParagraphElement;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.height = "auto";
  probe.style.maxHeight = "none";
  probe.style.overflow = "visible";
  probe.style.display = "block";
  probe.style.webkitLineClamp = "unset";
  probe.style.width = `${width}px`;
  node.parentElement?.appendChild(probe);
  const full = probe.getBoundingClientRect().height;
  probe.remove();
  const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return false;
  }
  return full > lineHeight * 4 + 1;
}

function ReviewText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [canToggle, setCanToggle] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const update = () => {
      const current = ref.current;
      if (!current) {
        return;
      }
      setCanToggle(commentOverflows(current));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const fonts = document.fonts?.ready.then(update);
    return () => {
      observer.disconnect();
      void fonts;
    };
  }, [text, open]);

  return (
    <>
      <p ref={ref} className={`experience-reviews__comment${open ? " is-open" : ""}`}>
        {text}
      </p>
      {canToggle || open ? (
        <button type="button" className="experience-reviews__more" onClick={() => setOpen((current) => !current)}>
          {open ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </>
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
  const avatar = review.user.avatarUrl?.trim() && !avatarFailed ? mediaUrl(review.user.avatarUrl, 128) : "";
  const date = reviewDateParts(review.updatedAt || review.createdAt);
  const photos = review.images ?? [];
  const showMarks = Boolean(review.location?.label) || review.recommended != null;
  const showRail = photos.length > 0 || showMarks;

  return (
    <article
      id={anchor ? EXPERIENCE_DETAIL_SECTIONS.ownReview : undefined}
      className={`experience-reviews__card${own ? " is-own" : ""}${photos.length ? " has-media" : ""}${!photos.length && showMarks ? " has-marks" : ""}`}
      tabIndex={anchor ? -1 : undefined}
    >
      <div className="experience-reviews__card-person">
        <span className="experience-reviews__avatar" aria-hidden="true">
          {avatar ? <img src={avatar} alt="" onError={() => setAvatarFailed(true)} /> : nameInitials(review.user.name)}
        </span>
      </div>

      <div className="experience-reviews__card-identity">
        {own ? <span className="experience-reviews__yours">Tu reseña</span> : null}
        <strong>{review.user.name}</strong>
        <Stars value={review.score ?? review.rating} />
      </div>

      <div className="experience-reviews__card-body">
        <ReviewText text={review.comment} />
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

      {showRail ? (
        <div className={`experience-reviews__stage${photos.length ? "" : " is-marks-only"}`}>
          {showMarks ? (
            <div className="experience-reviews__marks">
              <SedeLine label={review.location?.label} />
              <RecommendMark recommended={review.recommended} corner />
            </div>
          ) : null}
          {photos.length ? (
            <div className="experience-reviews__gallery">
              <ReviewPhotos images={photos} />
            </div>
          ) : null}
        </div>
      ) : null}

      {date ? (
        <time className="experience-reviews__card-date" dateTime={review.updatedAt || review.createdAt}>
          <span className="experience-reviews__date-month">{date.month}</span>
          <span className="experience-reviews__date-day">{date.day}</span>
          <span className="experience-reviews__date-year">{date.year}</span>
        </time>
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
    scrollToExperienceSection(EXPERIENCE_DETAIL_SECTIONS.reviews);
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
    <section
      id={EXPERIENCE_DETAIL_SECTIONS.reviews}
      className="experience-reviews experience-detail-target"
      aria-label="Reseñas y calificaciones"
    >
      <header className="experience-reviews__intro">
        <img className="experience-reviews__bloom" src={reviewBloom} alt="" />
        <h2 className="dash-exps-place__title">Reseñas y calificaciones</h2>
        <p className="dash-exps-place__lead experience-reviews__lead">
          Descubre opiniones, calificaciones y experiencias compartidas por otros viajeros.
        </p>
        {summary.count > 0 ? (
          <p className="experience-reviews__summary" aria-live="polite">
            <span className="experience-reviews__score">
              <strong>{summary.averageRating?.toFixed(1)}</strong>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.7 14.7 8.2l6 .9-4.35 4.24 1.03 6L12 16.6 6.62 19.34l1.03-6L3.3 9.1l6-.9L12 2.7Z" />
              </svg>
            </span>
            <span aria-hidden="true">·</span>
            <span>
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

        {canCompose ? (
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
