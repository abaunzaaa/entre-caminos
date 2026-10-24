import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import mapaIcon from "../../assets/mapa-icon.png";
import sobreVisitados from "../../assets/sobrevisitados.png";
import { experienceCoverUrl } from "../explorer/explorer-media";
import type { MyVisitorReview } from "../../services/reviews.service";
import type { VisitedJourneyStop } from "../../services/visits.service";
import { formatVisitedStamp, formatVisitRating, pickVisitReview } from "../../utils/visited-memory";
import { stopPlaceName } from "../../utils/visited-map";

type MemorySlot = {
  x: number;
  y: number;
  tilt: number;
};

const CARD_WIDTH = 19;
const PAGE_SIZE = 4;
const STEP = 26;
const MOVE_MS = 560;
const FOUR_Y = [18, 0, 20, 3];
const FOUR_TILT = [-3.2, 2, -1.5, 2.4];

function slotsFor(count: number): MemorySlot[] {
  if (count <= 0) {
    return [];
  }
  const span = CARD_WIDTH + STEP * (count - 1);
  const start = count <= PAGE_SIZE ? (100 - span) / 2 : 2.5;
  return Array.from({ length: count }, (_, index) => ({
    x: start + STEP * index,
    y: count === 1 ? 9 : FOUR_Y[index % PAGE_SIZE],
    tilt: count === 1 ? 0 : FOUR_TILT[index % PAGE_SIZE],
  }));
}

function route(slots: MemorySlot[]) {
  const lines: string[] = [];
  for (let index = 0; index < slots.length - 1; index += 1) {
    const from = slots[index];
    const to = slots[index + 1];
    const startX = from.x + CARD_WIDTH + 1.2;
    const endX = to.x - 1.2;
    const startY = from.y + 28;
    const endY = to.y + 28;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 8;
    lines.push(`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
  }
  const width = Math.max(100, (slots[slots.length - 1]?.x ?? 0) + CARD_WIDTH + 2);
  return { lines, width };
}

function memoryCaption(stop: VisitedJourneyStop) {
  return stop.title.trim();
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false,
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return fine;
}

function MemoryStars({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="visited-memory__stars" aria-label={`${formatVisitRating(shown)} de 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = shown >= index + 1 ? "full" : shown >= index + 0.5 ? "half" : "empty";
        return (
          <span key={index} className={`visited-memory__star is-${fill}`} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 2.7 14.7 8.2l6 .9-4.35 4.24 1.03 6L12 16.6 6.62 19.34l1.03-6L3.3 9.1l6-.9L12 2.7Z" />
            </svg>
            <svg viewBox="0 0 24 24" className="is-fill">
              <path d="M12 2.7 14.7 8.2l6 .9-4.35 4.24 1.03 6L12 16.6 6.62 19.34l1.03-6L3.3 9.1l6-.9L12 2.7Z" />
            </svg>
          </span>
        );
      })}
    </span>
  );
}

function MemoryCard({
  stop,
  reviews,
  stampSrc,
  slot,
  onStage,
  near,
  broken,
  flipped,
  finePointer,
  onOpen,
  onClose,
  onToggle,
  onBroken,
}: {
  stop: VisitedJourneyStop;
  reviews: MyVisitorReview[];
  stampSrc: string;
  slot: MemorySlot;
  onStage: boolean;
  near: boolean;
  broken: boolean;
  flipped: boolean;
  finePointer: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onBroken: () => void;
}) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const keyboardFlip = useRef(false);
  const [stampBroken, setStampBroken] = useState(false);
  const caption = memoryCaption(stop);
  const city = stop.municipality.trim() || stopPlaceName(stop);
  const department = stop.department.trim();
  const place = city || department;
  const region = city && department && department.toLocaleLowerCase("es") !== city.toLocaleLowerCase("es") ? department : "";
  const visitedOn = formatVisitedStamp(stop.visitedAt);
  const review = pickVisitReview(reviews, stop.id, city);
  const stamp = stampSrc && !stampBroken ? stampSrc : "";

  useEffect(() => {
    if (!keyboardFlip.current) {
      return;
    }
    keyboardFlip.current = false;
    if (flipped) {
      backRef.current?.focus();
      return;
    }
    frontRef.current?.focus();
  }, [flipped]);

  function toggleFromPointer(event: MouseEvent<HTMLDivElement>) {
    if (finePointer || (event.target as HTMLElement).closest("a")) {
      return;
    }
    onToggle();
  }

  function flipFromKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if ((event.target as HTMLElement).closest("a")) {
      return;
    }
    event.preventDefault();
    keyboardFlip.current = true;
    onToggle();
  }

  return (
    <article
      className={`visited-memory${flipped ? " is-open" : ""}`}
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, "--tilt": `${slot.tilt}deg` } as CSSProperties}
      inert={near ? undefined : true}
      aria-hidden={onStage ? undefined : true}
      onMouseEnter={() => {
        if (finePointer) {
          onOpen();
        }
      }}
      onMouseLeave={(event) => {
        if (!finePointer) {
          return;
        }
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        onClose();
      }}
    >
      <div className="visited-memory__tilt">
      <div className={`visited-memory__flip${flipped ? " is-open" : ""}`}>
        <div className="visited-memory__flip-inner">
          <div
            ref={frontRef}
            className="visited-memory__face visited-memory__face--front"
            role="button"
            tabIndex={onStage && !flipped ? 0 : -1}
            inert={flipped ? true : undefined}
            aria-expanded={flipped}
            aria-label={`${caption}. Ver el recuerdo de la visita`}
            onClick={toggleFromPointer}
            onKeyDown={flipFromKey}
          >
            <span className="visited-memory__photo">
              {broken ? null : (
                <img
                  src={experienceCoverUrl(stop, 240)}
                  alt=""
                  draggable={false}
                  onError={onBroken}
                />
              )}
            </span>
            <span className="visited-memory__label">{caption}</span>
          </div>
          <div
            ref={backRef}
            className="visited-memory__face visited-memory__face--back"
            tabIndex={flipped ? 0 : -1}
            inert={flipped ? undefined : true}
            role="group"
            aria-label={`${caption}. Recuerdo de la visita`}
            onClick={toggleFromPointer}
            onKeyDown={flipFromKey}
          >
            <div className="visited-memory__back">
              <img
                className={`visited-memory__stamp${stamp ? "" : " is-fallback"}`}
                src={stamp || sobreVisitados}
                alt=""
                draggable={false}
                onError={() => setStampBroken(true)}
              />
              {place ? <p className="visited-memory__place">{place}</p> : null}
              {region ? <p className="visited-memory__region">{region}</p> : null}
              {visitedOn ? (
                <p className="visited-memory__when">
                  <span>Visitada</span>
                  {visitedOn}
                </p>
              ) : null}
              {review ? (
                <p className="visited-memory__rate">
                  <span>Mi calificación</span>
                  <span className="visited-memory__score">
                    <MemoryStars value={review.rating} />
                    <strong>{formatVisitRating(review.rating)}</strong>
                  </span>
                </p>
              ) : null}
              <Link
                className="visited-memory__open"
                to={`/explorar/${stop.id}`}
                tabIndex={flipped ? undefined : -1}
                onClick={(event) => event.stopPropagation()}
              >
                Ver experiencia →
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </article>
  );
}

export function VisitedMemories({
  stops,
  reviews,
  stamps,
}: {
  stops: VisitedJourneyStop[];
  reviews: MyVisitorReview[];
  stamps: Record<string, string>;
}) {
  const [origin, setOrigin] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const finePointer = useFinePointer();
  const maxOrigin = Math.max(0, stops.length - PAGE_SIZE);
  const safeOrigin = Math.min(origin, maxOrigin);
  const stageRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const hoverDir = useRef(0);
  const pointerDir = useRef<-1 | 1 | 0>(0);
  const drift = useRef(0);
  const catchUp = useRef(0);
  const release = useRef(false);
  const glideRaf = useRef(0);
  const glideClock = useRef(0);
  const originRef = useRef(safeOrigin);
  const maxOriginRef = useRef(maxOrigin);

  originRef.current = safeOrigin;
  maxOriginRef.current = maxOrigin;

  useEffect(() => {
    return () => {
      hoverDir.current = 0;
      pointerDir.current = 0;
      if (glideRaf.current) {
        window.cancelAnimationFrame(glideRaf.current);
        glideRaf.current = 0;
      }
    };
  }, []);

  useEffect(() => {
    hoverDir.current = 0;
    pointerDir.current = 0;
    if (glideRaf.current) {
      window.cancelAnimationFrame(glideRaf.current);
      glideRaf.current = 0;
    }
    drift.current = 0;
    catchUp.current = 0;
    release.current = false;
    glideClock.current = 0;
    trackRef.current?.style.setProperty("--drag", "0px");
    stageRef.current?.classList.remove("is-gliding");
    setOrigin(0);
    setFlippedId(null);
  }, [stops.length]);

  function paintDrift(px: number) {
    trackRef.current?.style.setProperty("--drag", `${px}px`);
  }

  function cancelGlideFrame() {
    if (glideRaf.current) {
      window.cancelAnimationFrame(glideRaf.current);
      glideRaf.current = 0;
    }
    glideClock.current = 0;
  }

  function cardStep() {
    const width = trackRef.current?.offsetWidth || stageRef.current?.clientWidth || 0;
    return (width * STEP) / 100;
  }

  function easeDriftToZero() {
    cancelGlideFrame();
    const from = drift.current;
    if (Math.abs(from) < 0.6) {
      drift.current = 0;
      paintDrift(0);
      stageRef.current?.classList.remove("is-gliding");
      if (pointerDir.current) {
        startGlide(pointerDir.current);
      }
      return;
    }
    stageRef.current?.classList.add("is-gliding");
    const started = performance.now();
    const tick = (now: number) => {
      if (hoverDir.current) {
        glideRaf.current = window.requestAnimationFrame(glideFrame);
        return;
      }
      const t = Math.min(1, (now - started) / MOVE_MS);
      const eased = 1 - (1 - t) ** 3;
      const value = from * (1 - eased);
      drift.current = value;
      paintDrift(value);
      if (t < 1) {
        glideRaf.current = window.requestAnimationFrame(tick);
        return;
      }
      drift.current = 0;
      paintDrift(0);
      glideRaf.current = 0;
      stageRef.current?.classList.remove("is-gliding");
      if (pointerDir.current) {
        startGlide(pointerDir.current);
      }
    };
    glideRaf.current = window.requestAnimationFrame(tick);
  }

  function stopGlide() {
    hoverDir.current = 0;
    cancelGlideFrame();
    if (catchUp.current) {
      release.current = true;
      return;
    }
    easeDriftToZero();
  }

  function glideFrame(now: number) {
    const dir = hoverDir.current;
    const stage = stageRef.current;
    if (!dir || !stage) {
      stopGlide();
      return;
    }
    if (catchUp.current) {
      glideRaf.current = window.requestAnimationFrame(glideFrame);
      return;
    }
    const next = originRef.current + dir;
    if (next < 0 || next > maxOriginRef.current) {
      stopGlide();
      return;
    }
    const step = cardStep();
    if (step <= 0) {
      stopGlide();
      return;
    }
    const previous = glideClock.current || now;
    const dt = Math.min(32, Math.max(8, now - previous));
    glideClock.current = now;
    drift.current += dir * -1 * (step / 1200) * dt;
    const crossed = (dir > 0 && drift.current <= -step) || (dir < 0 && drift.current >= step);
    if (crossed) {
      catchUp.current += dir * step;
      originRef.current = next;
      setOrigin(next);
    } else {
      paintDrift(drift.current);
    }
    glideRaf.current = window.requestAnimationFrame(glideFrame);
  }

  function startGlide(dir: -1 | 1) {
    if (prefersReducedMotion()) {
      return;
    }
    const next = originRef.current + dir;
    if (next < 0 || next > maxOriginRef.current || cardStep() <= 0) {
      return;
    }
    setFlippedId(null);
    hoverDir.current = dir;
    stageRef.current?.classList.add("is-gliding");
    if (!glideRaf.current) {
      glideClock.current = 0;
      glideRaf.current = window.requestAnimationFrame(glideFrame);
    }
  }

  function nudge(dir: -1 | 1) {
    hoverDir.current = 0;
    cancelGlideFrame();
    drift.current = 0;
    catchUp.current = 0;
    release.current = false;
    paintDrift(0);
    stageRef.current?.classList.remove("is-gliding");
    const currentPage = Math.floor(originRef.current / PAGE_SIZE);
    const next = Math.min(maxOriginRef.current, Math.max(0, (currentPage + dir) * PAGE_SIZE));
    if (next === originRef.current) {
      if (pointerDir.current) {
        startGlide(pointerDir.current);
      }
      return;
    }
    setFlippedId(null);
    originRef.current = next;
    setOrigin(next);
    if (pointerDir.current) {
      startGlide(pointerDir.current);
    }
  }

  useLayoutEffect(() => {
    if (catchUp.current) {
      drift.current += catchUp.current;
      catchUp.current = 0;
      paintDrift(drift.current);
    }
    if (release.current) {
      release.current = false;
      easeDriftToZero();
    }
  }, [safeOrigin]);

  if (stops.length === 0) {
    return (
      <div className="visited-strip is-waiting">
        <aside className="visited-memories is-strip" aria-label="Recuerdos de viaje">
          <article className="visited-memory is-waiting">
            <span className="visited-memory__photo">
              <img src={mapaIcon} alt="" draggable={false} />
            </span>
            <span className="visited-memory__waiting">
              <strong>Este espacio aún está esperando tus recuerdos</strong>
              <span>Cuando marques una experiencia como visitada, aparecerá aquí.</span>
            </span>
          </article>
        </aside>
      </div>
    );
  }

  const showNav = stops.length > PAGE_SIZE;
  const slots = slotsFor(stops.length);
  const path = route(slots);
  const firstVisible = safeOrigin;
  const lastVisible = Math.min(stops.length - 1, safeOrigin + PAGE_SIZE - 1);

  return (
    <div className={`visited-strip${showNav ? " has-nav" : ""}`}>
      {showNav ? (
        <button
          type="button"
          className="visited-memories__nav visited-memories__nav--prev"
          aria-label="Experiencias anteriores"
          disabled={safeOrigin === 0}
          onClick={() => nudge(-1)}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") {
              return;
            }
            pointerDir.current = -1;
            startGlide(-1);
          }}
          onPointerLeave={() => {
            pointerDir.current = 0;
            stopGlide();
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
      <aside ref={stageRef} className="visited-memories is-strip" aria-label="Recuerdos de viaje">
        <div className="visited-memories__viewport">
        <div
          ref={trackRef}
          className="visited-memories__track"
          style={{ "--origin": String(safeOrigin), "--step": `-${STEP}%` } as CSSProperties}
        >
          <div className="visited-memories__frame">
            {path.lines.length > 0 ? (
              <svg
                className="visited-memories__paths"
                viewBox={`0 0 ${path.width} 100`}
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{ width: `${path.width}%` }}
              >
                {path.lines.map((line) => (
                  <path key={line} d={line} />
                ))}
              </svg>
            ) : null}
            {stops.map((stop, index) => {
              const slot = slots[index];
              const onStage = index >= firstVisible && index <= lastVisible;
              const near = index >= firstVisible - 1 && index <= lastVisible + 1;
              return (
                <MemoryCard
                  key={stop.id}
                  stop={stop}
                  reviews={reviews}
                  stampSrc={stamps[stop.id] ?? ""}
                  slot={slot}
                  onStage={onStage}
                  near={near}
                  broken={Boolean(broken[stop.id])}
                  flipped={flippedId === stop.id}
                  finePointer={finePointer}
                  onOpen={() => setFlippedId(stop.id)}
                  onClose={() => setFlippedId((current) => (current === stop.id ? null : current))}
                  onToggle={() => setFlippedId((current) => (current === stop.id ? null : stop.id))}
                  onBroken={() => setBroken((current) => ({ ...current, [stop.id]: true }))}
                />
              );
            })}
          </div>
        </div>
        </div>
      </aside>
      {showNav ? (
        <button
          type="button"
          className="visited-memories__nav visited-memories__nav--next"
          aria-label="Experiencias siguientes"
          disabled={safeOrigin >= maxOrigin}
          onClick={() => nudge(1)}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") {
              return;
            }
            pointerDir.current = 1;
            startGlide(1);
          }}
          onPointerLeave={() => {
            pointerDir.current = 0;
            stopGlide();
          }}
        >
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
