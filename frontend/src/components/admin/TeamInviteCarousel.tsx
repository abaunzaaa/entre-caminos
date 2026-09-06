import { useEffect, useState } from "react";
import carrusel1 from "../../assets/carrusel1.jpg";
import carrusel2 from "../../assets/carrusel2.jpg";
import carrusel3 from "../../assets/carrusel3.jpg";

const DEFAULT_SLIDES = [carrusel1, carrusel2, carrusel3] as const;
const INTERVAL_MS = 5000;

export function TeamInviteCarousel({
  slides = DEFAULT_SLIDES,
  label = "Galería Entre Caminos",
  className,
}: {
  slides?: readonly string[];
  label?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const signature = slides.join("|");

  useEffect(() => {
    setIndex(0);
  }, [signature]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches || paused || total < 2) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % total);
    }, INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [paused, index, total]);

  if (!total) {
    return null;
  }

  return (
    <aside
      className={`dash-team-gallery${className ? ` ${className}` : ""}`}
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="dash-team-gallery__frame">
        {slides.map((src, slideIndex) => (
          <img
            key={`${src}-${slideIndex}`}
            src={src}
            alt=""
            className={`dash-team-gallery__img${slideIndex === index ? " is-active" : ""}`}
            aria-hidden={slideIndex !== index}
          />
        ))}
        {total > 1 ? (
        <div className="dash-team-gallery__dots" role="tablist" aria-label="Posición de la galería">
          {slides.map((_, slideIndex) => (
            <button
              key={slideIndex}
              type="button"
              role="tab"
              className={`dash-team-gallery__dot${slideIndex === index ? " is-active" : ""}`}
              aria-label={`Imagen ${slideIndex + 1}`}
              aria-selected={slideIndex === index}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
        ) : null}
      </div>
    </aside>
  );
}
