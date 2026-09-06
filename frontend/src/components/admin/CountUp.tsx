import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(value: number, duration = 720) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    const next = Number.isFinite(value) ? value : 0;
    if (prefersReducedMotion()) {
      shownRef.current = next;
      setShown(next);
      return;
    }

    const from = shownRef.current;
    if (from === next) {
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(from + (next - from) * eased);
      shownRef.current = current;
      setShown(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}

export function CountUp({ value }: { value: number }) {
  const shown = useCountUp(value);
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
