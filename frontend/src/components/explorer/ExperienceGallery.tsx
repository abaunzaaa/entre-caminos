import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import type { Experience } from "../../types";
import { ExperiencePreview } from "./ExperiencePreview";

type ExperienceGalleryProps = {
  experiences: Experience[];
  selectedId: string | null;
  onSelect: (experience: Experience) => void;
};

const SLIDE_MS = 520;
const SLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DRAG_THRESHOLD = 56;
const DRAG_ARM = 8;
/** Buffer slides (±2) stay off-screen for seamless loops; only ±1 and 0 are visible. */
const WINDOW_RELS = [-2, -1, 0, 1, 2] as const;

export function ExperienceGallery({ experiences, selectedId, onSelect }: ExperienceGalleryProps) {
  const total = experiences.length;

  const selectedIndex = useMemo(() => {
    if (!total) {
      return 0;
    }
    const found = experiences.findIndex((item) => item.id === selectedId);
    return found >= 0 ? found : 0;
  }, [experiences, selectedId, total]);

  const [displayIndex, setDisplayIndex] = useState(selectedIndex);
  const [shift, setShift] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [baseTx, setBaseTx] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const pendingDir = useRef<0 | 1 | -1>(0);
  const suppressClick = useRef(false);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    lastX: 0,
    moved: false,
    armed: false,
  });

  useEffect(() => {
    if (!animating && !dragging) {
      setDisplayIndex(selectedIndex);
    }
  }, [selectedIndex, animating, dragging]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const windowSlides = useMemo(() => {
    if (!total) {
      return [] as Array<{ rel: number; experience: Experience }>;
    }
    if (total === 1) {
      return [{ rel: 0, experience: experiences[0]! }];
    }
    if (total === 2) {
      return [
        { rel: -1, experience: experiences[(displayIndex - 1 + total) % total]! },
        { rel: 0, experience: experiences[displayIndex]! },
        { rel: 1, experience: experiences[(displayIndex + 1) % total]! },
      ];
    }
    return WINDOW_RELS.map((rel) => ({
      rel,
      experience: experiences[(displayIndex + rel + total) % total]!,
    }));
  }, [experiences, displayIndex, total]);

  const measureLayout = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) {
      return;
    }
    if (track.children.length >= 2) {
      const first = track.children[0] as HTMLElement;
      const second = track.children[1] as HTMLElement;
      const delta = second.offsetLeft - first.offsetLeft;
      if (delta > 0) {
        stepRef.current = delta;
      }
    }
    const active = track.querySelector('[data-rel="0"]') as HTMLElement | null;
    if (!active) {
      return;
    }
    setBaseTx(stage.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2));
  }, []);

  useLayoutEffect(() => {
    if (shift !== 0 || dragging || animating) {
      return;
    }
    measureLayout();
  }, [measureLayout, windowSlides, shift, dragging, animating]);

  useEffect(() => {
    const onResize = () => measureLayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureLayout]);

  const finishShift = useCallback(() => {
    const dir = pendingDir.current;
    pendingDir.current = 0;
    if (!dir || !total) {
      setShift(0);
      setAnimating(false);
      return;
    }
    const nextIndex = (displayIndex + dir + total) % total;
    setDisplayIndex(nextIndex);
    setShift(0);
    setAnimating(false);
    // Sheet already updated at commit time — do not re-trigger content animation
  }, [displayIndex, total]);

  useEffect(() => {
    if (!animating || shift === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (pendingDir.current) {
        finishShift();
      }
    }, SLIDE_MS + 100);
    return () => window.clearTimeout(timer);
  }, [animating, shift, finishShift]);

  const commitShift = useCallback(
    (dir: 1 | -1) => {
      if (!total || animating || dragging) {
        return;
      }
      const nextIndex = (displayIndex + dir + total) % total;
      const target = experiences[nextIndex];
      if (!target) {
        return;
      }
      // Update hoja immediately, in sync with the navigation intent
      onSelect(target);

      if (reduceMotion || total < 2) {
        setDisplayIndex(nextIndex);
        return;
      }
      measureLayout();
      if (stepRef.current <= 0) {
        setDisplayIndex(nextIndex);
        return;
      }
      pendingDir.current = dir;
      setAnimating(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShift(dir);
        });
      });
    },
    [animating, dragging, displayIndex, experiences, measureLayout, onSelect, reduceMotion, total],
  );

  function onTrackTransitionEnd(event: ReactTransitionEvent<HTMLDivElement>) {
    if (event.target !== trackRef.current) {
      return;
    }
    if (event.propertyName !== "transform") {
      return;
    }
    if (!pendingDir.current) {
      return;
    }
    finishShift();
  }

  function selectFromCard(experience: Experience) {
    if (suppressClick.current || animating || dragging) {
      return;
    }
    const idx = experiences.findIndex((item) => item.id === experience.id);
    if (idx < 0) {
      return;
    }
    if (idx === displayIndex) {
      onSelect(experience);
      return;
    }
    const forward = (idx - displayIndex + total) % total;
    const backward = (displayIndex - idx + total) % total;
    if (forward === 1) {
      commitShift(1);
      return;
    }
    if (backward === 1) {
      commitShift(-1);
      return;
    }
    setDisplayIndex(idx);
    onSelect(experience);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (animating || total < 2 || event.button !== 0) {
      return;
    }
    // Arm drag only — do not capture yet so card clicks still fire
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      moved: false,
      armed: true,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.armed || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - dragRef.current.startX;
    dragRef.current.lastX = event.clientX;
    if (!dragRef.current.moved && Math.abs(dx) > DRAG_ARM) {
      dragRef.current.moved = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (dragRef.current.moved) {
      setDragOffset(dx);
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.armed || dragRef.current.pointerId !== event.pointerId) {
      return;
    }
    const dx = dragRef.current.lastX - dragRef.current.startX;
    const moved = dragRef.current.moved;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* already released */
    }
    dragRef.current.armed = false;
    dragRef.current.pointerId = -1;
    setDragging(false);
    setDragOffset(0);

    if (!moved) {
      return;
    }

    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 50);

    if (dx <= -DRAG_THRESHOLD) {
      commitShift(1);
      return;
    }
    if (dx >= DRAG_THRESHOLD) {
      commitShift(-1);
    }
  }

  if (total === 0) {
    return (
      <div className="experience-gallery experience-gallery--empty" aria-hidden="true">
        <div className="experience-gallery__placeholder" />
      </div>
    );
  }

  const canNavigate = total > 1;
  const step = stepRef.current;
  const trackTx = baseTx - shift * (step || 0) + dragOffset;
  const shouldTransition = animating && !dragging && !reduceMotion && shift !== 0;
  const trackStyle = {
    transform: `translate3d(${trackTx}px, 0, 0)`,
    transition: shouldTransition ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}` : "none",
  } as const;

  return (
    <div className="experience-gallery" aria-label="Carrusel de experiencias">
      {canNavigate ? (
        <button
          type="button"
          className="experience-gallery__nav experience-gallery__nav--prev"
          aria-label="Experiencia anterior"
          disabled={animating}
          onClick={() => commitShift(-1)}
        >
          <ChevronLeft size={18} strokeWidth={1.85} aria-hidden="true" />
        </button>
      ) : null}

      <div
        ref={stageRef}
        className={`experience-gallery__stage${dragging ? " is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={trackRef}
          className="experience-gallery__track"
          style={trackStyle}
          onTransitionEnd={onTrackTransitionEnd}
        >
          {windowSlides.map(({ rel, experience }) => {
            const visualRel = rel - shift;
            const isVisualActive = visualRel === 0;
            const isVisible = Math.abs(visualRel) <= 1;
            const role = isVisualActive ? "active" : visualRel < 0 ? "prev" : "next";
            const motionOn = animating && !dragging && !reduceMotion;
            return (
              <article
                key={`rel-${rel}`}
                className={`experience-gallery__slide is-${role}${isVisualActive ? " is-active" : ""}${
                  isVisible ? "" : " is-edge"
                }${motionOn ? " is-motion" : ""}`}
                data-rel={rel}
              >
                <ExperiencePreview
                  experience={experience}
                  selected={isVisualActive}
                  onSelect={selectFromCard}
                />
              </article>
            );
          })}
        </div>
      </div>

      {canNavigate ? (
        <button
          type="button"
          className="experience-gallery__nav experience-gallery__nav--next"
          aria-label="Siguiente experiencia"
          disabled={animating}
          onClick={() => commitShift(1)}
        >
          <ChevronRight size={18} strokeWidth={1.85} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
