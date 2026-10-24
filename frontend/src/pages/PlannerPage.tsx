import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Calendar, Clock, Lightbulb, MapPin, Plus, SlidersHorizontal, X } from "lucide-react";
import { AuthKeyIcon } from "../components/auth/AuthKeyIcon";
import { AI_PLAN_FOLDERS, type AiPlanFolderKey } from "../data/ai-plan-folders";
import { AiPlanFolderCard, distinctPlanPhotoUrls } from "../components/planner/AiPlanFolderCard";
import { PlannerLoading } from "../components/planner/PlannerLoading";
import { PlannerPreferencesForm, createPlannerPreferences, profilePlannerHints } from "../components/planner/PlannerPreferencesForm";
import { PlannerWelcome } from "../components/planner/PlannerWelcome";
import { useAuth } from "../hooks/useAuth";
import {
  generatePlanner,
  listPlannerItineraries,
  loadPlannerItinerary,
  loadPlannerOptions,
  savePlanner,
  type PlannerItinerary,
  type PlannerPreferences,
} from "../services/planner.service";
import { getApiErrorCode, getApiErrorMessage } from "../utils/api-error";
import { mediaUrl } from "../utils/media";
import "../styles/planner.css";

const PREF_KEY = "ec-planner-prefs";
const DRAFT_KEY = "ec-planner-draft";

type Step = "welcome" | "form" | "making" | "result";

function money(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function planDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function stopWhen(stop: { suggestedAt: string; suggestedEnd?: string }) {
  if (stop.suggestedAt && stop.suggestedEnd) return `${stop.suggestedAt} – ${stop.suggestedEnd}`;
  if (stop.suggestedAt) return stop.suggestedAt;
  return "Horario flexible";
}

function stopKind(stop: { stopType?: string; included?: boolean; additionalCost?: string }) {
  if (stop.stopType === "suggestion" || stop.included === false) {
    return stop.additionalCost ? "Sugerido por IA · Costo adicional" : "Sugerido por IA";
  }
  return "Incluido en la experiencia";
}

function stopLength(stop: { durationMinutes?: number | null; durationLabel?: string | null }) {
  const minutes = stop.durationMinutes ?? 0;
  if (minutes <= 0) return stop.durationLabel || "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return hours === 1 ? "1 h" : `${hours} h`;
  return `${rest} min`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function PlannerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(id ? "result" : "welcome");
  const [prefs, setPrefs] = useState<PlannerPreferences>(() => createPlannerPreferences(null));
  const [draft, setDraft] = useState<PlannerItinerary | null>(() => readJson<PlannerItinerary>(DRAFT_KEY));
  const [options, setOptions] = useState<{ categories: { id: string; name: string }[]; municipalities: string[] }>({ categories: [], municipalities: [] });
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderKey, setFolderKey] = useState<AiPlanFolderKey | null>(null);
  const [folderCounts, setFolderCounts] = useState<Partial<Record<AiPlanFolderKey, number>> | null>(null);
  const [folderCovers, setFolderCovers] = useState<Partial<Record<AiPlanFolderKey, string[]>> | null>(null);
  const [openTry, setOpenTry] = useState(0);
  const runLock = useRef(false);

  useEffect(() => {
    if (!folderOpen) return;
    let alive = true;
    listPlannerItineraries()
      .then((rows) => {
        if (!alive) return;
        const counts: Record<AiPlanFolderKey, number> = {
          naturaleza: 0,
          cultura: 0,
          sabores: 0,
          descubrimientos: 0,
        };
        const groups: Record<AiPlanFolderKey, { imageUrl?: string | null }[]> = {
          naturaleza: [],
          cultura: [],
          sabores: [],
          descubrimientos: [],
        };
        for (const row of rows) {
          const key = AI_PLAN_FOLDERS.some((folder) => folder.key === row.folderKey) ? row.folderKey! : "descubrimientos";
          counts[key] += 1;
          groups[key].push(row);
        }
        setFolderCounts(counts);
        setFolderCovers({
          naturaleza: distinctPlanPhotoUrls(groups.naturaleza),
          cultura: distinctPlanPhotoUrls(groups.cultura),
          sabores: distinctPlanPhotoUrls(groups.sabores),
          descubrimientos: distinctPlanPhotoUrls(groups.descubrimientos),
        });
      })
      .catch(() => {
        if (alive) {
          setFolderCounts(null);
          setFolderCovers(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [folderOpen]);

  useEffect(() => {
    let alive = true;
    loadPlannerOptions()
      .then((data) => {
        if (!alive) return;
        setOptions(data);
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
        setPrefs((current) => createPlannerPreferences({
          date: data.date.slice(0, 10),
          municipality: data.municipality,
          durationKey: data.durationKey,
          budgetCop: data.budgetCop,
          note: data.note,
          interests: current.touched && current.municipality === data.municipality ? current.interests : [],
          budgetChosen: true,
          touched: true,
        }));
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
  }, [id, openTry]);

  const cover = useMemo(() => draft?.coverImageUrl || draft?.stops.find((stop) => stop.imageUrl)?.imageUrl || null, [draft]);

  function remember(nextPrefs: PlannerPreferences, nextDraft: PlannerItinerary | null) {
    sessionStorage.setItem(PREF_KEY, JSON.stringify(nextPrefs));
    if (nextDraft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft));
  }

  async function run(avoid: string[]) {
    if (runLock.current) return;
    runLock.current = true;
    setError("");
    setErrorCode("");
    setBusy(true);
    setStep("making");
    const previous = draft;
    try {
      const next = await generatePlanner(
        { ...prefs, categoryIds: [], environments: [], companion: "", people: 1 },
        avoid,
        profilePlannerHints(user?.profile),
      );
      setDraft(next);
      setSaved(false);
      remember(prefs, next);
      setStep("result");
    } catch (err) {
      setErrorCode(getApiErrorCode(err));
      setError(getApiErrorMessage(err, "No pudimos trazar tu camino. Inténtalo de nuevo."));
      if (previous && avoid.length) {
        setDraft(previous);
        setStep("result");
      } else {
        setStep("making");
      }
    } finally {
      runLock.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    sessionStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  async function persist(chosen: AiPlanFolderKey) {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const stored = await savePlanner(draft, prefs, chosen);
      setDraft(stored);
      setSaved(true);
      setFolderOpen(false);
      remember(prefs, stored);
      setSavedOpen(true);
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

  function startOver() {
    const clean = createPlannerPreferences(null);
    setPrefs(clean);
    setDraft(null);
    setSaved(false);
    setSavedOpen(false);
    setError("");
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.setItem(PREF_KEY, JSON.stringify(clean));
    setStep("welcome");
    if (id) navigate("/planear-mi-plan", { replace: true });
  }

  if (id && !draft) {
    return (
      <main className="planner planner--making">
        <PlannerLoading
          error={error}
          empty={false}
          onRetry={() => {
            setError("");
            setOpenTry((value) => value + 1);
          }}
          onBack={() => navigate("/planear-mi-plan")}
        />
      </main>
    );
  }

  if (step === "making") {
    return (
      <main className="planner planner--making">
        <PlannerLoading
          error={error}
          empty={errorCode === "PLANNER_EMPTY"}
          onRetry={() => void run([])}
          onBack={() => {
            setError("");
            setErrorCode("");
            setStep("form");
          }}
        />
      </main>
    );
  }

  if (step === "result" && draft) {
    return (
      <main className="planner planner--result">
        <section className="plan-view">
          <div className="plan-view__head">
          <div className="plan-view__top">
            <button type="button" className="plan-view__back" aria-label="Volver" onClick={() => setStep("form")}>
              <ArrowLeft size={16} strokeWidth={1.8} />
            </button>
            <div className="plan-view__hero">
              <div>
                <p className="plan-view__kicker">Tu camino personalizado</p>
                <h1>{draft.title}</h1>
                <p className="plan-view__lead">{draft.summary}</p>
              </div>
              <div className="plan-view__photo">
                {cover ? <img src={mediaUrl(cover, 960)} alt="" /> : <span />}
              </div>
            </div>
          </div>
          {draft.alternativeMessage ? <p className="plan-view__alt">{draft.alternativeMessage}</p> : null}
          <div className="plan-view__facts">
            <article>
              <Calendar size={15} strokeWidth={1.7} aria-hidden="true" />
              <span><strong>{planDate(draft.date)}</strong><small>Fecha del plan</small></span>
            </article>
            <article>
              <Clock size={15} strokeWidth={1.7} aria-hidden="true" />
              <span>
                <strong>{draft.scheduleLabel && draft.scheduleLabel !== "Horario flexible" ? draft.scheduleLabel : "Horario flexible"}</strong>
                <small>{draft.scheduleIsSuggested === false || draft.scheduleLabel === "Horario flexible" ? "Sin hora fija" : "Horario propuesto"}</small>
              </span>
            </article>
            <article>
              <MapPin size={15} strokeWidth={1.7} aria-hidden="true" />
              <span><strong>{draft.municipality}</strong><small>Municipio</small></span>
            </article>
            <article>
              <span><strong>{money(draft.estimatedCop)}</strong><small>Precio de la experiencia</small></span>
            </article>
          </div>
          </div>
          <div className="plan-view__body">
            <div className="plan-view__route-wrap">
              <h2 className="plan-view__route">Tu recorrido</h2>
              <div className="plan-view__scroll">
                <ol className="plan-view__timeline">
                  {draft.stops.map((stop) => (
                    <li key={`${stop.position}-${stop.title}`}>
                      <span className="plan-view__index">{stop.position}</span>
                      <article>
                        {stop.imageUrl ? <img src={mediaUrl(stop.imageUrl, 240)} alt="" /> : <span className="plan-view__mark" aria-hidden="true" />}
                        <div>
                          <small>{stopWhen(stop)}</small>
                          <h3>{stop.title}</h3>
                          <p>{stop.description}</p>
                        </div>
                        <p className="plan-view__meta">
                          {stopLength(stop) ? <span><Clock size={13} strokeWidth={1.7} aria-hidden="true" /> {stopLength(stop)}</span> : null}
                          <span><MapPin size={13} strokeWidth={1.7} aria-hidden="true" /> {stop.location || stop.municipality}</span>
                          <span>{stopKind(stop)}</span>
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <aside className="plan-view__aside">
            <div className="plan-view__why">
              <h2><Lightbulb size={16} strokeWidth={1.8} aria-hidden="true" /> ¿Por qué este plan es para ti?</h2>
              <p>{draft.why}</p>
            </div>
            <div className="plan-view__actions">
              <button type="button" onClick={() => setStep("form")}><SlidersHorizontal size={15} strokeWidth={1.8} /> Editar preferencias</button>
              <button type="button" className="is-solid" disabled={busy || saved} onClick={() => { setFolderKey(null); setFolderOpen(true); }}><Bookmark size={15} strokeWidth={1.8} /> {saved ? "Plan guardado" : "Guardar este plan"}</button>
              <button type="button" className="is-solid" onClick={startOver}><Plus size={15} strokeWidth={1.8} /> Crear otro camino</button>
            </div>
            {error ? <p className="planner__error" role="alert">{error}</p> : null}
          </aside>
          </div>
        </section>
        {folderOpen ? (
          <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="plan-folder-title">
            <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={() => { if (!busy) setFolderOpen(false); }} />
            <div className="favorite-save-modal__panel ai-plans-picker">
              <button type="button" className="favorite-save-modal__close" aria-label="Cerrar" onClick={() => { if (!busy) setFolderOpen(false); }}>
                <X size={16} />
              </button>
              <header className="favorite-save-modal__head">
                <AuthKeyIcon />
                <h2 id="plan-folder-title" className="favorite-save-modal__title">¿Dónde quieres guardar tu camino?</h2>
              </header>
              <p>Elige una carpeta para tener tu plan siempre a mano.</p>
              <div className="ai-plans-picker__list">
                {AI_PLAN_FOLDERS.map((folder) => (
                  <AiPlanFolderCard
                    key={folder.key}
                    folderKey={folder.key}
                    name={folder.name}
                    tone={folder.tone}
                    count={folderCounts ? folderCounts[folder.key] ?? 0 : null}
                    photos={folderCovers?.[folder.key] ?? []}
                    selected={folderKey === folder.key}
                    selectable
                    onClick={() => setFolderKey(folder.key)}
                  />
                ))}
              </div>
              <div className="favorite-save-modal__actions">
                <button type="button" className="favorite-save-modal__primary" disabled={!folderKey || busy} onClick={() => folderKey && void persist(folderKey)}>Guardar en esta carpeta</button>
                <button type="button" className="favorite-save-modal__ghost" disabled={busy} onClick={() => setFolderOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}
        {savedOpen ? (
          <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="plan-saved-title">
            <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={() => setSavedOpen(false)} />
            <div className="favorite-save-modal__panel">
              <button type="button" className="favorite-save-modal__close" aria-label="Cerrar" onClick={() => setSavedOpen(false)}>
                <X size={16} />
              </button>
              <header className="favorite-save-modal__head">
                <AuthKeyIcon />
                <h2 id="plan-saved-title" className="favorite-save-modal__title">¡Tu camino ha sido guardado!</h2>
              </header>
              <p>Lo encontrarás en Mis caminos, dentro de la carpeta que elegiste.</p>
              <div className="favorite-save-modal__actions">
                <button type="button" className="favorite-save-modal__primary" onClick={() => navigate("/mis-caminos")}>Ir a Mis caminos</button>
                <button type="button" className="favorite-save-modal__ghost" onClick={() => navigate("/explorar")}>Seguir explorando</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="planner planner--prefs">
      <PlannerPreferencesForm
        prefs={prefs}
        municipalities={options.municipalities}
        error={error}
        busy={busy}
        onChange={setPrefs}
        onSubmit={() => void run([])}
        onBack={() => setStep("welcome")}
      />
    </main>
  );
}
