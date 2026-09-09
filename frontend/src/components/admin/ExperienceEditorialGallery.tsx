import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PX_PER_SECOND = 18;
const ARROW_PAUSE_MS = 3600;
const TOUCH_RESUME_MS = 1800;
const ARROW_EASE_MS = 560;

function staggerClass(index: number) {
  return `dash-exps-editorial__shot dash-exps-editorial__shot--s${(index % 5) + 1}`;
}

export function ExperienceEditorialGallery({
  slides,
  label,
}: {
  slides: string[];
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const copyWidthRef = useRef(0);
  const shiftXRef = useRef(0);
  const pauseTimerRef = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [marqueeReady, setMarqueeReady] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const looping = slides.length >= 2 && !reduceMotion;
  const copies = looping ? 2 : 1;
  const slideKey = slides.join("|");

  function measureCopyWidth() {
    const rail = railRef.current;
    if (!rail || !looping) {
      copyWidthRef.current = 0;
      setMarqueeReady(false);
      return 0;
    }
    const kids = rail.children;
    if (kids.length < slides.length * 2) {
      copyWidthRef.current = 0;
      setMarqueeReady(false);
      return 0;
    }
    const width =
      (kids[slides.length] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
    copyWidthRef.current = width;
    rail.style.setProperty("--editorial-shift", `-${width}px`);
    rail.style.setProperty("--editorial-duration", `${Math.max(width / PX_PER_SECOND, 48)}s`);
    setMarqueeReady(width > 0);
    return width;
  }

  function wrapShift(value: number) {
    const width = copyWidthRef.current;
    if (width <= 0) {
      return value;
    }
    let next = value;
    while (next <= -width) {
      next += width;
    }
    while (next > 0) {
      next -= width;
    }
    return next;
  }

  function applyShift(value: number, animate: boolean) {
    const node = shiftRef.current;
    if (!node) {
      return;
    }
    shiftXRef.current = value;
    node.style.transition = animate ? `transform ${ARROW_EASE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none";
    node.style.transform = `translate3d(${value}px, 0, 0)`;
  }

  function pauseAutoplay(ms: number) {
    if (!looping) {
      return;
    }
    setInteractionPaused(true);
    window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      setInteractionPaused(false);
    }, ms);
  }

  function updateOverflow() {
    const node = trackRef.current;
    if (!node) {
      return;
    }
    if (looping) {
      setCanPrev(true);
      setCanNext(true);
      return;
    }
    const max = node.scrollWidth - node.clientWidth;
    setCanPrev(node.scrollLeft > 8);
    setCanNext(max > 8 && node.scrollLeft < max - 8);
  }

  useLayoutEffect(() => {
    measureCopyWidth();
  }, [slideKey, looping]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const rail = railRef.current;
    if (!track) {
      return;
    }
    const refresh = () => {
      measureCopyWidth();
      updateOverflow();
    };
    refresh();
    track.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = window.ResizeObserver ? new ResizeObserver(refresh) : null;
    observer?.observe(track);
    if (rail) {
      observer?.observe(rail);
    }
    const images = Array.from(track.querySelectorAll("img"));
    images.forEach((img) => img.addEventListener("load", refresh));
    return () => {
      track.removeEventListener("scroll", updateOverflow);
      observer?.disconnect();
      images.forEach((img) => img.removeEventListener("load", refresh));
      window.clearTimeout(pauseTimerRef.current);
    };
  }, [slideKey, looping]);

  function scrollByDirection(direction: number) {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const amount = Math.round(Math.min(track.clientWidth * 0.55, 280));
    if (!looping) {
      track.scrollBy({ left: direction * amount, behavior: "smooth" });
      return;
    }
    pauseAutoplay(ARROW_PAUSE_MS);
    measureCopyWidth();
    const width = copyWidthRef.current;
    if (width > 0 && direction < 0 && shiftXRef.current > -amount) {
      applyShift(shiftXRef.current - width, false);
    }
    const target = shiftXRef.current - direction * amount;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyShift(target, true);
        window.setTimeout(() => {
          applyShift(wrapShift(shiftXRef.current), false);
        }, ARROW_EASE_MS);
      });
    });
  }

  if (!slides.length) {
    return <p className="dash-exps-editorial__empty">Sin imagen</p>;
  }

  const showNav = slides.length > 3;

  return (
    <div
      className={`dash-exps-editorial__gallery${interactionPaused ? " is-editorial-paused" : ""}`}
      onTouchStart={() => {
        if (!looping) {
          return;
        }
        window.clearTimeout(pauseTimerRef.current);
        setInteractionPaused(true);
      }}
      onTouchEnd={() => pauseAutoplay(TOUCH_RESUME_MS)}
      onTouchCancel={() => pauseAutoplay(TOUCH_RESUME_MS)}
    >
      {showNav ? (
        <button
          type="button"
          className="dash-exps-editorial__nav dash-exps-editorial__nav--prev"
          aria-label="Ver fotografías anteriores"
          disabled={!canPrev}
          onClick={() => scrollByDirection(-1)}
        >
          <ChevronLeft size={18} strokeWidth={1.6} />
        </button>
      ) : null}
      <div
        className={`dash-exps-editorial__track${looping ? " dash-exps-editorial__track--marquee" : ""}`}
        ref={trackRef}
      >
        <div className="dash-exps-editorial__shift" ref={shiftRef}>
          <div
            className={`dash-exps-editorial__rail${looping && marqueeReady ? " dash-exps-editorial__rail--marquee" : ""}`}
            ref={railRef}
          >
            {Array.from({ length: copies }, (_, copy) =>
              slides.map((src, index) => (
                <figure
                  key={`${copy}-${src}-${index}`}
                  className={staggerClass(index)}
                  aria-hidden={copy > 0 ? true : undefined}
                >
                  <img src={src} alt={copy > 0 ? "" : `${label}, fotografía ${index + 1}`} />
                </figure>
              )),
            )}
          </div>
        </div>
      </div>
      {showNav ? (
        <button
          type="button"
          className="dash-exps-editorial__nav dash-exps-editorial__nav--next"
          aria-label="Ver fotografías siguientes"
          disabled={!canNext}
          onClick={() => scrollByDirection(1)}
        >
          <ChevronRight size={18} strokeWidth={1.6} />
        </button>
      ) : null}
    </div>
  );
}
