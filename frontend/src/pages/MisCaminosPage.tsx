import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import palomaLeft from "../assets/paloma1.png";
import palomaRight from "../assets/paloma 2.png";
import {
  addJourneyMemorySticker,
  createJourneyDecoration,
  createJourneyMemory,
  createJourneyPlan,
  deleteJourneyDecoration,
  deleteJourneyMemory,
  deleteJourneyMemorySticker,
  deleteJourneyPhoto,
  deleteJourneyPlan,
  loadJourney,
  moveJourneyMemorySticker,
  updateJourneyDecoration,
  updateJourneyMemory,
  updateJourneyPlan,
  uploadJourneyPhoto,
  type JourneyDecoration,
  type JourneyMemory,
  type JourneyPlan,
  type JourneyStickerKey,
  type JourneyTheme,
  type MemoryInput,
} from "../services/journey.service";
import { ExplorerUserFooter } from "../components/explorer/ExplorerUserFooter";
import { ensureBitacoraFonts } from "../components/bitacora/fonts";
import { prefetchBitacora } from "../services/bitacora.service";
import { JourneyCalendar } from "../components/journeys/JourneyCalendar";
import { JourneyJournal, type MemorySeed } from "../components/journeys/JourneyJournal";
import { AiPlanLibrary } from "../components/planner/AiPlanLibrary";
import { JourneyNextPlans } from "../components/journeys/JourneyNextPlans";
import { JourneyUpcoming } from "../components/journeys/JourneyUpcoming";
import { listPlannerItineraries, type PlannerListItem } from "../services/planner.service";
import { getApiErrorMessage } from "../utils/api-error";
import { bogotaDay } from "../utils/journey-dates";
import { useInViewReveal } from "../hooks/useInViewReveal";
import "../styles/mis-caminos.css";

type Section = "calendario" | "proximas" | "bitacora";

function fail(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export function MisCaminosPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("calendario");
  const [loading, setLoading] = useState(true);
  const [journeyReady, setJourneyReady] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<JourneyTheme>("olive");
  const [plans, setPlans] = useState<JourneyPlan[]>([]);
  const [savedPaths, setSavedPaths] = useState<JourneyPlan[]>([]);
  const [aiPlans, setAiPlans] = useState<PlannerListItem[]>([]);
  const [decorations, setDecorations] = useState<JourneyDecoration[]>([]);
  const [memories, setMemories] = useState<JourneyMemory[]>([]);
  const [seed, setSeed] = useState<MemorySeed | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDay, setCalendarDay] = useState<string | undefined>(undefined);
  const calendarDialogRef = useRef<HTMLDivElement>(null);
  const scaleTimers = useRef<Map<string, number>>(new Map());
  const pendingScales = useRef<Map<string, number>>(new Map());
  const clearSeed = useCallback(() => setSeed(null), []);
  const { ref: heroRef, inView: heroInView } = useInViewReveal<HTMLDivElement>({ rootMargin: "0px", enterRatio: 0.12, leaveRatio: 0 });
  const { ref: closeRef, inView: closeInView } = useInViewReveal<HTMLDivElement>({ rootMargin: "0px", enterRatio: 0.16, leaveRatio: 0 });

  useEffect(() => {
    ensureBitacoraFonts();
    prefetchBitacora();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void listPlannerItineraries()
      .then((items) => {
        if (!active) return;
        setAiPlans(items);
        setSavedPaths(
          items.flatMap((item) => {
            if (!item.primaryExperienceId) return [];
            return [{
              id: `planner-${item.id}`,
              plannerItineraryId: item.id,
              plannedAt: `${item.date.slice(0, 10)}T23:59:00-05:00`,
              experience: {
                id: item.primaryExperienceId,
                title: item.title,
                imageUrl: item.imageUrl ?? null,
                location: item.municipality,
                description: item.summary,
                category: item.category || "Plan",
                price: item.estimatedCop,
                currency: item.currency,
              },
            }];
          }),
        );
      })
      .catch(() => {
        if (active) {
          setSavedPaths([]);
          setAiPlans([]);
        }
      });
    void loadJourney()
      .then((bundle) => {
        if (!active) {
          return;
        }
        setTheme(bundle.board.theme);
        setPlans(bundle.plans);
        setDecorations(bundle.decorations);
        setMemories(bundle.memories);
        setJourneyReady(true);
      })
      .catch((reason) => {
        if (active) {
          setError(getApiErrorMessage(reason, "No pudimos abrir tu calendario."));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadNonce]);

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const dialog = calendarDialogRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCalendarOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) {
        return;
      }
      const nodes = [...dialog.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select")].filter((node) => !node.hasAttribute("disabled"));
      if (!nodes.length) {
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      pendingScales.current.forEach((scale, id) => {
        const timer = scaleTimers.current.get(id);
        if (timer) {
          window.clearTimeout(timer);
        }
        void updateJourneyDecoration(id, { rotation: scale }).catch(() => undefined);
      });
      pendingScales.current.clear();
      scaleTimers.current.clear();
      previous?.focus();
    };
  }, [calendarOpen]);

  function openCalendar(day?: string) {
    setCalendarDay(day);
    setCalendarOpen(true);
  }

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function createPlan(experienceId: string, plannedAt: string) {
    try {
      const plan = await createJourneyPlan({ experienceId, plannedAt });
      setPlans((current) => [...current, plan].sort((a, b) => a.plannedAt.localeCompare(b.plannedAt)));
      setNotice("Plan guardado");
    } catch (reason) {
      fail(reason, "No pudimos guardar el plan.");
    }
  }

  async function updatePlan(planId: string, plannedAt: string) {
    try {
      const plan = await updateJourneyPlan(planId, plannedAt);
      setPlans((current) => current.map((item) => (item.id === planId ? plan : item)).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt)));
      setNotice("Plan actualizado");
    } catch (reason) {
      fail(reason, "No pudimos reprogramar el plan.");
    }
  }

  async function removePlan(planId: string) {
    try {
      await deleteJourneyPlan(planId);
      setPlans((current) => current.filter((item) => item.id !== planId));
      setNotice("Plan retirado");
    } catch (reason) {
      setError(getApiErrorMessage(reason, "No pudimos retirar el plan."));
    }
  }

  async function decorate(input: {
    kind: "sticker" | "note" | "fill";
    stickerKey?: JourneyStickerKey;
    text?: string;
    day?: string;
    color?: string;
    x?: number;
    y?: number;
    rotation?: number;
  }) {
    try {
      const decoration = await createJourneyDecoration({
        ...input,
        x: input.x ?? 28,
        y: input.y ?? 46,
        rotation: input.rotation ?? (input.kind === "sticker" ? 1 : 0),
      });
      setDecorations((current) => [...current, decoration]);
      setNotice("Decoración guardada");
      return decoration;
    } catch (reason) {
      setError(getApiErrorMessage(reason, "No pudimos guardar la decoración."));
      return null;
    }
  }

  function moveDecoration(id: string, x: number, y: number) {
    setDecorations((current) => current.map((item) => (item.id === id ? { ...item, x, y } : item)));
  }

  async function commitDecoration(id: string, x: number, y: number) {
    const item = decorations.find((decoration) => decoration.id === id);
    try {
      await updateJourneyDecoration(id, { x, y, rotation: item?.rotation ?? 0 });
    } catch (reason) {
      setError(getApiErrorMessage(reason, "No pudimos guardar la posición."));
    }
  }

  async function shiftDecoration(id: string, day: string, x: number, y: number) {
    const previous = decorations.find((item) => item.id === id);
    setDecorations((current) => current.map((item) => (item.id === id ? { ...item, day, x, y } : item)));
    try {
      await updateJourneyDecoration(id, { day, x, y });
    } catch (reason) {
      if (previous) {
        setDecorations((current) => current.map((item) => (item.id === id ? previous : item)));
      }
      setError(getApiErrorMessage(reason, "No pudimos mover la decoración."));
    }
  }

  function updateNote(id: string, text: string, color: string) {
    setDecorations((current) => current.map((item) => (item.id === id ? { ...item, text, color } : item)));
    void updateJourneyDecoration(id, { text, color }).catch((reason) => {
      setError(getApiErrorMessage(reason, "No pudimos guardar la nota."));
    });
  }

  function scaleDecoration(id: string, scale: number) {
    setDecorations((current) => current.map((item) => (item.id === id ? { ...item, rotation: scale } : item)));
    pendingScales.current.set(id, scale);
    const previous = scaleTimers.current.get(id);
    if (previous) {
      window.clearTimeout(previous);
    }
    scaleTimers.current.set(
      id,
      window.setTimeout(() => {
        pendingScales.current.delete(id);
        scaleTimers.current.delete(id);
        void updateJourneyDecoration(id, { rotation: scale }).catch((reason) => {
          setError(getApiErrorMessage(reason, "No pudimos guardar el tamaño."));
        });
      }, 450),
    );
  }

  async function recolorDecoration(id: string, color: string) {
    const previous = decorations.find((item) => item.id === id)?.color ?? null;
    setDecorations((current) => current.map((item) => (item.id === id ? { ...item, color } : item)));
    try {
      await updateJourneyDecoration(id, { color });
    } catch (reason) {
      setDecorations((current) => current.map((item) => (item.id === id ? { ...item, color: previous } : item)));
      setError(getApiErrorMessage(reason, "No pudimos guardar el color."));
    }
  }

  async function removeDecoration(id: string) {
    try {
      await deleteJourneyDecoration(id);
      setDecorations((current) => current.filter((item) => item.id !== id));
    } catch (reason) {
      setError(getApiErrorMessage(reason, "No pudimos quitar la decoración."));
    }
  }

  async function saveMemory(memoryId: string | null, input: MemoryInput) {
    try {
      const memory = memoryId ? await updateJourneyMemory(memoryId, input) : await createJourneyMemory(input);
      setMemories((current) => {
        const rest = current.filter((item) => item.id !== memory.id);
        return [memory, ...rest];
      });
      setNotice("Recuerdo guardado");
      return memory;
    } catch (reason) {
      fail(reason, "No pudimos guardar el recuerdo.");
    }
  }

  async function removeMemory(memoryId: string) {
    await deleteJourneyMemory(memoryId);
    setMemories((current) => current.filter((item) => item.id !== memoryId));
    setNotice("Recuerdo eliminado");
  }

  async function uploadPhoto(memoryId: string, file: File) {
    const photo = await uploadJourneyPhoto(memoryId, file);
    setMemories((current) => current.map((item) => (item.id === memoryId ? { ...item, photos: [...item.photos, photo] } : item)));
  }

  async function removePhoto(memoryId: string, photoId: string) {
    await deleteJourneyPhoto(memoryId, photoId);
    setMemories((current) => current.map((item) => (item.id === memoryId ? { ...item, photos: item.photos.filter((photo) => photo.id !== photoId) } : item)));
  }

  async function addSticker(memoryId: string, stickerKey: JourneyStickerKey) {
    const sticker = await addJourneyMemorySticker(memoryId, stickerKey);
    setMemories((current) => current.map((item) => (item.id === memoryId ? { ...item, stickers: [...item.stickers, sticker] } : item)));
  }

  async function moveSticker(memoryId: string, stickerId: string, stickerKey: string, x: number, y: number, rotation: number) {
    const sticker = await moveJourneyMemorySticker(memoryId, stickerId, stickerKey, x, y, rotation);
    setMemories((current) => current.map((item) => item.id === memoryId ? { ...item, stickers: item.stickers.map((entry) => (entry.id === stickerId ? sticker : entry)) } : item));
  }

  async function removeSticker(memoryId: string, stickerId: string) {
    await deleteJourneyMemorySticker(memoryId, stickerId);
    setMemories((current) => current.map((item) => item.id === memoryId ? { ...item, stickers: item.stickers.filter((entry) => entry.id !== stickerId) } : item));
  }

  const memoryPlanIds = new Set(memories.map((memory) => memory.planId).filter((id): id is string => Boolean(id)));

  return (
    <main className="caminos caminos--band">
      <section className="caminos-band" aria-labelledby="caminos-page-title">
        <div className="caminos-band__inner">
          <header ref={heroRef} className={`caminos-band__intro explorer-reveal-scope${heroInView ? " is-revealed" : ""}`}>
            <img
              className="caminos-band__mark explorer-reveal explorer-reveal--soft"
              src="/mis-caminos/cartas-lazo.png"
              alt=""
              width={700}
              height={598}
              style={{ "--reveal-delay": "160ms" } as CSSProperties}
            />
            <h1
              className="favorites-library__title explorer-block-title explorer-reveal explorer-reveal--title"
              id="caminos-page-title"
              style={{ "--reveal-delay": "240ms" } as CSSProperties}
            >
              Mis caminos
            </h1>
            <p
              className="favorites-library__lead explorer-block-lead explorer-reveal explorer-reveal--soft"
              style={{ "--reveal-delay": "320ms" } as CSSProperties}
            >
              Un espacio para tus planes y recuerdos
            </p>
            <button
              type="button"
              className="caminos-band__cta tourist-hero__cta explorer-reveal explorer-reveal--soft"
              style={{ "--reveal-delay": "400ms" } as CSSProperties}
              onClick={() => openCalendar()}
            >
              Abrir calendario
            </button>
          </header>

          <div className="caminos-band__plans">
            {error && !journeyReady ? (
              <div className="caminos-loadfail">
                <p className="caminos-error" role="alert">{error}</p>
                <button type="button" onClick={() => setLoadNonce((value) => value + 1)}>Reintentar</button>
              </div>
            ) : (
              <JourneyNextPlans
                plans={[...savedPaths, ...plans]}
                status={loading ? "loading" : journeyReady ? "ready" : "error"}
                onOpenDay={(day) => openCalendar(day)}
                onOpenPlanner={(planId) => navigate(`/planear-mi-plan/guardado/${planId}`)}
              />
            )}
            {error && journeyReady ? <p className="caminos-error" role="alert">{error}</p> : null}
            {notice ? <p className="caminos-saved" role="status">{notice}</p> : null}
          </div>
        </div>
      </section>

      {!loading && (section === "proximas" || section === "bitacora") ? (
        <div className="caminos-wrap caminos-panel" id="caminos-panel">
          {section === "proximas" ? (
            <JourneyUpcoming plans={plans} onUpdatePlan={updatePlan} onDeletePlan={removePlan} />
          ) : null}
          {section === "bitacora" ? (
            <JourneyJournal
              memories={memories}
              seed={seed}
              onSeedConsumed={clearSeed}
              onSave={saveMemory}
              onDelete={removeMemory}
              onUpload={uploadPhoto}
              onDeletePhoto={removePhoto}
              onAddSticker={addSticker}
              onMoveSticker={moveSticker}
              onDeleteSticker={removeSticker}
            />
          ) : null}
        </div>
      ) : null}
      <AiPlanLibrary items={aiPlans} />
      <div ref={closeRef} className={`caminos-close${closeInView ? " is-revealed" : ""}`}>
        <img className="caminos-close__dove caminos-close__dove--left" src={palomaLeft} alt="" aria-hidden="true" decoding="async" />
        <img className="caminos-close__dove caminos-close__dove--right" src={palomaRight} alt="" aria-hidden="true" decoding="async" />
        <ExplorerUserFooter />
      </div>
      {calendarOpen ? (
        <div className="caminos-planner">
          <div className="caminos-planner__backdrop" onClick={() => setCalendarOpen(false)} />
          <div
            ref={calendarDialogRef}
            className="caminos-planner__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="caminos-calendar-title"
            tabIndex={-1}
          >
            {loading && !journeyReady ? (
              <div className="caminos-cal-wait">
                <button type="button" className="caminos-calhead__close caminos-planner__dismiss" onClick={() => setCalendarOpen(false)} aria-label="Cerrar calendario">×</button>
                <span className="caminos-loading__spin" aria-hidden="true" />
                <p className="caminos-loading">Abriendo tu calendario…</p>
              </div>
            ) : null}
            {!loading && !journeyReady ? (
              <div className="caminos-cal-wait">
                <button type="button" className="caminos-calhead__close caminos-planner__dismiss" onClick={() => setCalendarOpen(false)} aria-label="Cerrar calendario">×</button>
                <p className="caminos-error" role="alert">{error || "No pudimos abrir tu calendario."}</p>
                <button type="button" onClick={() => setLoadNonce((value) => value + 1)}>Reintentar</button>
              </div>
            ) : null}
            {error && journeyReady ? <p className="caminos-error" role="alert">{error}</p> : null}
            {journeyReady ? (
              <JourneyCalendar
                plans={plans}
                decorations={decorations}
                theme={theme}
                memoryPlanIds={memoryPlanIds}
                initialDay={calendarDay}
                onCreatePlan={createPlan}
                onUpdatePlan={updatePlan}
                onDeletePlan={removePlan}
                onDecorate={decorate}
                onMoveDecoration={moveDecoration}
                onCommitDecoration={commitDecoration}
                onShiftDecoration={shiftDecoration}
                onScaleDecoration={scaleDecoration}
                onDeleteDecoration={removeDecoration}
                onRecolorDecoration={recolorDecoration}
                onUpdateNote={updateNote}
                onRemember={(plan) => {
                  setSeed({
                    title: plan.experience.title,
                    happenedOn: bogotaDay(plan.plannedAt),
                    experienceId: plan.experience.id,
                    planId: plan.id,
                    location: plan.experience.location,
                  });
                  setCalendarOpen(false);
                  setSection("bitacora");
                }}
                onClose={() => setCalendarOpen(false)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
