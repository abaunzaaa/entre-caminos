import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DashCardRail({
  children,
  label,
  className,
  scrollerClassName,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  scrollerClassName?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const count = Children.count(children);

  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 8) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    setCanPrev(scroller.scrollLeft > 8);
    setCanNext(scroller.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(scroller);
    for (const child of scroller.children) {
      observer.observe(child);
    }
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const timer = window.setTimeout(update, 80);
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearTimeout(timer);
    };
  }, [count, update]);

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = Math.max(scroller.clientWidth * 0.82, 220);
    scroller.scrollBy({
      left: direction * amount,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className={`dash-card-rail${className ? ` ${className}` : ""}`}>
      {canPrev ? (
        <button
          type="button"
          className="dash-card-rail__nav dash-card-rail__nav--prev"
          aria-label="Ver tarjetas anteriores"
          onClick={() => scrollByPage(-1)}
        >
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className={`dash-card-rail__scroller${scrollerClassName ? ` ${scrollerClassName}` : ""}`}
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
      {canNext ? (
        <button
          type="button"
          className="dash-card-rail__nav dash-card-rail__nav--next"
          aria-label="Ver tarjetas siguientes"
          onClick={() => scrollByPage(1)}
        >
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
