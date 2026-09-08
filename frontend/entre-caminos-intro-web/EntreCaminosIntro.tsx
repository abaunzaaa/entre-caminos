import { useEffect, useState } from "react";
import "./entre-caminos-intro.css";
import keyIcon from "./key-icon-green.png";

type EntreCaminosIntroProps = {
  duration?: number;
  onFinish?: () => void;
};

export default function EntreCaminosIntro({
  duration = 2600,
  onFinish,
}: EntreCaminosIntroProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onFinish]);

  if (!visible) return null;

  return (
    <div
      className="ec-intro"
      style={{ "--ec-intro-duration": `${duration}ms` } as React.CSSProperties}
      role="status"
      aria-label="Cargando Entre Caminos"
    >
      <div className="ec-intro__glow" aria-hidden="true" />
      <img
        className="ec-intro__key"
        src={keyIcon}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
