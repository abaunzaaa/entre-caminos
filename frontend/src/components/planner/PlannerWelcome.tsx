import { Plane } from "lucide-react";

function SoftCloud({ id, className }: { id: string; className: string }) {
  return (
    <svg className={className} viewBox="0 0 480 280" aria-hidden="true">
      <defs>
        <filter id={`${id}-edge`} x="-22%" y="-22%" width="144%" height="144%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
        <filter id={`${id}-base`} x="-45%" y="-70%" width="190%" height="240%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#eef3f8" />
          <stop offset="100%" stopColor="#d4e1ec" />
        </linearGradient>
      </defs>
      <ellipse cx="240" cy="222" rx="146" ry="20" fill="#c5d6e4" opacity="0.72" filter={`url(#${id}-base)`} />
      <g fill={`url(#${id}-body)`} filter={`url(#${id}-edge)`}>
        <ellipse cx="164" cy="146" rx="70" ry="48" />
        <ellipse cx="242" cy="118" rx="86" ry="60" />
        <ellipse cx="318" cy="148" rx="66" ry="46" />
        <ellipse cx="244" cy="164" rx="116" ry="36" />
        <ellipse cx="226" cy="112" rx="36" ry="16" fill="#ffffff" />
      </g>
    </svg>
  );
}

export function PlannerWelcome({ onDiscover }: { onDiscover: () => void }) {
  return (
    <section className="planner-hero">
      <SoftCloud id="planner-cloud-left" className="planner-hero__mist planner-hero__mist--left" />
      <SoftCloud id="planner-cloud-right" className="planner-hero__mist planner-hero__mist--right" />

      <span className="planner-hero__mark" aria-hidden="true">
        <Plane size={16} strokeWidth={1.8} />
      </span>

      <div className="planner-hero__canvas">
        <div className="planner-hero__stage" aria-hidden="true">
          <img className="planner-hero__map" src="/planner/mapa-decorativo.png" alt="" draggable={false} />
          <SoftCloud id="planner-cloud-a" className="planner-hero__cloud planner-hero__cloud--a" />
          <SoftCloud id="planner-cloud-b" className="planner-hero__cloud planner-hero__cloud--b" />

          <span className="planner-hero__float planner-hero__float--binoculars">
            <span className="planner-hero__card planner-hero__card--binoculars">
              <img src="/planner/binoculares.png" alt="" draggable={false} />
            </span>
          </span>
          <span className="planner-hero__float planner-hero__float--backpack">
            <span className="planner-hero__card planner-hero__card--backpack">
              <img src="/planner/mochila.png" alt="" draggable={false} />
            </span>
          </span>
          <span className="planner-hero__float planner-hero__float--camera">
            <span className="planner-hero__card planner-hero__card--camera">
              <img src="/planner/camara.png" alt="" draggable={false} />
            </span>
          </span>
          <span className="planner-hero__float planner-hero__float--coffee">
            <span className="planner-hero__card planner-hero__card--coffee">
              <img src="/planner/taza.png" alt="" draggable={false} />
            </span>
          </span>

          <em className="planner-hero__tag planner-hero__tag--descubre">Descubre</em>
          <em className="planner-hero__tag planner-hero__tag--explora">Explora</em>
          <em className="planner-hero__tag planner-hero__tag--vive">Vive</em>
        </div>
      </div>

      <p className="planner-hero__kicker">Te recomendamos el mejor plan para ti.</p>
      <h1 className="planner-hero__title">
        Tú lo imaginas. <span>Nosotros lo planeamos.</span>
      </h1>
      <button type="button" className="planner-hero__cta" onClick={onDiscover}>
        <Plane size={16} strokeWidth={1.8} />
        Descubrir
      </button>
    </section>
  );
}
