import { useEffect, useRef, useState } from "react";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import "../../styles/planner.css";

const ICONS = [
  { src: "/planner/carga-mochila.png", className: "is-mochila" },
  { src: "/planner/carga-mapa.png", className: "is-mapa" },
  { src: "/planner/carga-camara.png", className: "is-camara" },
  { src: "/planner/carga-brujula.png", className: "is-brujula" },
] as const;

type PlannerLoadingProps = {
  error: string;
  empty: boolean;
  detail?: boolean;
  onRetry: () => void;
  onBack: () => void;
  phase?: "working" | "ready";
  onFinished?: () => void;
  kind?: "generate" | "open";
};

export function PlannerLoading({
  error,
  empty,
  detail = false,
  onRetry,
  onBack,
  phase = "working",
  onFinished,
  kind = "generate",
}: PlannerLoadingProps) {
  if (error) {
    return (
      <div className="favorite-save-modal plan-failure" role="dialog" aria-modal="true" aria-labelledby="plan-failure-title">
        <div className="favorite-save-modal__backdrop" />
        <div className="favorite-save-modal__panel">
          <AuthKeyIcon />
          <header className="favorite-save-modal__head">
            <h2 id="plan-failure-title" className="favorite-save-modal__title">
              {empty ? "No encontramos un camino con estas preferencias" : "No pudimos trazar tu camino"}
            </h2>
          </header>
          <p>
            {empty || detail
              ? error
              : "Esta vez no logramos crear tu itinerario. Puedes intentarlo de nuevo o ajustar tus preferencias."}
          </p>
          <div className="favorite-save-modal__actions">
            {empty ? null : (
              <button type="button" className="favorite-save-modal__primary" onClick={onRetry}>Reintentar</button>
            )}
            <button type="button" className={empty ? "favorite-save-modal__primary" : "favorite-save-modal__ghost"} onClick={onBack}>
              Editar preferencias
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PlannerLoadingCard phase={phase} onFinished={onFinished} kind={kind} />;
}

function PlannerLoadingCard({
  phase,
  onFinished,
  kind,
}: {
  phase: "working" | "ready";
  onFinished?: () => void;
  kind: "generate" | "open";
}) {
  const [progress, setProgress] = useState(0);
  const [dot, setDot] = useState(0);
  const progressRef = useRef(0);
  const finishedRef = useRef(false);
  const doneRef = useRef(onFinished);
  doneRef.current = onFinished;
  const creating = kind === "generate";

  useEffect(() => {
    if (phase !== "working") return;
    finishedRef.current = false;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - started) / 1000;
      const value = 90 * (1 - Math.exp(-elapsed / 6.5));
      progressRef.current = value;
      setProgress(value);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") return;
    const from = progressRef.current;
    const started = performance.now();
    let frame = 0;
    let timer = 0;
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / 560);
      const eased = 1 - (1 - ratio) ** 3;
      const value = from + (100 - from) * eased;
      progressRef.current = value;
      setProgress(value);
      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      timer = window.setTimeout(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        doneRef.current?.();
      }, 280);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") return;
    const timer = window.setInterval(() => setDot((current) => (current + 1) % 3), 1500);
    return () => window.clearInterval(timer);
  }, [phase]);

  const complete = progress >= 99.5;
  const coasting = phase === "working" && progress > 78;

  return (
    <section className="planner-loading" role="status" aria-live="polite" aria-busy={phase === "working"}>
      <article className="planner-loading__card">
        <div className="planner-loading__icons" aria-hidden="true">
          {ICONS.map((icon) => (
            <img key={icon.src} className={icon.className} src={icon.src} alt="" draggable={false} />
          ))}
        </div>
        <div className="planner-loading__copy">
          <p className="planner-loading__kicker">{creating ? "Tu plan está en camino" : "Tu camino guardado"}</p>
          <h1>{creating ? <>Estamos creando<br />tu experiencia</> : "Estamos abriendo tu plan"}</h1>
          <p className="planner-loading__lead">
            {creating
              ? "Estamos explorando experiencias y organizando un camino especial según tus preferencias."
              : "Recuperamos el itinerario que guardaste."}
          </p>
          <div className={`planner-loading__track${coasting ? " is-coasting" : ""}`} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="planner-loading__dots" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <i key={index} className={complete || index === dot ? "is-on" : ""} />
            ))}
          </div>
          <p className="planner-loading__note">{creating ? "Estamos trazando tu camino..." : "Un momento..."}</p>
        </div>
      </article>
    </section>
  );
}
