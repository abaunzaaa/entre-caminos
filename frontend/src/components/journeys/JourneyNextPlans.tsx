import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useInViewReveal } from "../../hooks/useInViewReveal";
import { bogotaDay, ticketDate } from "../../utils/journey-dates";
import { mediaUrl } from "../../utils/media";
import type { JourneyPlan } from "../../services/journey.service";
import { selectUpcomingPlans } from "./next-plans";
import { TicketCategoryIcon } from "./TicketCategoryIcon";

const MAX_RANGE_MINUTES = 16 * 60;
const TICKET_CAP_FILL = "M8 96H58C92 96 86 54 120 54C154 54 148 96 182 96H232C235.3 96 238 98.7 238 102H2C2 98.7 4.7 96 8 96Z";
const TICKET_CAP_LINE = "M2 102C2 98.7 4.7 96 8 96H58C92 96 86 54 120 54C154 54 148 96 182 96H232C235.3 96 238 98.7 238 102";

function slotCount(count: number, width: number) {
  const maxSlots = width < 540 ? 1 : width < 800 ? 2 : width < 1080 ? 3 : 4;
  return Math.max(1, Math.min(Math.max(count, 1), maxSlots));
}

function clock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("hour")}:${value("minute")} ${value("dayPeriod").toLowerCase()}`;
}

function planTime(plan: JourneyPlan) {
  const start = new Date(plan.plannedAt);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  const minutes = plan.experience.durationMinutes ?? 0;
  const end = minutes > 0 && minutes <= MAX_RANGE_MINUTES ? ` – ${clock(new Date(start.getTime() + minutes * 60_000))}` : "";
  return `${clock(start)}${end}`;
}

function delay(ms: number) {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

export function JourneyNextPlans({
  plans,
  status,
  onOpenDay,
  onOpenCalendar,
}: {
  plans: JourneyPlan[];
  status: "loading" | "ready" | "error";
  onOpenDay: (day: string) => void;
  onOpenCalendar: () => void;
}) {
  const { ref, inView } = useInViewReveal<HTMLDivElement>({ rootMargin: "0px", enterRatio: 0.14, leaveRatio: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const selection = selectUpcomingPlans(plans, Date.now(), 0, Math.max(plans.length, 1));
  const items = status === "ready" ? selection.items : [];
  const [slots, setSlots] = useState(() => slotCount(items.length, typeof window === "undefined" ? 1200 : window.innerWidth));
  const carousel = items.length > slots;

  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const overflow = max > 8;
    setCanPrev(overflow && scroller.scrollLeft > 8);
    setCanNext(overflow && scroller.scrollLeft < max - 8);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const measure = () => setSlots(slotCount(items.length, frame.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [items.length]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollLeft = 0;
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(scroller);
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const timer = window.setTimeout(update, 80);
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearTimeout(timer);
    };
  }, [items.length, slots, update]);

  function scrollByCard(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const card = scroller.querySelector<HTMLElement>("li");
    const styles = window.getComputedStyle(scroller);
    const rawGap = styles.columnGap || styles.gap || "24";
    const parsedGap = Number.parseFloat(rawGap);
    const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gap = Number.isFinite(parsedGap) ? (rawGap.trim().endsWith("rem") ? parsedGap * rootSize : parsedGap) : 24;
    const amount = (card?.offsetWidth ?? 260) + gap;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({ left: direction * amount, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function onRailKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    scrollByCard(event.key === "ArrowRight" ? 1 : -1);
  }

  return (
    <div
      ref={ref}
      className={`caminos-plans__col explorer-reveal-scope${inView ? " is-revealed" : ""}`}
      aria-busy={status === "loading"}
    >
      <h2 id="caminos-plans-title" className="explorer-recs__column-title caminos-plans__title explorer-reveal explorer-reveal--title">Próximos planes</h2>
      <p className="explorer-recs__column-lead caminos-plans__lead explorer-reveal explorer-reveal--soft" style={delay(100)}>
        Experiencias que ya hacen parte de tu camino.
      </p>

      <div className="caminos-plans__body" ref={frameRef}>
        {status === "loading" ? <p className="caminos-plans__status">Cargando tus planes…</p> : null}

        {status === "ready" && items.length === 0 ? (
          <div className="caminos-plans__empty explorer-reveal explorer-reveal--card" style={delay(200)}>
            <img src="/mis-caminos/vacio-planes.png" alt="" width={1024} height={682} decoding="async" />
            <p>Aún no tienes próximos planes</p>
            <span>Tu próxima experiencia está por comenzar. Explora, elige y agenda un nuevo camino.</span>
            <button type="button" className="tourist-hero__cta" onClick={onOpenCalendar}>
              Ir a mi calendario
            </button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="caminos-boletos" data-carousel={carousel ? "true" : "false"} style={{ "--visible": slots } as CSSProperties}>
            {carousel && canPrev ? (
              <button type="button" className="caminos-boletos__nav caminos-boletos__nav--prev" aria-label="Planes anteriores" onClick={() => scrollByCard(-1)}>
                <ChevronLeft size={16} strokeWidth={1.6} aria-hidden="true" />
              </button>
            ) : null}
            <ul
              ref={scrollerRef}
              className="caminos-boletos__rail"
              tabIndex={carousel ? 0 : undefined}
              aria-label={carousel ? "Próximos planes" : undefined}
              onKeyDown={carousel ? onRailKey : undefined}
            >
              {items.map((plan, index) => {
                const date = ticketDate(plan.plannedAt);
                const when = planTime(plan);
                const place = plan.experience.location.trim();
                return (
                  <li key={plan.id} className="explorer-reveal explorer-reveal--card" style={delay(180 + index * 70)}>
                    <button
                      type="button"
                      className="caminos-boleto"
                      onClick={() => onOpenDay(bogotaDay(plan.plannedAt))}
                      aria-label={`${plan.experience.title}${when ? `, ${when}` : ""}${place ? `, ${place}` : ""}, ${date.day} ${date.month} ${date.year}. Abrir en el calendario`}
                      title={plan.experience.title}
                    >
                      <svg className="caminos-boleto__shape" viewBox="0 0 240 102" preserveAspectRatio="none" aria-hidden="true">
                        <path className="is-fill" d={TICKET_CAP_FILL} />
                        <path className="is-line" d={TICKET_CAP_LINE} />
                      </svg>
                      <span className="caminos-boleto__board" aria-hidden="true" />
                      <span className="caminos-boleto__seal">
                        <TicketCategoryIcon name={plan.experience.category} />
                      </span>
                      <span className="caminos-boleto__content">
                        <span className="caminos-boleto__rule" aria-hidden="true" />
                        <span className="caminos-boleto__photo">
                          {plan.experience.imageUrl ? (
                            <img
                              src={mediaUrl(plan.experience.imageUrl, 640)}
                              alt=""
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          ) : null}
                        </span>
                        <span className="caminos-boleto__foot">
                          <span className="caminos-boleto__meta">
                            <span className="caminos-boleto__title">{plan.experience.title}</span>
                            {when ? <span className="caminos-boleto__time">{when}</span> : null}
                            {place ? <span className="caminos-boleto__place">{place}</span> : null}
                          </span>
                          <span className="caminos-boleto__date">
                            <span className="caminos-boleto__month">{date.month}</span>
                            <span className="caminos-boleto__day">{date.day}</span>
                            <span className="caminos-boleto__year">{date.year}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {carousel && canNext ? (
              <button type="button" className="caminos-boletos__nav caminos-boletos__nav--next" aria-label="Planes siguientes" onClick={() => scrollByCard(1)}>
                <ChevronRight size={16} strokeWidth={1.6} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
