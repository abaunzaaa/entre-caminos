import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { AuthKeyIcon } from "../components/auth/AuthKeyIcon";
import { AI_PLAN_FOLDERS, type AiPlanFolderKey } from "../data/ai-plan-folders";
import { distinctPlanPhotoUrls, planCountLabel } from "../components/planner/AiPlanFolderCard";
import flores from "../assets/mis-caminos/carpeta-naturaleza.png";
import paleta from "../assets/mis-caminos/carpeta-cultura.png";
import camara from "../assets/mis-caminos/carpeta-sabores.png";
import lupa from "../assets/mis-caminos/carpeta-descubrimientos.png";
import { PlannerItineraryBoard } from "../components/planner/PlannerItineraryBoard";
import { PlannerLoading } from "../components/planner/PlannerLoading";
import { PlannerPreferencesForm, createPlannerPreferences, profilePlannerHints } from "../components/planner/PlannerPreferencesForm";
import { PlannerPlanCover } from "../components/planner/PlannerPlanCover";
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
import "../styles/planner.css";

const PREF_KEY = "ec-planner-prefs";
const DRAFT_KEY = "ec-planner-draft";
const FOLDER_ART: Record<AiPlanFolderKey, string> = {
  naturaleza: flores,
  cultura: paleta,
  sabores: camara,
  descubrimientos: lupa,
};

type Step = "welcome" | "form" | "making" | "cover" | "result";

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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadReady, setLoadReady] = useState(false);
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
    setLoadReady(false);
    setLoadAttempt((value) => value + 1);
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
      setLoadReady(true);
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
          kind="open"
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
          key={loadAttempt}
          error={error}
          empty={errorCode === "PLANNER_EMPTY"}
          detail={errorCode === "PLANNER_RATE_LIMIT"}
          phase={loadReady ? "ready" : "working"}
          onFinished={() => {
            setLoadReady(false);
            setStep("cover");
          }}
          onRetry={() => void run([])}
          onBack={() => {
            setError("");
            setErrorCode("");
            setLoadReady(false);
            setStep("form");
          }}
        />
      </main>
    );
  }

  if (step === "cover" && draft) {
    return (
      <main className="planner planner--cover">
        <PlannerPlanCover
          draft={draft}
          prefs={prefs}
          onBack={() => setStep("form")}
          onDetail={() => setStep("result")}
          onDiscover={(latitude, longitude) => {
            const params = new URLSearchParams({
              lat: String(latitude),
              lng: String(longitude),
              nombre: draft.municipality,
            });
            if (draft.venue?.department) params.set("depto", draft.venue.department);
            navigate(`/mapa?${params.toString()}`);
          }}
        />
      </main>
    );
  }

  if (step === "result" && draft) {
    return (
      <main className="planner planner--board">
        <PlannerItineraryBoard
          draft={draft}
          busy={busy}
          saved={saved}
          error={error}
          onBack={() => setStep("cover")}
          onEdit={() => setStep("form")}
          onSave={() => { setFolderKey(null); setFolderOpen(true); }}
        />
        {folderOpen ? (
          <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="plan-folder-title">
            <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={() => { if (!busy) setFolderOpen(false); }} />
            <div className="favorite-save-modal__panel">
              <button type="button" className="favorite-save-modal__close" aria-label="Cerrar" onClick={() => { if (!busy) setFolderOpen(false); }}>
                <X size={16} />
              </button>
              <header className="favorite-save-modal__head">
                <img className="plan-save-modal__mark" src="/mis-caminos/cartas-lazo.png" alt="" width={700} height={598} />
                <h2 id="plan-folder-title" className="favorite-save-modal__title">Guardar este plan</h2>
              </header>
              <div className="favorite-save-modal__list plan-save-list">
                {AI_PLAN_FOLDERS.map((folder) => {
                  const count = folderCounts ? folderCounts[folder.key] ?? 0 : null;
                  const photo = folderCovers?.[folder.key]?.[0];
                  return (
                    <button
                      key={folder.key}
                      type="button"
                      className={`favorite-save-modal__item${folderKey === folder.key ? " is-on" : ""}`}
                      onClick={() => setFolderKey(folder.key)}
                    >
                      <span className="favorite-save-modal__thumb">
                        {photo ? <img src={photo} alt="" /> : <img className="plan-save-list__art" src={FOLDER_ART[folder.key]} alt="" />}
                      </span>
                      <span className="favorite-save-modal__meta">
                        <strong>{folder.name}</strong>
                        <em>{count == null ? "Carpeta" : planCountLabel(count)}</em>
                      </span>
                      <span className="favorite-save-modal__check" aria-hidden="true">{folderKey === folder.key ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
              {error ? <p className="favorite-save-modal__error">{error}</p> : null}
              <div className="favorite-save-modal__actions">
                <button type="button" className="favorite-save-modal__primary" disabled={!folderKey || busy} onClick={() => folderKey && void persist(folderKey)}>Guardar este plan</button>
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
                <button type="button" className="favorite-save-modal__ghost" onClick={() => { startOver(); navigate("/explorar"); }}>Seguir explorando</button>
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
