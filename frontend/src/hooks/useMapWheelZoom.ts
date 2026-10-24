import { useCallback, useEffect, useRef, type RefObject } from "react";
import { clampMapZoom, wheelZoomStep } from "../utils/map-wheel";

type UseMapWheelZoomOptions = {
  viewportRef: RefObject<HTMLElement | null>;
  zoomRef: { current: number };
  enabled: boolean;
  minZoom: number;
  maxZoom: number;
  setZoom: (zoom: number) => void;
  onInteract?: () => void;
};

export function useMapWheelZoom({
  viewportRef,
  zoomRef,
  enabled,
  minZoom,
  maxZoom,
  setZoom,
  onInteract,
}: UseMapWheelZoomOptions) {
  const setZoomRef = useRef(setZoom);
  const onInteractRef = useRef(onInteract);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  setZoomRef.current = setZoom;
  onInteractRef.current = onInteract;

  const stopWheel = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    targetRef.current = null;
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!enabled || !node) {
      return;
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      onInteractRef.current?.();
      const step = wheelZoomStep(event.deltaY, event.deltaMode, node.clientHeight || 0);
      if (!step) {
        return;
      }
      const base = targetRef.current ?? zoomRef.current;
      const target = clampMapZoom(base + step, minZoom, maxZoom);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        stopWheel();
        zoomRef.current = target;
        setZoomRef.current(target);
        return;
      }
      targetRef.current = target;
      if (frameRef.current != null) {
        return;
      }
      const tick = () => {
        const goal = targetRef.current;
        if (goal == null) {
          frameRef.current = null;
          return;
        }
        const delta = goal - zoomRef.current;
        if (Math.abs(delta) < 0.004) {
          zoomRef.current = goal;
          setZoomRef.current(goal);
          targetRef.current = null;
          frameRef.current = null;
          return;
        }
        const next = zoomRef.current + delta * 0.28;
        zoomRef.current = next;
        setZoomRef.current(next);
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    }

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      stopWheel();
    };
  }, [enabled, maxZoom, minZoom, stopWheel, viewportRef, zoomRef]);

  return stopWheel;
}
