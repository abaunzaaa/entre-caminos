import { useCallback, useEffect, useState } from "react";

type UseInViewRevealOptions = {
  root?: Element | Document | null;
  /** Shrinks the root so enter/leave feel intentional. */
  rootMargin?: string;
  /** Enter when at least this much of the target is visible. */
  enterRatio?: number;
  /** Leave only when visibility drops to this or below (hysteresis). */
  leaveRatio?: number;
  immediate?: boolean;
};

/**
 * Toggles inView as the target enters/leaves the viewport.
 * Uses enter/leave ratios so small scroll jitter does not retrigger.
 */
export function useInViewReveal<T extends HTMLElement = HTMLElement>(
  options: UseInViewRevealOptions = {},
) {
  const {
    root = null,
    rootMargin = "0px 0px -15% 0px",
    enterRatio = 0.22,
    leaveRatio = 0.06,
    immediate = false,
  } = options;

  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  const ref = useCallback((element: T | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node) {
      return;
    }

    const reduceMotion =
      immediate ||
      (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (reduceMotion) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }
        const ratio = entry.intersectionRatio;
        if (ratio >= enterRatio) {
          setInView(true);
          return;
        }
        if (ratio <= leaveRatio) {
          setInView(false);
        }
      },
      {
        root,
        rootMargin,
        threshold: [0, 0.04, 0.06, 0.08, 0.12, 0.16, 0.2, 0.22, 0.25, 0.3, 0.4, 0.5, 0.75, 1],
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enterRatio, immediate, leaveRatio, node, root, rootMargin]);

  return { ref, inView };
}
