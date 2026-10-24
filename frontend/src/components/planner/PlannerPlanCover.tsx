import { Calendar, Clock, House, Leaf, MapPin, PersonStanding, Wallet } from "lucide-react";
import type { PlannerItinerary, PlannerPreferences } from "../../services/planner.service";
import { mediaUrl } from "../../utils/media";
import { atmosphereCopy, durationCopy, durationDots, effortEstimate, planFit, type FitIcon } from "./plan-cover";

const FLOATS = [
  { src: "/planner/mochila.png", tilt: "a", label: "Mochila" },
  { src: "/planner/mapa-decorativo.png", tilt: "b", label: "Mapa" },
  { src: "/planner/camara.png", tilt: "c", label: "Cámara" },
  { src: "/mis-caminos/stickers/line-brujula.png", tilt: "d", label: "Brújula" },
] as const;

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
  onDetail: () => void;
  onDiscover: (latitude: number, longitude: number) => void;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
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

export function PlannerPlanCover({ draft, prefs, onDetail, onDiscover }: PlannerPlanCoverProps) {
  const venue = draft.venue;
  const photo = draft.coverImageUrl || draft.stops.find((stop) => stop.imageUrl)?.imageUrl || "";
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
      <h1>{draft.title}</h1>
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
                <div className="is-wide">
                  <span>Ambiente</span>
                  <strong>{atmosphere || "Sin dato de ambiente"}</strong>
                </div>
              </div>
            </div>
            <div className="plan-cover__side">
              <h2>Según tus preferencias</h2>
              {fit.bars.length ? (
                <div className="plan-cover__chart" role="img" aria-label={fit.score == null ? "Coincidencias con tus preferencias" : `Compatibilidad ${fit.score} por ciento`}>
                  <div className="plan-cover__plot">
                    <div className="plan-cover__bars">
                      <i className="plan-cover__line" style={{ bottom: `${Math.max(14, Math.min(86, average))}%` }} />
                      {fit.bars.map((bar, index) => (
                        <span
                          key={bar.key}
                          className={bar.value >= 0.6 ? "is-strong" : ""}
                          style={{ height: `${Math.max(18, Math.round(bar.value * 100))}%`, animationDelay: `${index * 70}ms` }}
                          title={`${bar.label}. ${bar.hint}`}
                        />
                      ))}
                      {fit.score == null ? null : <em style={{ bottom: `${Math.max(14, Math.min(86, average))}%` }}>{fit.score}%</em>}
                    </div>
                    <div className="plan-cover__icons">
                      {fit.bars.map((bar) => {
                        const Icon = ICONS[bar.icon];
                        return <Icon key={bar.key} size={14} strokeWidth={1.7} aria-hidden="true" />;
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="plan-cover__unscored">Todavía no hay coincidencias suficientes para mostrar un porcentaje.</p>
              )}
              <p className="plan-cover__fit-note">
                {fit.bars.map((bar) => `${bar.label}: ${Math.round(bar.value * 100)}%. ${bar.hint}`).join(" ")}
              </p>
              <h2>Descubre el lugar</h2>
              <figure className="plan-cover__place">
                {photo ? <img src={mediaUrl(photo, 960)} alt="" /> : <span />}
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
            </div>
          </div>
          <footer className="plan-cover__strip">
            <div className="plan-cover__place-name">
              <strong>{draft.municipality}</strong>
              {department ? <small>{department}</small> : null}
            </div>
            <div>
              <Calendar size={16} strokeWidth={1.7} aria-hidden="true" />
              <span><strong>{planDate(draft.date)}</strong><small>Fecha</small></span>
            </div>
            <div>
              <Clock size={16} strokeWidth={1.7} aria-hidden="true" />
              <span><strong>{schedule}</strong><small>{scheduleCaption}</small></span>
            </div>
            <div>
              <MapPin size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>
                <strong>{address || "Sin dirección publicada"}</strong>
                <small>{address ? "Punto de encuentro" : "Sede"}</small>
              </span>
            </div>
            <div className="plan-cover__price">
              <strong>{priceKnown ? money(draft.estimatedCop) : "Por confirmar"}</strong>
              <small>{priceKnown ? "Precio publicado" : "Sin precio confirmado"}</small>
            </div>
            <div className="plan-cover__actions">
              {canDiscover && latitude != null && longitude != null ? (
                <button
                  type="button"
                  className="plan-cover__map-pin"
                  aria-label="Abrir la sede en el mapa"
                  onClick={() => onDiscover(latitude, longitude)}
                >
                  <PinMark />
                </button>
              ) : null}
              <button type="button" className="plan-cover__detail" onClick={onDetail}>
                Ver detalle <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </article>
        <ul className="plan-cover__float" aria-hidden="true">
          {FLOATS.map((item) => (
            <li key={item.label} className={`is-${item.tilt}`}>
              <img src={item.src} alt="" draggable={false} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
