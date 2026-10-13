import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useInViewReveal } from "../../hooks/useInViewReveal";
import { bogotaDay, ticketDate } from "../../utils/journey-dates";
import { mediaUrl } from "../../utils/media";
import type { JourneyExperience, JourneyPlan } from "../../services/journey.service";
import { selectUpcomingPlans } from "./next-plans";

const MAX_RANGE_MINUTES = 16 * 60;

function clock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("hour")}:${value("minute")}${value("dayPeriod").toLowerCase()}`;
}

function schedule(plan: JourneyPlan) {
  const start = new Date(plan.plannedAt);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "long", timeZone: "America/Bogota" }).format(start);
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const minutes = plan.experience.durationMinutes ?? 0;
  const end = minutes > 0 && minutes <= MAX_RANGE_MINUTES ? ` – ${clock(new Date(start.getTime() + minutes * 60_000))}` : "";
  return `${label} ${clock(start)}${end}`;
}

function brief(experience: JourneyExperience) {
  const clean = (experience.description ?? "").replace(/\s+/g, " ").trim();
  if (clean) return clean;
  const segments = experience.location.split(",").map((part) => part.trim()).filter(Boolean);
  const place = segments.length > 1 ? segments[segments.length - 2] : segments[0];
  return [experience.category, place].filter(Boolean).join(" · ");
}

function delay(ms: number) {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

export function JourneyNextPlans({
  plans,
  loading,
  onOpenDay,
}: {
  plans: JourneyPlan[];
  loading: boolean;
  onOpenDay: (day: string) => void;
}) {
  const { ref, inView } = useInViewReveal<HTMLDivElement>({ rootMargin: "0px", enterRatio: 0.14, leaveRatio: 0 });
  const [page, setPage] = useState(0);
  const selection = selectUpcomingPlans(plans, Date.now(), page);
  const { items, showPager, pageCount } = selection;

  return (
    <div ref={ref} className={`caminos-plans__col explorer-reveal-scope${inView ? " is-revealed" : ""}`}>
      <h2 id="caminos-plans-title" className="explorer-recs__column-title caminos-plans__title explorer-reveal explorer-reveal--title">Próximos planes</h2>
      <p className="explorer-recs__column-lead caminos-plans__lead explorer-reveal explorer-reveal--soft" style={delay(100)}>
        Experiencias que ya hacen parte de tu camino.
      </p>

      <div className="caminos-plans__body">
      {loading ? null : items.length === 0 ? (
        <div className="caminos-plans__empty explorer-reveal explorer-reveal--card" style={delay(200)}>
          <p>Aún no tienes próximos planes.</p>
          <span>Elige una experiencia y dale un lugar en tu calendario.</span>
          <Link to="/explorar" className="tourist-hero__cta">Explorar experiencias</Link>
        </div>
      ) : (
        <>
          <ul key={selection.page} className="caminos-plans__list">
            {items.map((plan, index) => {
              const date = ticketDate(plan.plannedAt);
              const when = schedule(plan);
              const text = brief(plan.experience);
              return (
                <li key={plan.id} className="explorer-reveal explorer-reveal--card" style={delay(200 + index * 85)}>
                  <button
                    type="button"
                    className="caminos-pass"
                    onClick={() => onOpenDay(bogotaDay(plan.plannedAt))}
                    aria-label={`${plan.experience.title}, ${when}, ${date.day} ${date.month} ${date.year}. Abrir en el calendario`}
                  >
                    <span className="caminos-pass__photo">
                      {plan.experience.imageUrl ? (
                        <img src={mediaUrl(plan.experience.imageUrl, 420)} alt="" loading="lazy" />
                      ) : null}
                    </span>
                    <span className="caminos-pass__body">
                      <span className="caminos-pass__when">{when}</span>
                      <span className="caminos-pass__title">{plan.experience.title}</span>
                      {text ? <span className="caminos-pass__text">{text}</span> : null}
                    </span>
                    <span className="caminos-pass__date">
                      <span className="caminos-pass__month">{date.month}</span>
                      <span className="caminos-pass__day">{date.day}</span>
                      <span className="caminos-pass__year">{date.year}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {showPager ? (
            <nav className="caminos-plans__pager" aria-label="Páginas de próximos planes">
              <button type="button" aria-label="Planes anteriores" disabled={selection.page === 0} onClick={() => setPage(selection.page - 1)}>
                <ChevronLeft size={13} strokeWidth={1.6} aria-hidden="true" />
              </button>
              <span>{selection.page + 1} / {pageCount}</span>
              <button type="button" aria-label="Planes siguientes" disabled={selection.page >= pageCount - 1} onClick={() => setPage(selection.page + 1)}>
                <ChevronRight size={13} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      )}
      </div>
    </div>
  );
}
