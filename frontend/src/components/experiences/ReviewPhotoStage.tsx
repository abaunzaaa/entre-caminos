import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";

type GalleryMotion = "idle" | "next-from" | "next-to" | "prev-from" | "prev-to";
type GallerySlot = "primary" | "secondary" | "flush";

const GALLERY_SHIFT_MS = 420;

export function ReviewPhotoViewer({
  urls,
  index,
  onIndexChange,
  onClose,
}: {
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const onIndexChangeRef = useRef(onIndexChange);
  onCloseRef.current = onClose;
  onIndexChangeRef.current = onIndexChange;
  const safeIndex = Math.max(0, Math.min(urls.length - 1, index));
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < urls.length - 1;

  usePageScrollLock(true);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (safeIndex < urls.length - 1) onIndexChangeRef.current(safeIndex + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (safeIndex > 0) onIndexChangeRef.current(safeIndex - 1);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [safeIndex, urls.length]);

  return createPortal(
    <div
      className="experience-reviews__lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Foto de la reseña"
      onMouseDown={(event) => {
        event.stopPropagation();
        onClose();
      }}
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
      <button
        type="button"
        className="experience-reviews__lightbox-nav is-prev"
        aria-label="Foto anterior"
        disabled={!canPrev}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => canPrev && onIndexChange(safeIndex - 1)}
      >
        <ChevronLeft size={22} strokeWidth={1.75} />
      </button>
      <img key={urls[safeIndex]} src={urls[safeIndex]} alt="" onMouseDown={(event) => event.stopPropagation()} />
      <button
        type="button"
        className="experience-reviews__lightbox-nav is-next"
        aria-label="Foto siguiente"
        disabled={!canNext}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => canNext && onIndexChange(safeIndex + 1)}
      >
        <ChevronRight size={22} strokeWidth={1.75} />
      </button>
    </div>,
    document.body,
  );
}

export function ReviewPhotoStage({
  urls,
  index,
  onIndexChange,
  onOpen,
}: {
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onOpen: (index: number) => void;
}) {
  const count = urls.length;
  const [motion, setMotion] = useState<GalleryMotion>("idle");
  const motionRef = useRef<GalleryMotion>("idle");
  const indexRef = useRef(index);
  motionRef.current = motion;
  indexRef.current = index;
  const safeIndex = Math.max(0, Math.min(count - 1, index));

  useEffect(() => {
    if (motion !== "next-from" && motion !== "prev-from") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setMotion(motion === "next-from" ? "next-to" : "prev-to");
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [motion]);

  useEffect(() => {
    if (motion !== "next-to" && motion !== "prev-to") return;
    const timer = window.setTimeout(() => settleMotion(), GALLERY_SHIFT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [motion]);

  function settleMotion() {
    const current = motionRef.current;
    if (current !== "next-to" && current !== "prev-to") return;
    motionRef.current = "idle";
    const delta = current === "next-to" ? 1 : -1;
    const next = Math.max(0, Math.min(count - 1, indexRef.current + delta));
    setMotion("idle");
    onIndexChange(next);
  }

  function go(direction: "next" | "prev") {
    if (count < 2 || motionRef.current !== "idle") return;
    if (direction === "next" && safeIndex >= count - 1) return;
    if (direction === "prev" && safeIndex <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onIndexChange(direction === "next" ? safeIndex + 1 : safeIndex - 1);
      return;
    }
    setMotion(direction === "next" ? "next-from" : "prev-from");
  }

  const canPrev = safeIndex > 0 && motion === "idle";
  const canNext = safeIndex < count - 1 && motion === "idle";
  const atEnd = safeIndex >= count - 1;
  const shifting = motion !== "idle";
  const leavingEnd = motion === "prev-from" && atEnd;
  const closing = motion === "next-to" && safeIndex + 2 >= count;

  if (count < 1) return null;

  if (count < 2) {
    return (
      <div className="experience-review-detail__stage">
        <div className="explorer-recs__gallery is-single">
          <button type="button" className="explorer-recs__photo explorer-recs__photo--primary" aria-label="Ver foto" onClick={() => onOpen(0)}>
            <img src={urls[0]} alt="" draggable={false} />
          </button>
        </div>
      </div>
    );
  }

  const next = safeIndex + 1 < count ? safeIndex + 1 : null;
  const after = safeIndex + 2 < count ? safeIndex + 2 : null;
  const prev = safeIndex - 1 >= 0 ? safeIndex - 1 : null;
  const slides: Array<{ imageIndex: number; slot: GallerySlot }> = [];

  if (motion === "idle") {
    slides.push({ imageIndex: safeIndex, slot: "primary" });
    if (next != null) slides.push({ imageIndex: next, slot: "secondary" });
  } else if (motion.startsWith("next")) {
    slides.push({ imageIndex: safeIndex, slot: motion === "next-to" ? "flush" : "primary" });
    if (next != null) slides.push({ imageIndex: next, slot: motion === "next-to" ? "primary" : "secondary" });
    if (after != null) slides.push({ imageIndex: after, slot: motion === "next-to" ? "secondary" : "flush" });
  } else if (prev != null) {
    slides.push({ imageIndex: prev, slot: motion === "prev-to" ? "primary" : "flush" });
    slides.push({ imageIndex: safeIndex, slot: motion === "prev-to" ? "secondary" : "primary" });
    if (next != null) slides.push({ imageIndex: next, slot: motion === "prev-to" ? "flush" : "secondary" });
  }

  const galleryClass = [
    "explorer-recs__gallery",
    shifting ? "is-shifting" : "",
    motion === "idle" && atEnd ? "is-end" : "",
    leavingEnd ? "is-leaving-end" : "",
    closing ? "is-closing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="experience-review-detail__stage">
      <div className={galleryClass}>
        {slides.map((slide) => (
          <button
            key={`slide-${slide.imageIndex}`}
            type="button"
            className={`explorer-recs__photo explorer-recs__photo--${slide.slot}`}
            aria-label="Ver foto"
            tabIndex={slide.slot === "flush" ? -1 : 0}
            onClick={() => {
              if (motionRef.current !== "idle" || slide.slot === "flush") return;
              onOpen(slide.imageIndex);
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName !== "width" || event.currentTarget !== event.target) return;
              if (slide.slot !== "flush") return;
              settleMotion();
            }}
          >
            <img src={urls[slide.imageIndex]} alt="" draggable={false} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="experience-reviews__media-nav is-prev"
        aria-label="Imagen anterior"
        disabled={!canPrev}
        onClick={() => go("prev")}
      >
        <ChevronLeft size={15} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="experience-reviews__media-nav is-next"
        aria-label="Imagen siguiente"
        disabled={!canNext}
        onClick={() => go("next")}
      >
        <ChevronRight size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}
