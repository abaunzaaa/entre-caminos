import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ExperienceStampCard } from "../../services/catalog.service";
import { stampUrl } from "../../utils/media";

const FLIP_MS = 600;
const MOVE_MS = 560;

type ProfileStampAlbumProps = {
  stamps: ExperienceStampCard[];
  visitedIds: readonly string[];
  visitsKnown: boolean;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

function middleIndex(count: number) {
  if (count <= 1) {
    return 0;
  }
  return Math.floor((count - 1) / 2);
}

function useStampSpread() {
  const [spread, setSpread] = useState(2);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 640px)");
    const tablet = window.matchMedia("(max-width: 980px)");
    const apply = () => setSpread(mobile.matches || tablet.matches ? 1 : 2);
    apply();
    mobile.addEventListener("change", apply);
    tablet.addEventListener("change", apply);
    return () => {
      mobile.removeEventListener("change", apply);
      tablet.removeEventListener("change", apply);
    };
  }, []);

  return spread;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ProfileStampAlbum({
  stamps,
  visitedIds,
  visitsKnown,
  loading,
  error,
  onRetry,
}: ProfileStampAlbumProps) {
  const collected = useMemo(() => {
    if (!visitsKnown) {
      return [];
    }
    const byId = new Map(stamps.map((stamp) => [stamp.id, stamp]));
    const seen = new Set<string>();
    const items: ExperienceStampCard[] = [];
    for (const id of visitedIds) {
      if (seen.has(id)) {
        continue;
      }
      const stamp = byId.get(id);
      if (!stamp || !stampUrl(stamp.stampImageUrl)) {
        continue;
      }
      seen.add(id);
      items.push(stamp);
    }
    return items;
  }, [stamps, visitedIds, visitsKnown]);

  const idsKey = collected.map((stamp) => stamp.id).join("\n");
  const openingId = collected[middleIndex(collected.length)]?.id ?? null;
  const [nav, setNav] = useState({ key: idsKey, id: openingId });
  const [flipped, setFlipped] = useState(false);
  const spread = useStampSpread();
  const stageRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const timer = useRef<number | null>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const wheelLock = useRef(0);
  const focusTarget = useRef<"front" | "back" | null>(null);
  const indexRef = useRef(0);
  const hoverDir = useRef(0);
  const drift = useRef(0);
  const glideRaf = useRef(0);
  const stepRef = useRef<HTMLSpanElement>(null);
  const flippedRef = useRef(false);
  const countRef = useRef(0);
  const catchUp = useRef(0);
  const pointerDir = useRef<-1 | 1 | 0>(0);
  const glideClock = useRef(0);
  const release = useRef(false);

  if (nav.key !== idsKey) {
    setNav({ key: idsKey, id: openingId });
    setFlipped(false);
  }

  const activeId = nav.key === idsKey ? nav.id : openingId;
  const found = collected.findIndex((stamp) => stamp.id === activeId);
  const index = found >= 0 ? found : middleIndex(collected.length);
  indexRef.current = index;
  flippedRef.current = flipped;
  countRef.current = collected.length;

  useEffect(() => {
    return () => {
      if (timer.current != null) {
        window.clearTimeout(timer.current);
      }
      if (glideRaf.current) {
        window.cancelAnimationFrame(glideRaf.current);
      }
    };
  }, []);

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
  }, [activeId]);

  function stepSize() {
    return stepRef.current?.offsetWidth || 160;
  }

  function paintDrift(px: number) {
    stageRef.current?.style.setProperty("--drag", `${px}px`);
  }

  function cancelGlideFrame() {
    if (glideRaf.current) {
      window.cancelAnimationFrame(glideRaf.current);
      glideRaf.current = 0;
    }
    glideClock.current = 0;
  }

  function haltDrift() {
    pointerDir.current = 0;
    hoverDir.current = 0;
    cancelGlideFrame();
    drift.current = 0;
    catchUp.current = 0;
    release.current = false;
    paintDrift(0);
    stageRef.current?.classList.remove("is-gliding");
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
    if (!dir || !stage || flippedRef.current || busy.current) {
      stopGlide();
      return;
    }
    if (catchUp.current) {
      glideRaf.current = window.requestAnimationFrame(glideFrame);
      return;
    }
    const next = indexRef.current + dir;
    if (next < 0 || next >= countRef.current) {
      stopGlide();
      return;
    }
    const step = stepSize();
    const previous = glideClock.current || now;
    const dt = Math.min(32, Math.max(8, now - previous));
    glideClock.current = now;
    drift.current += dir * -1 * (step / 1200) * dt;
    const stamp = collected[next];
    const crossed = Boolean(stamp) && ((dir > 0 && drift.current <= -step) || (dir < 0 && drift.current >= step));
    if (crossed && stamp) {
      catchUp.current += dir * step;
      indexRef.current = next;
      setNav((current) => ({ key: current.key, id: stamp.id }));
    } else {
      paintDrift(drift.current);
    }
    glideRaf.current = window.requestAnimationFrame(glideFrame);
  }

  function startGlide(dir: -1 | 1) {
    if (prefersReducedMotion() || flippedRef.current || busy.current) {
      return;
    }
    const next = indexRef.current + dir;
    if (next < 0 || next >= countRef.current) {
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
    if (prefersReducedMotion() || flippedRef.current || busy.current) {
      drift.current = 0;
      catchUp.current = 0;
      paintDrift(0);
      stageRef.current?.classList.remove("is-gliding");
      goTo(indexRef.current + dir);
      return;
    }
    if (!catchUp.current) {
      const next = indexRef.current + dir;
      if (next < 0 || next >= countRef.current) {
        easeDriftToZero();
        return;
      }
      catchUp.current = dir * stepSize();
      release.current = true;
      stageRef.current?.classList.add("is-gliding");
      goTo(next);
      return;
    }
    release.current = true;
  }

  function goTo(next: number) {
    if (busy.current || next < 0 || next >= collected.length || next === indexRef.current) {
      return;
    }
    const stamp = collected[next];
    if (!stamp) {
      return;
    }
    const apply = () => {
      indexRef.current = next;
      setFlipped(false);
      setNav((current) => ({ key: current.key, id: stamp.id }));
      busy.current = false;
      timer.current = null;
      focusTarget.current = "front";
    };
    if (flipped) {
      busy.current = true;
      setFlipped(false);
      timer.current = window.setTimeout(apply, prefersReducedMotion() ? 0 : FLIP_MS);
      return;
    }
    apply();
  }

  function toggleFlip() {
    if (busy.current || collected.length === 0) {
      return;
    }
    setFlipped((current) => {
      focusTarget.current = current ? "front" : "back";
      return !current;
    });
  }

  useEffect(() => {
    const target = focusTarget.current;
    if (!target || !stageRef.current) {
      return;
    }
    focusTarget.current = null;
    const selector =
      target === "back"
        ? ".profile-stamps__slot[data-center='true'] .profile-stamps__back a"
        : ".profile-stamps__slot[data-center='true'] .profile-stamps__front";
    stageRef.current.querySelector<HTMLElement>(selector)?.focus();
  }, [flipped, activeId]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") {
      return;
    }
    event.preventDefault();
    haltDrift();
    if (key === "ArrowRight") {
      goTo(indexRef.current + 1);
    } else if (key === "ArrowLeft") {
      goTo(indexRef.current - 1);
    } else if (key === "Home") {
      goTo(0);
    } else {
      goTo(collected.length - 1);
    }
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaX) < 16 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
      return;
    }
    event.preventDefault();
    const now = Date.now();
    if (now - wheelLock.current < MOVE_MS) {
      return;
    }
    wheelLock.current = now;
    haltDrift();
    goTo(indexRef.current + (event.deltaX > 0 ? 1 : -1));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    haltDrift();
    drag.current = { x: event.clientX, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) {
      return;
    }
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) > 8) {
      drag.current.moved = true;
      stageRef.current?.style.setProperty("--drag", `${dx}px`);
    }
  }

  function endDrag(clientX: number) {
    const current = drag.current;
    drag.current = null;
    stageRef.current?.style.setProperty("--drag", "0px");
    if (!current?.moved) {
      return;
    }
    suppressClick.current = true;
    const dx = clientX - current.x;
    if (Math.abs(dx) > 52) {
      goTo(indexRef.current + (dx < 0 ? 1 : -1));
    }
  }

  if (loading) {
    return <p className="profile-stamps__status">Cargando estampitas…</p>;
  }

  if (error || !visitsKnown) {
    return (
      <div className="profile-stamps__status">
        <p>{error || "No pudimos saber cuáles experiencias visitaste."}</p>
        <button type="button" className="profile-stamps__retry" onClick={onRetry}>
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (collected.length === 0) {
    return (
      <div className="profile-stamps profile-stamps--empty">
        <h2 className="profile-stamps__title">Tu colección está por comenzar</h2>
        <p className="profile-stamps__subtitle">Cuando marques una experiencia como visitada, su estampita aparecerá aquí.</p>
        <Link className="tourist-hero__cta" to="/explorar">
          Ver experiencias
        </Link>
      </div>
    );
  }

  const many = collected.length > 1;

  return (
    <section className="profile-stamps" aria-labelledby="profile-stamps-title">
      <header className="profile-stamps__intro">
        <h2 id="profile-stamps-title" className="profile-stamps__title">
          Mis estampitas
        </h2>
        <p className="profile-stamps__subtitle">Cada experiencia vivida deja un recuerdo</p>
      </header>

      <div className="profile-stamps__rail">
        {many ? (
          <button
            type="button"
            className="profile-stamps__arrow is-prev"
            aria-label="Estampita anterior"
            disabled={index === 0}
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
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}

        <div
          ref={stageRef}
          className="profile-stamps__stage"
          role="group"
          aria-roledescription="carrusel"
          aria-label="Estampitas de tus experiencias visitadas"
          onKeyDown={onKeyDown}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endDrag(event.clientX)}
          onPointerCancel={() => endDrag(drag.current?.x ?? 0)}
          onClickCapture={(event) => {
            if (!suppressClick.current) {
              return;
            }
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span ref={stepRef} className="profile-stamps__step" aria-hidden="true" />
          {collected.map((stamp, stampIndex) => {
            const offset = stampIndex - index;
            const abs = Math.abs(offset);
            const center = offset === 0;
            const scale = center ? 1 : abs === 1 ? 0.82 : 0.7;
            const hidden = abs > spread;
            const src = stampUrl(stamp.stampImageUrl);
            return (
              <div
                key={stamp.id}
                className="profile-stamps__slot"
                data-center={center ? "true" : "false"}
                style={{
                  zIndex: 20 - abs,
                  opacity: hidden ? 0 : center ? 1 : abs === 1 ? 0.96 : 0.78,
                  pointerEvents: hidden ? "none" : undefined,
                  ["--offset" as string]: String(offset),
                  ["--scale" as string]: String(scale),
                }}
                aria-hidden={hidden || undefined}
              >
                <div className={`profile-stamps__flip${center && flipped ? " is-flipped" : ""}`}>
                  <button
                    type="button"
                    className="profile-stamps__front"
                    tabIndex={center && !flipped ? 0 : -1}
                    aria-current={center ? "true" : undefined}
                    aria-expanded={center ? flipped : undefined}
                    aria-label={
                      center
                        ? `${stamp.title}. Estampita obtenida. ${flipped ? "Volver a la ilustración" : "Ver el recuerdo"}`
                        : `${stamp.title}. Llevar al centro`
                    }
                    onClick={() => {
                      if (center) {
                        toggleFlip();
                        return;
                      }
                      goTo(stampIndex);
                    }}
                  >
                    <img src={src} alt="" width={1024} height={1024} draggable={false} />
                  </button>
                  <div
                    className="profile-stamps__back"
                    inert={center && flipped ? undefined : true}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) {
                        return;
                      }
                      setFlipped(false);
                      focusTarget.current = "front";
                    }}
                  >
                    <div className="profile-stamps__back-sheet" style={{ ["--stamp-mask" as string]: `url("${src}")` }}>
                      <span className="profile-stamps__back-ring is-outer" />
                      <span className="profile-stamps__back-ring is-gap" />
                      <span className="profile-stamps__back-ring is-inner" />
                      <span className="profile-stamps__back-face">
                        <h3>{stamp.title}</h3>
                        <Link
                          className="profile-stamps__open"
                          to={`/explorar/${stamp.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Ver experiencia
                        </Link>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {many ? (
          <button
            type="button"
            className="profile-stamps__arrow is-next"
            aria-label="Estampita siguiente"
            disabled={index === collected.length - 1}
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
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p className="profile-stamps__count" aria-live="polite">
        {index + 1} de {collected.length}
      </p>
    </section>
  );
}
