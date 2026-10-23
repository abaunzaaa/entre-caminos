import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import mapaIcon from "../../assets/mapa-icon.png";
import { experienceCoverUrl } from "../explorer/explorer-media";
import type { VisitedJourneyStop } from "../../services/visits.service";
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

export function VisitedMemories({ stops }: { stops: VisitedJourneyStop[] }) {
  const [origin, setOrigin] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
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
              const caption = memoryCaption(stop);
              const place = stopPlaceName(stop);
              return (
                <Link
                  key={stop.id}
                  className="visited-memory"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%`, "--tilt": `${slot.tilt}deg` } as CSSProperties}
                  to={`/explorar/${stop.id}`}
                  tabIndex={onStage ? undefined : -1}
                  inert={near ? undefined : true}
                  aria-hidden={onStage ? undefined : true}
                  aria-label={place && place !== stop.title ? `${stop.title}, ${place}` : stop.title}
                >
                  <span className="visited-memory__photo">
                    {broken[stop.id] ? null : (
                      <img
                        src={experienceCoverUrl(stop, 240)}
                        alt=""
                        draggable={false}
                        onError={() => setBroken((current) => ({ ...current, [stop.id]: true }))}
                      />
                    )}
                  </span>
                  <span className="visited-memory__label">{caption}</span>
                </Link>
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
