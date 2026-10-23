import { Plane } from "lucide-react";

function Face({
  hair,
  skin,
  band,
  glasses,
  beard,
}: {
  hair: string;
  skin: string;
  band?: string;
  glasses?: boolean;
  beard?: boolean;
}) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="46" r="24" fill={skin} />
      <path d="M14 42c1-22 12-34 26-34 16 0 26 12 26 30 0 4-8-6-26-6S16 44 14 42z" fill={hair} />
      <path d="M18 58c4 12 40 12 44 0-6 10-38 10-44 0z" fill={hair} />
      {band ? <path d="M18 36c8-8 36-8 44 0-2 5-8 3-22 3S20 41 18 36z" fill={band} /> : null}
      {beard ? <path d="M24 54c4 14 28 14 32 0-6 8-26 8-32 0z" fill={hair} /> : null}
      <ellipse cx="33" cy="48" rx="2.2" ry="2.6" fill="#2b241f" />
      <ellipse cx="47" cy="48" rx="2.2" ry="2.6" fill="#2b241f" />
      <path d="M35 57c3 2.4 7 2.4 10 0" fill="none" stroke="#d4897e" strokeWidth="1.5" strokeLinecap="round" />
      {glasses ? (
        <g fill="none" stroke="#24282c" strokeWidth="1.7">
          <rect x="24" y="43" width="14" height="10" rx="5" />
          <rect x="42" y="43" width="14" height="10" rx="5" />
          <path d="M38 48h4M24 47h-4M56 47h4" />
        </g>
      ) : null}
    </svg>
  );
}

export function PlannerWelcome({ onDiscover }: { onDiscover: () => void }) {
  return (
    <section className="planner-hero">
      <span className="planner-hero__mark" aria-hidden="true">
        <Plane size={18} strokeWidth={1.8} />
      </span>

      <div className="planner-hero__stage" aria-hidden="true">
        <i className="planner-hero__cloud planner-hero__cloud--a" />
        <i className="planner-hero__cloud planner-hero__cloud--b" />
        <i className="planner-hero__cloud planner-hero__cloud--c" />
        <svg className="planner-hero__map" viewBox="0 0 220 160" fill="none">
          <path d="M38 96c18-40 48-52 78-28 22 18 36 8 62-22 10 28-4 58-28 70-30 16-78 18-112-20z" fill="#d5ddd4" />
          <path d="M70 78c14-16 34-14 46 2 8 12 6 24-8 30-18 8-40-2-38-32z" fill="#e7eee4" />
          <circle cx="118" cy="86" r="5" fill="#9eb0c4" opacity="0.7" />
        </svg>

        <span className="planner-hero__card planner-hero__card--a"><Face hair="#3a2a28" skin="#f3d2c4" /></span>
        <span className="planner-hero__card planner-hero__card--b"><Face hair="#2a211e" skin="#e7b89a" band="#7eb7d6" /></span>
        <span className="planner-hero__card planner-hero__card--c"><Face hair="#e6c27a" skin="#f6d7c4" glasses /></span>
        <span className="planner-hero__card planner-hero__card--d"><Face hair="#1c1614" skin="#8d5b43" beard /></span>

        <em className="planner-hero__tag planner-hero__tag--hannah">Hannah<i /></em>
        <em className="planner-hero__tag planner-hero__tag--christian">Christian<i /></em>
        <em className="planner-hero__tag planner-hero__tag--sophia">Sophia<i /></em>
      </div>

      <p className="planner-hero__kicker">Te recomendamos el mejor plan para ti y tus amigos.</p>
      <h1 className="planner-hero__title">Planeamos ese plan. <span>Ahora.</span></h1>
      <button type="button" className="planner-hero__cta" onClick={onDiscover}>
        <Plane size={16} strokeWidth={1.8} />
        Descubrir
      </button>

      <i className="planner-hero__mist planner-hero__mist--left" aria-hidden="true" />
      <i className="planner-hero__mist planner-hero__mist--right" aria-hidden="true" />
    </section>
  );
}
