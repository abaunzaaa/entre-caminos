import type { CSSProperties, ReactNode } from "react";
import { Calendar, ChevronLeft, Clock, House, Leaf, MapPin, PersonStanding, Wallet } from "lucide-react";
import type { PlannerItinerary, PlannerPreferences } from "../../services/planner.service";
import { atmosphereCopy, durationCopy, durationDots, effortEstimate, planFit, type FitIcon } from "./plan-cover";

const PLACE_IMAGE = "/planner/descubre-lugar.jpg";

const ICONS: Record<FitIcon, typeof Leaf> = {
  leaf: Leaf,
  home: House,
  walk: PersonStanding,
  wallet: Wallet,
  calendar: Calendar,
};

type PlannerPlanCoverProps = {
  draft: PlannerItinerary;
  prefs: PlannerPreferences;
  onBack: () => void;
  onDetail: () => void;
  onDiscover: (latitude: number, longitude: number) => void;
};

function ChartTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="plan-cover__tip">
      <button type="button" className="plan-cover__tip-btn" aria-label={label}>
        {children}
      </button>
      <span className="plan-cover__tip-bubble" role="tooltip">{label}</span>
    </span>
  );
}

function money(value: number, currency?: string) {
  const code = (currency || "COP").trim().toUpperCase() || "COP";
  const formatted = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
  return `$ ${formatted} ${code}`;
}

function planDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function Dots({ filled }: { filled: number }) {
  return (
    <span className="plan-cover__dots" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < filled ? "is-on" : ""} />
      ))}
    </span>
  );
}

function PinMark() {
  return (
    <svg className="plan-cover__pin" viewBox="0 0 24 32" aria-hidden="true">
      <path d="M12 1.2C6.6 1.2 2.2 5.5 2.2 10.8c0 7.2 9.8 19.2 9.8 19.2s9.8-12 9.8-19.2C21.8 5.5 17.4 1.2 12 1.2z" />
      <circle cx="12" cy="10.6" r="3.3" />
    </svg>
  );
}

export function PlannerPlanCover({ draft, prefs, onBack, onDetail, onDiscover }: PlannerPlanCoverProps) {
  const venue = draft.venue;
  const duration = durationCopy(draft);
  const dots = durationDots(draft);
  const effort = effortEstimate(draft);
  const atmosphere = atmosphereCopy(draft);
  const fit = planFit(draft, prefs);
  const latitude = venue?.latitude ?? null;
  const longitude = venue?.longitude ?? null;
  const canDiscover = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && !(latitude === 0 && longitude === 0);
  const department = venue?.department?.trim() || "";
  const address = venue?.address?.trim() || "";
  const priceKnown = draft.estimatedCop > 0;
  const schedule = draft.scheduleLabel?.trim() || "Horario flexible";
  const scheduleCaption = draft.scheduleIsSuggested ? "Horario propuesto" : "Sin hora fija";
  const average = fit.score == null ? 0 : fit.score;

  return (
    <div className="plan-cover-page">
      <header className="plan-cover__head">
        <button type="button" className="plan-cover__back" aria-label="Volver a las preferencias" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <h1>{draft.title}</h1>
      </header>
      <div className="plan-cover-stage">
        <article className="plan-cover">
          <div className="plan-cover__body">
            <div className="plan-cover__about">
              <h2>Sobre el plan</h2>
              <p>{draft.summary}</p>
              <div className="plan-cover__meter">
                <div>
                  <span>Duración</span>
                  <Dots filled={dots} />
                  <strong>{duration}</strong>
                </div>
                <div>
                  <span>Nivel de esfuerzo</span>
                  <Dots filled={effort.dots} />
                  <strong title="Estimación según la duración del recorrido, no es una calificación del operador.">
                    {effort.label}
                    {effort.dots > 0 ? <small>estimado</small> : null}
                  </strong>
                </div>
                <div className="is-plain">
                  <span>Ambiente</span>
                  <strong title={atmosphere || "Sin dato de ambiente"}>{atmosphere || "Sin dato de ambiente"}</strong>
                </div>
              </div>
            </div>
            <div className="plan-cover__side">
              <h2>Según tus preferencias</h2>
              {fit.bars.length ? (
                <div className="plan-cover__chart" role="img" aria-label={fit.score == null ? "Coincidencias con tus preferencias" : `Compatibilidad ${fit.score} por ciento`}>
                  <div
                    className="plan-cover__plot"
                    style={{ "--plan-line": `${Math.max(14, Math.min(86, average))}`, "--bars": fit.bars.length } as CSSProperties}
                  >
                    <i className="plan-cover__line" />
                    {fit.bars.map((bar, index) => {
                      const Icon = ICONS[bar.icon];
                      const tone = bar.value >= 0.75 ? "is-strong" : bar.value >= 0.45 ? "is-mid" : "";
                      return (
                        <div key={bar.key} className="plan-cover__col">
                          <span
                            className={`plan-cover__bar${tone ? ` ${tone}` : ""}`}
                            style={{ height: `${Math.max(16, Math.round(bar.value * 100))}%`, animationDelay: `${index * 70}ms` }}
                          />
                          <ChartTip label={bar.label}>
                            <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                          </ChartTip>
                        </div>
                      );
                    })}
                    {fit.score == null ? <span /> : <em>{fit.score}%</em>}
                  </div>
                </div>
              ) : (
                <p className="plan-cover__unscored">Todavía no hay coincidencias suficientes para mostrar un porcentaje.</p>
              )}
              <p className="plan-cover__fit-note">
                {fit.bars.map((bar) => `${bar.label}: ${Math.round(bar.value * 100)}%. ${bar.hint}`).join(" ")}
              </p>
              <h2>Descubre el lugar</h2>
              <div className="plan-cover__discover">
                <figure className="plan-cover__place">
                  <img src={PLACE_IMAGE} alt="" />
                  <button
                    type="button"
                    disabled={!canDiscover}
                    title={canDiscover ? "Abrir la sede en el mapa" : "Esta sede no tiene coordenadas publicadas."}
                    onClick={() => {
                      if (canDiscover && latitude != null && longitude != null) onDiscover(latitude, longitude);
                    }}
                  >
                    <PinMark />
                    Descubrir
                  </button>
                </figure>
                <div className="plan-cover__floats" aria-hidden="true">
                  <div className="plan-cover__float-grid">
                    <img className="is-mochila" src="/planner/carga-mochila.png" alt="" />
                    <img className="is-mapa" src="/planner/carga-mapa.png" alt="" />
                    <img className="is-camara" src="/planner/carga-camara.png" alt="" />
                    <img className="is-brujula" src="/planner/carga-brujula.png" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <footer className="plan-cover__strip">
            <div className="plan-cover__place-name">
              <strong>{draft.municipality}</strong>
              {department ? <small>{department}</small> : null}
            </div>
            <div>
              <span className="plan-cover__glyph"><Calendar size={17} strokeWidth={1.7} aria-hidden="true" /></span>
              <span><strong>{planDate(draft.date)}</strong><small>Fecha</small></span>
            </div>
            <div>
              <span className="plan-cover__glyph"><Clock size={17} strokeWidth={1.7} aria-hidden="true" /></span>
              <span><strong>{schedule}</strong><small>{scheduleCaption}</small></span>
            </div>
            <div className="plan-cover__meet" title={address || "Sin dirección publicada"}>
              <span className="plan-cover__glyph"><MapPin size={17} strokeWidth={1.7} aria-hidden="true" /></span>
              <span>
                <strong>{address || "Sin dirección publicada"}</strong>
                <small>{address ? "Punto de encuentro" : "Sede"}</small>
              </span>
            </div>
            <div className="plan-cover__price">
              <strong>{priceKnown ? money(draft.estimatedCop, draft.currency) : "Por confirmar"}</strong>
            </div>
            <div className="plan-cover__actions">
              <button type="button" className="plan-cover__detail" onClick={onDetail}>
                Ver detalle <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
