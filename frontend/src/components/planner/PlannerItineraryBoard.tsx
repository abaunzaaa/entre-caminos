import { useEffect, useMemo, useState } from "react";
import { Bookmark, Calendar, Camera, Check, ChevronLeft, ChevronRight, Clock, House, Leaf, MapPin, PersonStanding, SlidersHorizontal, Sparkles, Wallet } from "lucide-react";
import type { PlannerItinerary, PlannerPreferences, PlannerStop } from "../../services/planner.service";
import { mediaUrl } from "../../utils/media";
import { atmosphereCopy, durationCopy, durationDots, effortEstimate, planFit, type FitIcon } from "./plan-cover";
import "../../styles/planner.css";

const ICONS: Record<FitIcon, typeof Leaf> = {
  leaf: Leaf,
  home: House,
  walk: PersonStanding,
  wallet: Wallet,
  calendar: Calendar,
};

type PlannerItineraryBoardProps = {
  draft: PlannerItinerary;
  prefs: PlannerPreferences;
  busy: boolean;
  saved: boolean;
  error: string;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onOpenExperience: (id: string) => void;
};

function planPhotos(draft: PlannerItinerary) {
  const seen = new Set<string>();
  const photos: string[] = [];
  const raw = [
    ...(draft.photos ?? []),
    draft.coverImageUrl,
    ...draft.stops.filter((stop) => stop.stopType !== "suggestion").map((stop) => stop.imageUrl),
  ];
  for (const item of raw) {
    const value = item?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    photos.push(value);
  }
  return photos;
}

function sentence(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function stopWhen(stop: PlannerStop) {
  if (stop.suggestedAt && stop.suggestedEnd) return `${stop.suggestedAt} – ${stop.suggestedEnd}`;
  if (stop.suggestedAt) return stop.suggestedAt;
  return "Horario flexible";
}

function stopKind(stop: PlannerStop) {
  if (stop.stopType === "suggestion" || stop.included === false) return "Sugerido por IA";
  return "Incluido en la experiencia";
}

function stopLength(stop: PlannerStop) {
  const minutes = stop.durationMinutes ?? 0;
  if (minutes <= 0) return stop.durationLabel || "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return hours === 1 ? "1 h" : `${hours} h`;
  return `${rest} min`;
}

function Dots({ filled }: { filled: number }) {
  return (
    <span className="plan-board__dots" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < filled ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function PlannerItineraryBoard({
  draft,
  prefs,
  busy,
  saved,
  error,
  onBack,
  onEdit,
  onSave,
  onOpenExperience,
}: PlannerItineraryBoardProps) {
  const photos = useMemo(() => planPhotos(draft), [draft]);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<string[]>([]);
  const visible = photos.filter((src) => !broken.includes(src));
  const active = visible[Math.min(index, Math.max(0, visible.length - 1))] ?? "";
  const fit = planFit(draft, prefs);
  const effort = effortEstimate(draft);
  const atmosphere = sentence(atmosphereCopy(draft));
  const traits = atmosphere ? atmosphere.split(",").map((item) => item.trim()).filter(Boolean).length : 0;
  const atmosphereDots = traits <= 0 ? 0 : Math.min(5, traits + 2);
  const average = fit.score ?? 0;

  useEffect(() => {
    setIndex(0);
    setBroken([]);
  }, [draft.id, draft.title, draft.primaryExperienceId]);

  function show(next: number) {
    if (!visible.length) return;
    const count = visible.length;
    setIndex((next + count) % count);
  }

  return (
    <div className="plan-board-page">
      <button type="button" className="plan-board__back" aria-label="Volver a la presentación" onClick={onBack}>
        <ChevronLeft size={16} strokeWidth={1.8} />
      </button>
      <div className="plan-board">
        <section className="plan-board__info">
          <div className="plan-board__about">
            <p className="plan-board__kicker">Sobre el plan</p>
            <h1>{draft.title}</h1>
            <p className="plan-board__summary">{draft.summary}</p>
            {draft.alternativeMessage ? <p className="plan-board__alt">{draft.alternativeMessage}</p> : null}
            {draft.primaryExperienceId ? (
              <button type="button" className="plan-board__catalog" onClick={() => onOpenExperience(draft.primaryExperienceId!)}>
                Ver experiencia
              </button>
            ) : null}
            <div className="plan-board__meter">
              <div>
                <span>Duración</span>
                <Dots filled={durationDots(draft)} />
                <strong>{durationCopy(draft)}</strong>
              </div>
              <div>
                <span>Nivel de esfuerzo</span>
                <Dots filled={effort.dots} />
                <strong title="Estimación según la duración del recorrido.">
                  {effort.label}
                  {effort.dots > 0 ? <small>estimado</small> : null}
                </strong>
              </div>
              <div>
                <span>Ambiente</span>
                <Dots filled={atmosphereDots} />
                <strong>{atmosphere || "Sin dato"}</strong>
              </div>
            </div>
          </div>
          <div className="plan-board__fit">
            <h2>Según tus preferencias</h2>
            {fit.bars.length ? (
              <div className="plan-board__chart" role="img" aria-label={fit.score == null ? "Coincidencias con tus preferencias" : `Compatibilidad ${fit.score} por ciento`}>
                <div className="plan-board__bars">
                  <i className="plan-board__line" style={{ bottom: `${Math.max(18, Math.min(82, average))}%` }} />
                  {fit.bars.map((bar, barIndex) => (
                    <span
                      key={bar.key}
                      className={bar.value >= 0.6 ? "is-strong" : ""}
                      style={{ height: `${Math.max(22, Math.round(bar.value * 100))}%`, animationDelay: `${barIndex * 70}ms` }}
                      title={`${bar.label}. ${bar.hint}`}
                    />
                  ))}
                  {fit.score == null ? null : <em style={{ bottom: `${Math.max(18, Math.min(82, average))}%` }}>{fit.score}%</em>}
                </div>
                <div className="plan-board__icons">
                  {fit.bars.map((bar) => {
                    const Icon = ICONS[bar.icon];
                    return <Icon key={bar.key} size={14} strokeWidth={1.7} aria-hidden="true" />;
                  })}
                </div>
              </div>
            ) : (
              <p className="plan-board__unscored">Todavía no hay coincidencias suficientes para un porcentaje.</p>
            )}
            <p className="plan-board__fit-note">
              {fit.bars.map((bar) => `${bar.label}: ${Math.round(bar.value * 100)}%. ${bar.hint}`).join(" ")}
            </p>
          </div>
        </section>

        <section className="plan-board__route">
          <h2>Tu recorrido</h2>
          <div className="plan-board__stops">
            <ol>
              {draft.stops.map((stop) => {
                const suggestion = stop.stopType === "suggestion" || stop.included === false;
                const photo = !suggestion && stop.imageUrl && !broken.includes(stop.imageUrl) ? stop.imageUrl : "";
                return (
                  <li key={`${stop.position}-${stop.title}`}>
                    <span className="plan-board__num">{stop.position}</span>
                    <article>
                      {photo ? (
                        <img src={mediaUrl(photo, 240)} alt="" onError={() => setBroken((current) => current.includes(photo) ? current : [...current, photo])} />
                      ) : (
                        <span className="plan-board__blank" aria-hidden="true"><Camera size={16} strokeWidth={1.6} /></span>
                      )}
                      <div>
                        <small>{stopWhen(stop)}</small>
                        <h3>{stop.title}</h3>
                        <p>{stop.description}</p>
                      </div>
                      <ul>
                        {stopLength(stop) ? <li><Clock size={13} strokeWidth={1.7} aria-hidden="true" /> {stopLength(stop)}</li> : null}
                        <li><MapPin size={13} strokeWidth={1.7} aria-hidden="true" /> {stop.municipality || stop.location}</li>
                        <li>{suggestion ? <Sparkles size={13} strokeWidth={1.7} aria-hidden="true" /> : <Check size={13} strokeWidth={1.7} aria-hidden="true" />} {stopKind(stop)}</li>
                      </ul>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="plan-board__gallery">
          {active ? (
            <div className="plan-board__hero">
              <img key={active} src={mediaUrl(active, 1200)} alt="" onError={() => setBroken((current) => current.includes(active) ? current : [...current, active])} />
              {visible.length > 1 ? (
                <>
                  <button type="button" aria-label="Foto anterior" onClick={() => show(index - 1)}><ChevronLeft size={16} /></button>
                  <button type="button" className="is-next" aria-label="Foto siguiente" onClick={() => show(index + 1)}><ChevronRight size={16} /></button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="plan-board__hero is-empty">Sin fotografías publicadas</div>
          )}
          {visible.length > 1 ? (
            <div className="plan-board__thumbs">
              {visible.map((src, photoIndex) => (
                <button
                  key={src}
                  type="button"
                  className={src === active ? "is-on" : ""}
                  aria-label={`Fotografía ${photoIndex + 1}`}
                  onClick={() => setIndex(photoIndex)}
                >
                  <img src={mediaUrl(src, 240)} alt="" onError={() => setBroken((current) => current.includes(src) ? current : [...current, src])} />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="plan-board__side">
          <section className="plan-board__why">
            <h2><Sparkles size={15} strokeWidth={1.7} aria-hidden="true" /> ¿Por qué este plan es para ti?</h2>
            <p>{draft.why}</p>
          </section>
          <div className="plan-board__actions">
            <button type="button" onClick={onEdit}><SlidersHorizontal size={15} strokeWidth={1.8} /> Editar preferencias</button>
            <button type="button" className="is-solid" disabled={busy || saved} onClick={onSave}>
              <Bookmark size={15} strokeWidth={1.8} /> {saved ? "Plan guardado" : "Guardar este plan"}
            </button>
          </div>
          {error ? <p className="planner__error" role="alert">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
