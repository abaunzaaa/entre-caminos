import { useCallback, useEffect, useState } from "react";
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
  saveJourneyTheme,
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
import { JourneyCalendar } from "../components/journeys/JourneyCalendar";
import { JourneyJournal, type MemorySeed } from "../components/journeys/JourneyJournal";
import { JourneyUpcoming } from "../components/journeys/JourneyUpcoming";
import { getPublicExperiences } from "../services/catalog.service";
import type { Experience } from "../types";
import { getApiErrorMessage } from "../utils/api-error";
import { bogotaDay } from "../utils/journey-dates";
import { mediaUrl } from "../utils/media";
import "../styles/mis-caminos.css";

type Section = "calendario" | "proximas" | "bitacora";

type IntroPhotos = {
  upcoming: string;
  journal: string;
};

function coverText(experience: Experience) {
  return `${experience.title} ${(experience.categories ?? []).map((category) => category.name).join(" ")}`.toLowerCase();
}

function takePhoto(list: Experience[], words: string[], width: number) {
  const found = list.find((item) => item.imageUrl && words.some((word) => coverText(item).includes(word)));
  return found?.imageUrl ? mediaUrl(found.imageUrl, width) : "";
}

function fail(error: unknown, fallback: string): never {
  throw new Error(getApiErrorMessage(error, fallback));
}

export function MisCaminosPage() {
  const [section, setSection] = useState<Section>("calendario");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<JourneyTheme>("olive");
  const [plans, setPlans] = useState<JourneyPlan[]>([]);
  const [decorations, setDecorations] = useState<JourneyDecoration[]>([]);
  const [memories, setMemories] = useState<JourneyMemory[]>([]);
  const [seed, setSeed] = useState<MemorySeed | null>(null);
  const [photos, setPhotos] = useState<IntroPhotos>({ upcoming: "", journal: "" });
  const clearSeed = useCallback(() => setSeed(null), []);

  useEffect(() => {
    let active = true;
    void loadJourney()
      .then((bundle) => {
        if (!active) {
          return;
        }
        setTheme(bundle.board.theme);
        setPlans(bundle.plans);
        setDecorations(bundle.decorations);
        setMemories(bundle.memories);
      })
      .catch((reason) => {
        if (active) {
          setError(getApiErrorMessage(reason, "No pudimos abrir Mis caminos."));
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
  }, []);

  useEffect(() => {
    let active = true;
    void getPublicExperiences({ limit: 18, offset: 0 })
      .then((result) => {
        if (!active) {
          return;
        }
        const list = result.experiences;
        setPhotos({
          upcoming: takePhoto(list, ["cabalgata"], 1200),
          journal: takePhoto(list, ["gastronómica", "gastronomica"], 1200),
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function openSection(next: Section) {
    setSection(next);
    window.requestAnimationFrame(() => {
      const panel = document.getElementById("caminos-panel");
      if (!panel) {
        return;
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
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

  async function changeTheme(next: JourneyTheme) {
    const previous = theme;
    setTheme(next);
    try {
      await saveJourneyTheme(next);
      setNotice("Estilo guardado");
    } catch (reason) {
      setTheme(previous);
      setError(getApiErrorMessage(reason, "No pudimos guardar el estilo."));
    }
  }

  async function decorate(input: {
    kind: "sticker" | "note";
    stickerKey?: JourneyStickerKey;
    text?: string;
    day?: string;
    color?: string;
    x?: number;
    y?: number;
  }) {
    try {
      const decoration = await createJourneyDecoration({
        ...input,
        x: input.x ?? 28,
        y: input.y ?? 46,
        rotation: input.kind === "note" ? 0 : -6,
      });
      setDecorations((current) => [...current, decoration]);
      setNotice("Decoración guardada");
    } catch (reason) {
      setError(getApiErrorMessage(reason, "No pudimos guardar la decoración."));
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
    <main className="caminos">
      <section className="caminos-intro" aria-label="Mis caminos">
        <div className="caminos-wrap">
          <div className="caminos-hero">
            <div className="caminos-hero__stage">
              <figure className="caminos-hero__base">
                <img src="/mis-caminos/flores.jpg" alt="" />
              </figure>
              <figure className="caminos-hero__photo">
                <img src="/mis-caminos/caminata.jpg" alt="Grupo caminando por un sendero entre montañas" />
              </figure>
            </div>
            <div className="caminos-hero__copy">
              <h1>Mis caminos</h1>
              <p className="caminos-hero__lead">Un espacio para tus planes y recuerdos</p>
              <button type="button" className="tourist-hero__cta" onClick={() => openSection("calendario")}>
                Ver mi calendario
              </button>
            </div>
          </div>

          <div className="caminos-space">
            <p className="caminos-space__mark">mi espacio</p>
            <h2>Todo lo que vives también merece un lugar</h2>
            <div className="caminos-space__grid">
              <article>
                <figure>
                  {photos.upcoming ? <img src={photos.upcoming} alt="Cabalgata entre montañas" /> : null}
                </figure>
                <h3>Próximas aventuras</h3>
                <p>Revisa tus próximas experiencias y prepárate para lo que viene.</p>
                <button type="button" className="explorer-empty__cta" onClick={() => openSection("proximas")}>
                  Ver próximas aventuras
                </button>
              </article>
              <article>
                <figure>
                  {photos.journal ? <img src={photos.journal} alt="Mesa compartida de una ruta gastronómica" /> : null}
                </figure>
                <h3>Mi bitácora</h3>
                <p>Guarda recuerdos, fotos y notas para que cada plan siga contando una historia.</p>
                <button type="button" className="explorer-empty__cta" onClick={() => openSection("bitacora")}>
                  Abrir bitácora
                </button>
              </article>
            </div>
          </div>
        </div>
      </section>

      <div className="caminos-wrap" id="caminos-panel">
        {error ? <p className="caminos-error" role="alert">{error}</p> : null}
        {notice ? <p className="caminos-saved" role="status">{notice}</p> : null}
        {loading ? <p className="caminos-loading">Abriendo tu planner…</p> : null}

        {!loading && section === "calendario" ? (
          <div className="caminos-layout">
            <JourneyCalendar
              plans={plans}
              decorations={decorations}
              theme={theme}
              memoryPlanIds={memoryPlanIds}
              onTheme={(next) => void changeTheme(next)}
              onCreatePlan={createPlan}
              onUpdatePlan={updatePlan}
              onDeletePlan={removePlan}
              onDecorate={decorate}
              onMoveDecoration={moveDecoration}
              onCommitDecoration={commitDecoration}
              onDeleteDecoration={removeDecoration}
              onUpdateNote={(id, text, color) => {
                void updateJourneyDecoration(id, { text, color }).then((decoration) => {
                  setDecorations((current) => current.map((item) => (item.id === id ? { ...item, text: decoration.text, color: decoration.color } : item)));
                  setNotice("Nota actualizada");
                }).catch((reason) => setError(getApiErrorMessage(reason, "No pudimos guardar la nota.")));
              }}
              onRemember={(plan) => {
                setSeed({
                  title: plan.experience.title,
                  happenedOn: bogotaDay(plan.plannedAt),
                  experienceId: plan.experience.id,
                  planId: plan.id,
                  location: plan.experience.location,
                });
                setSection("bitacora");
              }}
            />
            <JourneyUpcoming plans={plans} compact onUpdatePlan={updatePlan} onDeletePlan={removePlan} onOpenAll={() => setSection("proximas")} />
          </div>
        ) : null}

        {!loading && section === "proximas" ? (
          <JourneyUpcoming plans={plans} onUpdatePlan={updatePlan} onDeletePlan={removePlan} />
        ) : null}

        {!loading && section === "bitacora" ? (
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
    </main>
  );
}
