import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Compass, Heart, Leaf, Mountain, Sun, Trees, Users } from "lucide-react";
import { TicketCategoryIcon } from "../components/journeys/TicketCategoryIcon";
import { PlannerWelcome } from "../components/planner/PlannerWelcome";
import {
  generatePlanner,
  loadPlannerItinerary,
  loadPlannerOptions,
  savePlanner,
  type DurationKey,
  type PlannerItinerary,
  type PlannerPreferences,
  type PlanType,
} from "../services/planner.service";
import { getApiErrorMessage } from "../utils/api-error";
import { mediaUrl } from "../utils/media";
import "../styles/planner.css";

const PREF_KEY = "ec-planner-prefs";
const DRAFT_KEY = "ec-planner-draft";

const PLAN_TYPES: Array<{ id: PlanType; label: string; icon: typeof Mountain }> = [
  { id: "aventura", label: "Aventura", icon: Mountain },
  { id: "tranquilo", label: "Tranquilo", icon: Sun },
  { id: "romantico", label: "Romántico", icon: Heart },
  { id: "familia", label: "En familia", icon: Users },
  { id: "aire", label: "Al aire libre", icon: Trees },
];

const DURATIONS: Array<{ id: DurationKey; label: string }> = [
  { id: "1-2", label: "1–2 horas" },
  { id: "3-5", label: "3–5 horas" },
  { id: "5-8", label: "5–8 horas" },
  { id: "8+", label: "Más de 8 horas" },
];

type Step = "welcome" | "form" | "making" | "result";

function todayBogota() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function money(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function monthRail(iso: string) {
  const today = todayBogota();
  const start = new Date(`${today}T12:00:00`);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { label: MONTHS[date.getMonth()], key, on: iso.startsWith(key) };
  });
}

function dateInMonth(current: string, key: string) {
  const today = todayBogota();
  const dim = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
  const day = Math.min(Number(current.slice(8, 10)) || 1, dim);
  const next = `${key}-${String(day).padStart(2, "0")}`;
  return next < today ? today : next;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function emptyPrefs(): PlannerPreferences {
  return {
    date: todayBogota(),
    budgetCop: 300000,
    categoryIds: [],
    planType: "aventura",
    durationKey: "3-5",
    municipality: "",
    people: 2,
    note: "",
  };
}

export function PlannerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(id ? "result" : "welcome");
  const [prefs, setPrefs] = useState<PlannerPreferences>(() => readJson<PlannerPreferences>(PREF_KEY) ?? emptyPrefs());
  const [draft, setDraft] = useState<PlannerItinerary | null>(() => readJson<PlannerItinerary>(DRAFT_KEY));
  const [options, setOptions] = useState<{ categories: { id: string; name: string }[]; municipalities: string[] }>({ categories: [], municipalities: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPlannerOptions()
      .then((data) => {
        if (!alive) return;
        setOptions(data);
        setPrefs((current) => ({ ...current, municipality: current.municipality || data.municipalities[0] || "" }));
      })
      .catch((err) => {
        if (alive) setError(getApiErrorMessage(err, "No pudimos cargar las preferencias del catálogo."));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setBusy(true);
    loadPlannerItinerary(id)
      .then((data) => {
        if (!alive) return;
        setDraft(data);
        setSaved(true);
        setStep("result");
      })
      .catch((err) => {
        if (alive) setError(getApiErrorMessage(err, "No pudimos abrir ese plan."));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const coverStop = useMemo(() => draft?.stops.find((stop) => stop.imageUrl) ?? draft?.stops[0] ?? null, [draft]);

  function remember(nextPrefs: PlannerPreferences, nextDraft: PlannerItinerary | null) {
    sessionStorage.setItem(PREF_KEY, JSON.stringify(nextPrefs));
    if (nextDraft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
  }

  async function run(avoid: string[]) {
    setError("");
    setBusy(true);
    setStep("making");
    const previous = draft;
    try {
      const next = await generatePlanner(prefs, avoid);
      setDraft(next);
      setSaved(false);
      remember(prefs, next);
      setStep("result");
    } catch (err) {
      const message = getApiErrorMessage(err, "No pudimos trazar el camino.");
      setError(message);
      if (previous && avoid.length) {
        setDraft(previous);
        setStep("result");
      } else {
        setStep("form");
      }
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!prefs.categoryIds.length || !prefs.municipality || !prefs.date) {
      setError("Completa la fecha, el municipio y al menos un interés.");
      return;
    }
    void run([]);
  }

  async function persist() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const stored = await savePlanner(draft, prefs);
      setDraft(stored);
      setSaved(true);
      remember(prefs, stored);
      navigate(`/planear-mi-plan/guardado/${stored.id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos guardar el plan."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "welcome") {
    return (
      <main className="planner planner--welcome">
        <PlannerWelcome onDiscover={() => setStep("form")} />
      </main>
    );
  }

  if (step === "making") {
    return (
      <main className="planner">
        <section className="planner__making">
          <div className="planner__hills" aria-hidden="true" />
          <div className="planner__path" aria-hidden="true">
            <span><Leaf size={16} /></span><i /><span><Mountain size={16} /></span><i /><span><Compass size={16} /></span>
          </div>
          <h1>Estamos trazando tu próximo camino...</h1>
          <p>Explorando experiencias, combinando tus gustos y buscando una propuesta que se adapte a ti.</p>
          <p className="planner__wait">Esto puede tardar unos segundos. Mientras tanto, piensa en qué te gustaría descubrir.</p>
          {error ? <p className="planner__error" role="alert">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (step === "result" && draft) {
    return (
      <main className="planner">
        <section className="planner__result">
          <div className="planner__story">
            <button type="button" className="planner__back" onClick={() => setStep("form")}>
              <ArrowLeft size={15} /> Volver
            </button>
            <p className="planner__eyebrow">Tu camino personalizado</p>
            <div className="planner__cover">
              <div>
                <h1>{draft.title}</h1>
                <p className="planner__lead">{draft.summary}</p>
                <div className="planner__meta">
                  <span>{draft.date}</span>
                  <span>{draft.municipality}</span>
                  <span>{draft.people} {draft.people === 1 ? "persona" : "personas"}</span>
                  {draft.durationLabel ? <span>{draft.durationLabel}</span> : null}
                  <span>Estimado {money(draft.estimatedCop)}</span>
                </div>
              </div>
              <article className="planner__poster">
                {coverStop?.imageUrl ? <img src={mediaUrl(coverStop.imageUrl, 800)} alt="" /> : <div />}
                <div>
                  <strong>{money(draft.estimatedCop)}</strong>
                  {coverStop ? <Link to={`/explorar/${coverStop.experienceId}`}>Ver detalle</Link> : null}
                </div>
              </article>
            </div>
            <h2 className="planner__route-title">Tu recorrido</h2>
            <ol className="planner__timeline">
              {draft.stops.map((stop) => (
                <li key={`${stop.experienceId}-${stop.position}`} className="planner__stop">
                  <span className="planner__index">{stop.position}</span>
                  {stop.imageUrl ? <img src={mediaUrl(stop.imageUrl, 320)} alt="" /> : <div className="planner__photo" />}
                  <div>
                    <h2>{stop.title}</h2>
                    <p>{stop.category}</p>
                    <p>{stop.description}</p>
                    <p>
                      {stop.durationLabel ? `${stop.durationLabel} · ` : ""}
                      {stop.municipality}
                      {` · ${money(stop.price)}`}
                      {stop.suggestedAt ? ` · Sugerida ${stop.suggestedAt}` : ""}
                    </p>
                  </div>
                  <Link to={`/explorar/${stop.experienceId}`}>Ver experiencia</Link>
                </li>
              ))}
            </ol>
          </div>
          <aside>
            <div className="planner__why">
              <h2>¿Por qué este plan es para ti?</h2>
              <p>{draft.why}</p>
            </div>
            <div className="planner__actions">
              <button type="button" onClick={() => setStep("form")}>Editar preferencias</button>
              <button type="button" disabled={busy} onClick={() => void run(draft.stops.map((stop) => stop.experienceId))}>Crear otro camino</button>
              <button type="button" className="is-primary" disabled={busy || saved} onClick={() => void persist()}>{saved ? "Guardado en Mis caminos" : "Guardar este plan"}</button>
            </div>
            {error ? <p className="planner__error" role="alert">{error}</p> : null}
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="planner">
      <form className="planner__sheet" onSubmit={submit}>
        <header className="planner__head">
          <h1>Comparte tus preferencias.</h1>
          <p>Cuéntanos qué es lo más importante para tu plan y la IA encontrará las experiencias perfectas para ti.</p>
        </header>
        <div className="planner__grid">
          <section className="planner__card">
            <h2>Fechas del plan</h2>
            <p className="planner__hint">Elige el día. El carril marca el mes del plan.</p>
            <div className="planner__rail" role="group" aria-label="Mes del plan">
              {monthRail(prefs.date).map((month) => (
                <button key={month.key} type="button" className={month.on ? "is-on" : ""} onClick={() => setPrefs({ ...prefs, date: dateInMonth(prefs.date, month.key) })}>
                  {month.label}
                </button>
              ))}
            </div>
            <div className="planner__dates">
              <input type="date" min={todayBogota()} value={prefs.date} onChange={(event) => setPrefs({ ...prefs, date: event.target.value })} required />
            </div>
          </section>
          <section className="planner__card">
            <h2>Presupuesto total</h2>
            <div className="planner__budget">
              <strong>{money(prefs.budgetCop)}</strong>
              <input
                type="range"
                min={50000}
                max={2000000}
                step={10000}
                value={Math.min(2000000, Math.max(50000, prefs.budgetCop))}
                style={{ ["--fill" as string]: `${((Math.min(2000000, Math.max(50000, prefs.budgetCop)) - 50000) / 1950000) * 100}%` }}
                onChange={(event) => setPrefs({ ...prefs, budgetCop: Number(event.target.value) })}
              />
              <input type="number" min={20000} max={20000000} step={1000} value={prefs.budgetCop} onChange={(event) => setPrefs({ ...prefs, budgetCop: Number(event.target.value) })} aria-label="Presupuesto en pesos" />
            </div>
          </section>
          <section className="planner__card">
            <h2>Actividades e intereses</h2>
            <div className="planner__chips">
              {options.categories.map((category) => {
                const on = prefs.categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={on ? "is-on" : ""}
                    aria-pressed={on}
                    onClick={() => setPrefs({
                      ...prefs,
                      categoryIds: on ? prefs.categoryIds.filter((item) => item !== category.id) : [...prefs.categoryIds, category.id],
                    })}
                  >
                    <TicketCategoryIcon name={category.name} />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="planner__card">
            <h2>Tipo de plan</h2>
            <div className="planner__types">
              {PLAN_TYPES.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" className={prefs.planType === item.id ? "is-on" : ""} aria-pressed={prefs.planType === item.id} onClick={() => setPrefs({ ...prefs, planType: item.id })}>
                    <Icon strokeWidth={1.7} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="planner__card">
            <h2>Duración</h2>
            <div className="planner__choices">
              {DURATIONS.map((item) => (
                <button key={item.id} type="button" className={prefs.durationKey === item.id ? "is-on" : ""} aria-pressed={prefs.durationKey === item.id} onClick={() => setPrefs({ ...prefs, durationKey: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          <section className="planner__card">
            <h2>Municipio</h2>
            <select value={prefs.municipality} onChange={(event) => setPrefs({ ...prefs, municipality: event.target.value })} required>
              <option value="">Elige un municipio</option>
              {options.municipalities.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </section>
          <section className="planner__card">
            <h2>Participantes</h2>
            <select value={prefs.people} onChange={(event) => setPrefs({ ...prefs, people: Number(event.target.value) })}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count} {count === 1 ? "persona" : "personas"}</option>
              ))}
            </select>
          </section>
          <section className="planner__card">
            <h2>Personalizado</h2>
            <div className="planner__note">
              <textarea value={prefs.note} maxLength={400} placeholder="Escribe aquí lo que se te ocurra..." onChange={(event) => setPrefs({ ...prefs, note: event.target.value })} />
            </div>
          </section>
        </div>
        {error ? <p className="planner__error" role="alert">{error}</p> : null}
        <div className="planner__foot">
          <button type="submit" className="planner__finish" disabled={busy}>Finalizar</button>
        </div>
      </form>
    </main>
  );
}
