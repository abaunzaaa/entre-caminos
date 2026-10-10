import { useEffect } from "react";

let locks = 0;
let previousOverflow = "";
let previousPaddingRight = "";

/**
 * Reference-counted page scroll lock.
 * Nested modals share one lock. The original overflow is restored only
 * when the last lock is released, so a child cleanup cannot write "hidden"
 * back after the parent already closed.
 */
export function lockPageScroll(): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (locks === 0) {
    const { body } = document;
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      const currentPadding = Number.parseInt(previousPaddingRight || "0", 10) || 0;
      body.style.paddingRight = `${currentPadding + scrollbar}px`;
    }
  }

  locks += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    }
  };
}

export function usePageScrollLock(active = true) {
  useEffect(() => {
    if (!active) {
      return;
    }
    return lockPageScroll();
  }, [active]);
}
