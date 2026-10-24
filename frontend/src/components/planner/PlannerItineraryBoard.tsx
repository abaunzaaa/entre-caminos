import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Calendar, Check, ChevronLeft, ChevronRight, CircleHelp, Clock, ExternalLink, MapPin, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { getPublicExperience } from "../../services/catalog.service";
import type { PlannerItinerary, PlannerStop } from "../../services/planner.service";
import { mediaUrl } from "../../utils/media";
import "../../styles/planner.css";

type PlannerItineraryBoardProps = {
  draft: PlannerItinerary;
  busy: boolean;
  saved: boolean;
  error: string;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
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

function planDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
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

function briefCopy(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 118) return clean;
  const slice = clean.slice(0, 118);
  const cut = slice.lastIndexOf(" ");
  return `${(cut > 70 ? slice.slice(0, cut) : slice).trim()}…`;
}

const THEME_ART: Record<string, string> = {
  gastronomia: "/planner/paradas/gastronomia.svg",
  naturaleza: "/planner/paradas/naturaleza.svg",
  cultura: "/planner/paradas/cultura.svg",
  arte: "/planner/paradas/arte.svg",
  bienestar: "/planner/paradas/bienestar.svg",
  deporte: "/planner/paradas/deporte.svg",
  llegada: "/planner/paradas/llegada.svg",
  traslado: "/planner/paradas/traslado.svg",
  descanso: "/planner/paradas/descanso.svg",
};

function themeKey(stop: PlannerStop) {
  const text = `${stop.category} ${stop.title} ${stop.description}`.toLocaleLowerCase("es");
  const thematic: [string, RegExp][] = [
    ["gastronomia", /almuerz|desayun|\bcena\b|comida|gastronom|caf[eé]|restaur|taza|sabor|cocina/],
    ["naturaleza", /bosque|naturalez|parque|paisaje|monta[nñ]|cafetal|\baves?\b|\bsendero\b|reserva/],
    ["cultura", /museo|cultura|historia|patrimonio|finca|tradici/],
    ["arte", /\barte\b|mural|galer[ií]a|pintura|teatro/],
    ["bienestar", /bienestar|\bspa\b|yoga|meditaci/],
    ["deporte", /deporte|cicl|\bbici\b|senderismo/],
  ];
  const themes = thematic.filter(([, pattern]) => pattern.test(text)).map(([theme]) => theme);
  if (themes.length === 1) return themes[0];
  if (themes.length > 1) return null;
  const organizational: [string, RegExp][] = [
    ["llegada", /\bllegad|\bencuent|\binicio\b|\bbienvenid/],
    ["traslado", /\btraslad|\bregres|\btransport/],
    ["descanso", /\bdescans|\bpausa\b|\btiempo libre|\balmuerzo/],
  ];
  const moments = organizational.filter(([, pattern]) => pattern.test(text)).map(([theme]) => theme);
  return moments.length === 1 ? moments[0] : null;
}

function assignStopImages(stops: PlannerStop[], photos: string[], broken: string[]) {
  const pool = photos.filter((src) => src && !broken.includes(src));
  const own = stops.map((stop) => stop.imageUrl?.trim() || "");
  const tally = new Map<string, number>();
  for (const url of own) {
    if (!url || broken.includes(url)) continue;
    tally.set(url, (tally.get(url) ?? 0) + 1);
  }
  const used = new Set<string>();
  const assigned = stops.map(() => "");
  stops.forEach((_, index) => {
    const url = own[index];
    if (url && !broken.includes(url) && tally.get(url) === 1) {
      assigned[index] = url;
      used.add(url);
    }
  });
  stops.forEach((stop, index) => {
    if (assigned[index]) return;
    const prev = index > 0 ? assigned[index - 1] : "";
    const fresh = pool.filter((src) => !used.has(src) && src !== prev);
    if (fresh.length) {
      assigned[index] = fresh[0];
      used.add(fresh[0]);
      return;
    }
    const theme = themeKey(stop);
    const art = theme ? THEME_ART[theme] : "";
    if (art && art !== prev && !broken.includes(art)) {
      assigned[index] = art;
      return;
    }
    const reuse = pool.find((src) => src !== prev);
    assigned[index] = reuse || pool[index % Math.max(pool.length, 1)] || "";
  });
  return assigned;
}

function presentUrl(src: string, width: number) {
  return src.startsWith("/planner/") ? src : mediaUrl(src, width);
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

export function PlannerItineraryBoard({
  draft,
  busy,
  saved,
  error,
  onBack,
  onEdit,
  onSave,
}: PlannerItineraryBoardProps) {
  const photos = useMemo(() => planPhotos(draft), [draft]);
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<string[]>([]);
  const images = useMemo(() => assignStopImages(draft.stops, photos, broken), [draft.stops, photos, broken]);
  const [openStops, setOpenStops] = useState<string[]>([]);
  const [zoom, setZoom] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [experienceNote, setExperienceNote] = useState("");
  const navigate = useNavigate();
  const visible = photos.filter((src) => !broken.includes(src));
  const active = visible[Math.min(index, Math.max(0, visible.length - 1))] ?? "";
  const department = draft.venue?.department?.trim() || "";
  const place = department ? `${draft.municipality}, ${department}` : draft.municipality;
  const schedule = draft.scheduleLabel?.trim() || "Horario flexible";
  const scheduleCaption = draft.scheduleIsSuggested ? "Horario propuesto" : "Sin hora fija";
  const density = draft.stops.length <= 2
    ? "planner-detail--2-stops"
    : draft.stops.length === 3
      ? "planner-detail--3-stops"
      : "planner-detail--4-stops";

  useEffect(() => {
    setIndex(0);
    setBroken([]);
    setOpenStops([]);
    setZoom(false);
    setWhyOpen(false);
  }, [draft.id, draft.title, draft.primaryExperienceId]);

  useEffect(() => {
    if (!zoom && !whyOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setZoom(false);
      setWhyOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, whyOpen]);

  function show(next: number) {
    if (!visible.length) return;
    const count = visible.length;
    setIndex((next + count) % count);
  }

  async function openExperience() {
    const id = draft.primaryExperienceId?.trim();
    if (!id) {
      setExperienceNote("Esta experiencia ya no está disponible en el catálogo.");
      return;
    }
    setOpening(true);
    setExperienceNote("");
    try {
      await getPublicExperience(id);
      navigate(`/explorar/${id}`);
    } catch {
      setExperienceNote("Esta experiencia ya no está disponible en el catálogo.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className={`plan-board-page ${density}`}>
      <div className="plan-board">
        <div className="plan-board__main">
        <header className="plan-board__head">
          <div className="plan-board__title-row">
            <button type="button" className="plan-board__back" aria-label="Volver a la presentación" onClick={onBack}>
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
            <h1>{draft.title}</h1>
          </div>
          <div className="plan-board__copy">
            <p className="plan-board__summary">{draft.summary}</p>
            {draft.alternativeMessage ? <p className="plan-board__alt">{draft.alternativeMessage}</p> : null}
            <ul className="plan-board__facts">
              <li><MapPin size={14} strokeWidth={1.7} aria-hidden="true" /> {place}</li>
              <li><Calendar size={14} strokeWidth={1.7} aria-hidden="true" /> {planDate(draft.date)}</li>
              <li>
                <Clock size={14} strokeWidth={1.7} aria-hidden="true" />
                <span>{schedule}</span>
                <small>{scheduleCaption}</small>
              </li>
            </ul>
          </div>
        </header>
        <section className="plan-board__route">
          <h2>Tu recorrido</h2>
          <div className="plan-board__stops">
            <ol>
              {draft.stops.map((stop, stopIndex) => {
                const suggestion = stop.stopType === "suggestion" || stop.included === false;
                const key = `${stop.position}-${stop.title}`;
                const photo = images[stopIndex] || "";
                const expanded = openStops.includes(key);
                const full = stop.description.replace(/\s+/g, " ").trim();
                const preview = briefCopy(full);
                const canExpand = preview !== full;
                return (
                  <li key={key}>
                    <span className="plan-board__num">{stop.position}</span>
                    <article>
                      {photo ? (
                        <img src={presentUrl(photo, 480)} alt="" onError={() => setBroken((current) => current.includes(photo) ? current : [...current, photo])} />
                      ) : (
                        <span className="plan-board__blank" aria-hidden="true" />
                      )}
                      <div>
                        <small>{stopWhen(stop)}</small>
                        <h3>{stop.title}</h3>
                        <p>{expanded || !canExpand ? full : preview}</p>
                        {canExpand ? (
                          <button
                            type="button"
                            className="plan-board__more"
                            aria-expanded={expanded}
                            onClick={() => setOpenStops((current) => expanded ? current.filter((item) => item !== key) : [...current, key])}
                          >
                            {expanded ? "Ver menos" : "Ver descripción"}
                          </button>
                        ) : null}
                      </div>
                      <ul>
                        {stopLength(stop) ? <li><Clock size={14} strokeWidth={1.7} aria-hidden="true" /> {stopLength(stop)}</li> : null}
                        <li><MapPin size={14} strokeWidth={1.7} aria-hidden="true" /> {stop.municipality || stop.location}</li>
                        <li>{suggestion ? <Sparkles size={14} strokeWidth={1.7} aria-hidden="true" /> : <Check size={14} strokeWidth={1.7} aria-hidden="true" />} {stopKind(stop)}</li>
                      </ul>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
        <div className="plan-board__experience">
          <button type="button" disabled={opening} onClick={() => { void openExperience(); }}>
            <ExternalLink size={15} strokeWidth={1.8} /> Ver experiencia
          </button>
          {experienceNote ? <p className="plan-board__note" role="status">{experienceNote}</p> : null}
        </div>
        </div>

        <aside className="plan-board__side">
          <section className="plan-board__gallery">
            {active ? (
              <div className="plan-board__hero">
                <img className="plan-board__hero-bg" src={mediaUrl(active, 640)} alt="" aria-hidden="true" />
                <button type="button" className="plan-board__zoom" aria-label="Ver la fotografía completa" onClick={() => setZoom(true)}>
                  <img key={active} src={mediaUrl(active, 1400)} alt="" onError={() => setBroken((current) => current.includes(active) ? current : [...current, active])} />
                </button>
                {visible.length > 1 ? (
                  <>
                    <button type="button" aria-label="Foto anterior" onClick={() => show(index - 1)}><ChevronLeft size={16} /></button>
                    <button type="button" className="is-next" aria-label="Foto siguiente" onClick={() => show(index + 1)}><ChevronRight size={16} /></button>
                  </>
                ) : null}
                <button type="button" className="plan-board__why-btn" aria-label="¿Por qué este plan es para ti?" onClick={() => setWhyOpen(true)}>
                  <CircleHelp size={18} strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <div className="plan-board__hero is-empty">
                Sin fotografías publicadas
                <button type="button" className="plan-board__why-btn" aria-label="¿Por qué este plan es para ti?" onClick={() => setWhyOpen(true)}>
                  <CircleHelp size={18} strokeWidth={1.8} />
                </button>
              </div>
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

          <div className="plan-board__actions">
            <button type="button" onClick={onEdit}><SlidersHorizontal size={15} strokeWidth={1.8} /> Editar preferencias</button>
            <button type="button" className="is-solid" disabled={busy || saved} onClick={onSave}>
              <Bookmark size={15} strokeWidth={1.8} /> {saved ? "Plan guardado" : "Guardar este plan"}
            </button>
          </div>
          {error ? <p className="planner__error" role="alert">{error}</p> : null}
        </aside>
      </div>
      {whyOpen ? (
        <div className="plan-board__why-modal" role="dialog" aria-modal="true" aria-labelledby="plan-why-title">
          <button type="button" className="plan-board__why-modal-backdrop" aria-label="Cerrar" onClick={() => setWhyOpen(false)} />
          <div className="plan-board__why-modal-panel">
            <button type="button" className="plan-board__why-modal-close" aria-label="Cerrar" onClick={() => setWhyOpen(false)}>
              <X size={16} strokeWidth={1.8} />
            </button>
            <h2 id="plan-why-title"><Sparkles size={16} strokeWidth={1.7} aria-hidden="true" /> ¿Por qué este plan es para ti?</h2>
            <p>{draft.why}</p>
          </div>
        </div>
      ) : null}
      {zoom && active ? (
        <div className="plan-board__lightbox" role="dialog" aria-modal="true" aria-label="Fotografía completa">
          <button type="button" className="plan-board__lightbox-close" aria-label="Cerrar" onClick={() => setZoom(false)} />
          <img src={mediaUrl(active, 1600)} alt="" />
        </div>
      ) : null}
    </div>
  );
}
