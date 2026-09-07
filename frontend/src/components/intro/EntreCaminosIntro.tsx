import { useEffect, useRef, useState } from "react";
import keyIcon from "../../assets/key-icon-green.png";
import "../../styles/entre-caminos-intro.css";

const FULL_DURATION_MS = 2400;
const REDUCED_DURATION_MS = 700;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EntreCaminosIntro({
  duration = FULL_DURATION_MS,
  onFinish,
}: {
  duration?: number;
  onFinish?: () => void;
}) {
  const [reduced] = useState(prefersReducedMotion);
  const playDuration = reduced ? Math.min(duration, REDUCED_DURATION_MS) : duration;
  const [visible, setVisible] = useState(true);
  const finished = useRef(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    html.classList.add("ec-intro-lock");
    body.classList.add("ec-intro-lock");

    return () => {
      html.classList.remove("ec-intro-lock");
      body.classList.remove("ec-intro-lock");
    };
  }, [visible]);

  useEffect(() => {
    const finish = () => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      setVisible(false);
      onFinish?.();
    };

    const timer = window.setTimeout(finish, playDuration + 80);
    return () => window.clearTimeout(timer);
  }, [playDuration, onFinish]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={reduced ? "ec-intro is-reduced" : "ec-intro"}
      role="status"
      aria-live="polite"
      aria-label="Cargando Entre Caminos"
      onAnimationEnd={(event) => {
        if (finished.current) {
          return;
        }
        const name = event.animationName;
        if (name !== "ec-intro-open-right" && name !== "ec-intro-fade-overlay") {
          return;
        }
        finished.current = true;
        setVisible(false);
        onFinish?.();
      }}
    >
      <div className="ec-intro__doors" aria-hidden="true">
        <div className="ec-intro__panel ec-intro__panel--left" />
        <div className="ec-intro__panel ec-intro__panel--right" />
      </div>
      <div className="ec-intro__key-container">
        <div className="ec-intro__glow" aria-hidden="true" />
        <img className="ec-intro__key" src={keyIcon} alt="" />
      </div>
    </div>
  );
}
