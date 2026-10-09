import type { CSSProperties } from "react";
import paloma from "../../assets/paloma 2.png";
import { useInViewReveal } from "../../hooks/useInViewReveal";

const SLOTS = 2;

type Point = [number, number];

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function laceAlong(points: Point[]) {
  let path = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length;
    let ny = dx / length;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const bx = (x1 + x2) / 2 + nx * 5.2;
    const by = (y1 + y2) / 2 + ny * 5.2;
    path += `${index === 0 ? "M" : "L"}${x1.toFixed(1)} ${y1.toFixed(1)} Q${bx.toFixed(1)} ${by.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  return path;
}

const FLAP_LEFT: [Point, Point, Point, Point] = [[48, 208], [150, 236], [248, 304], [320, 322]];
const FLAP_RIGHT: [Point, Point, Point, Point] = [[320, 322], [392, 304], [490, 236], [592, 208]];

function samples(curve: [Point, Point, Point, Point], count: number) {
  return Array.from({ length: count + 1 }, (_, index) => cubic(curve[0], curve[1], curve[2], curve[3], index / count));
}

const FLAP_EDGE = "M48 208 C150 236 248 304 320 322 C392 304 490 236 592 208";
const FLAP_BODY = `${FLAP_EDGE} V404 C592 452 472 466 320 466 C168 466 48 452 48 404 Z`;
const LACE = laceAlong([...samples(FLAP_LEFT, 11), ...samples(FLAP_RIGHT, 11).slice(1)]);

export function JourneyKeepsake({ photos, onOpen }: { photos: string[]; onOpen: () => void }) {
  const { ref, inView } = useInViewReveal<HTMLDivElement>({ enterRatio: 0.16, leaveRatio: 0.02 });
  const shots = Array.from({ length: SLOTS }, (_, index) => photos[index] ?? "");

  return (
    <div ref={ref} className={`caminos-keep explorer-reveal-scope${inView ? " is-revealed" : ""}`}>
      <header className="caminos-keep__intro">
        <h2 className="caminos-keep__title explorer-reveal explorer-reveal--title">Guarda tus recuerdos</h2>
        <p className="caminos-keep__text explorer-reveal explorer-reveal--soft" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
          Crea tu bitácora con fotos, notas y momentos especiales.
        </p>
      </header>

      <div className="caminos-keep__scene">
        <svg className="caminos-keep__sprig caminos-keep__sprig--left" viewBox="0 0 80 64" aria-hidden="true">
          <path d="M6 48c14-4 24-16 28-30" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="34" cy="16" r="2.2" fill="currentColor" />
          <circle cx="44" cy="22" r="1.6" fill="currentColor" />
          <circle cx="28" cy="26" r="1.4" fill="currentColor" />
          <circle cx="50" cy="30" r="1.3" fill="currentColor" />
          <circle cx="22" cy="36" r="1.2" fill="currentColor" />
        </svg>

        <img className="caminos-keep__bird" src={paloma} alt="" aria-hidden="true" />
        <svg className="caminos-keep__sprig caminos-keep__sprig--right" viewBox="0 0 70 80" aria-hidden="true">
          <path d="M12 8c8 16 10 34 6 58" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <path d="M16 28c12-2 20 4 24 12M18 44c10 0 16 6 18 14" fill="none" stroke="currentColor" strokeWidth="1.05" />
        </svg>

        <div className="caminos-keep__envelope">
          <svg className="caminos-keep__back" viewBox="0 0 640 480" aria-hidden="true">
            <defs>
              <linearGradient id="caminos-env-back" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#d5decc" />
                <stop offset="1" stopColor="#b7c6ae" />
              </linearGradient>
            </defs>
            <path d="M78 156h484c16 0 28 12 28 28v248c0 22-28 36-270 36S50 454 50 432V184c0-16 12-28 28-28z" fill="url(#caminos-env-back)" />
          </svg>

          {shots.map((src, index) => (
            <span key={index} className={`caminos-keep__shot is-${index + 1}`} aria-hidden="true">
              <span className="caminos-keep__polaroid">
                {src ? <img src={src} alt="" loading="lazy" /> : <span className="caminos-keep__blank" />}
              </span>
            </span>
          ))}

          <svg className="caminos-keep__face" viewBox="0 0 640 480" aria-hidden="true">
            <defs>
              <linearGradient id="caminos-env-face" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#b7c4ae" />
                <stop offset="0.45" stopColor="#a3b39a" />
                <stop offset="1" stopColor="#93a48a" />
              </linearGradient>
              <filter id="caminos-env-grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
                <feColorMatrix type="saturate" values="0" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.05" />
                </feComponentTransfer>
              </filter>
              <clipPath id="caminos-env-clip">
                <path d={FLAP_BODY} />
              </clipPath>
            </defs>
            <path d={FLAP_BODY} fill="url(#caminos-env-face)" />
            <path d="M48 216 122 308 48 404z" fill="#7d9074" opacity="0.14" />
            <path d="M592 216 518 308 592 404z" fill="#748868" opacity="0.1" />
            <path d={FLAP_EDGE} fill="none" stroke="#e7eee2" strokeWidth="1.6" opacity="0.9" />
            <path d={LACE} fill="none" stroke="#f7f4ee" strokeWidth="1.15" opacity="0.9" />
            <g clipPath="url(#caminos-env-clip)" filter="url(#caminos-env-grain)">
              <rect width="640" height="480" />
            </g>
          </svg>

          <svg className="caminos-keep__seal" viewBox="0 0 88 88" aria-hidden="true">
            <circle cx="44" cy="44" r="40" fill="#f3efe6" stroke="#8d9b86" strokeWidth="1.1" />
            <circle cx="44" cy="44" r="33" fill="none" stroke="#8d9b86" strokeWidth="0.6" />
            <path d="M44 30c-6 6-8 12-8 16 4-1 7-4 8-8 1 4 4 7 8 8 0-4-2-10-8-16z" fill="none" stroke="#6d7c66" strokeWidth="1.1" />
            <path id="caminos-seal-ring" d="M14 48a30 30 0 0 1 60 0" fill="none" />
            <text fill="#5f6e59" fontFamily="Poppins, Nunito, sans-serif" fontSize="6.4" letterSpacing="1.4">
              <textPath href="#caminos-seal-ring" startOffset="8%">ENTRE CAMINOS</textPath>
            </text>
          </svg>

          <button type="button" className="tourist-hero__cta caminos-keep__cta" onClick={onOpen}>
            Ir a mi bitácora
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
