import { useEffect, useRef, useState } from "react";

type GalleryMotion = "idle" | "next-from" | "next-to" | "prev-from" | "prev-to";
type GallerySlot = "primary" | "secondary" | "flush";

const GALLERY_SHIFT_MS = 420;

function wrapIndex(value: number, count: number) {
  return (value + count) % count;
}

export function RecsExperienceGallery({ urls }: { urls: string[] }) {
  const count = urls.length;
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState<GalleryMotion>("idle");
  const motionRef = useRef<GalleryMotion>("idle");
  motionRef.current = motion;

  useEffect(() => {
    if (motion !== "next-from" && motion !== "prev-from") {
      return;
    }
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
    if (motion !== "next-to" && motion !== "prev-to") {
      return;
    }
    const timer = window.setTimeout(() => settleMotion(), GALLERY_SHIFT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [motion]);

  function settleMotion() {
    const current = motionRef.current;
    if (current !== "next-to" && current !== "prev-to") {
      return;
    }
    motionRef.current = "idle";
    setIndex((value) => wrapIndex(current === "next-to" ? value + 1 : value - 1, count));
    setMotion("idle");
  }

  function go(direction: "next" | "prev") {
    if (count < 2 || motionRef.current !== "idle") {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex((value) => wrapIndex(direction === "next" ? value + 1 : value - 1, count));
      return;
    }
    setMotion(direction === "next" ? "next-from" : "prev-from");
  }

  if (count < 2) {
    return (
      <div className="explorer-recs__gallery is-single">
        <div className="explorer-recs__photo explorer-recs__photo--primary">
          <img src={urls[0]} alt="" draggable={false} loading="lazy" decoding="async" />
        </div>
      </div>
    );
  }

  const shifting = motion !== "idle";
  const slides =
    motion === "idle"
      ? [
          { imageIndex: index, slot: "primary" as GallerySlot },
          { imageIndex: wrapIndex(index + 1, count), slot: "secondary" as GallerySlot },
        ]
      : motion.startsWith("next")
        ? [
            { imageIndex: index, slot: (motion === "next-to" ? "flush" : "primary") as GallerySlot },
            { imageIndex: wrapIndex(index + 1, count), slot: (motion === "next-to" ? "primary" : "secondary") as GallerySlot },
            { imageIndex: wrapIndex(index + 2, count), slot: (motion === "next-to" ? "secondary" : "flush") as GallerySlot },
          ]
        : [
            { imageIndex: wrapIndex(index - 1, count), slot: (motion === "prev-to" ? "primary" : "flush") as GallerySlot },
            { imageIndex: index, slot: (motion === "prev-to" ? "secondary" : "primary") as GallerySlot },
            { imageIndex: wrapIndex(index + 1, count), slot: (motion === "prev-to" ? "flush" : "secondary") as GallerySlot },
          ];

  return (
    <div className={`explorer-recs__gallery${shifting ? " is-shifting" : ""}`}>
      {slides.map((slide) => {
        const interactive = motion === "idle" && slide.slot !== "flush";
        return (
          <button
            key={`slide-${slide.imageIndex}`}
            type="button"
            className={`explorer-recs__photo explorer-recs__photo--${slide.slot}`}
            aria-label={slide.slot === "secondary" ? "Siguiente imagen" : "Imagen anterior"}
            tabIndex={interactive ? 0 : -1}
            onClick={() => {
              if (!interactive) {
                return;
              }
              go(slide.slot === "secondary" ? "next" : "prev");
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName !== "width" || event.currentTarget !== event.target) {
                return;
              }
              if (slide.slot !== "flush") {
                return;
              }
              settleMotion();
            }}
          >
            <img src={urls[slide.imageIndex]} alt="" draggable={false} loading="lazy" decoding="async" />
          </button>
        );
      })}
    </div>
  );
}
