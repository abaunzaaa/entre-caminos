import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PLANNER_STICKERS, StickerArt } from "./StickerArt";
import { longDay } from "../../utils/journey-dates";
import { mediaUrl } from "../../utils/media";
import {
  searchJourneyCatalog,
  type JourneyBackground,
  type JourneyExperience,
  type JourneyMemory,
  type JourneyStickerKey,
  type MemoryInput,
} from "../../services/journey.service";

const PAPERS: Array<{ id: JourneyBackground; label: string }> = [
  { id: "cream", label: "Marfil" },
  { id: "linen", label: "Lino" },
  { id: "olive", label: "Oliva" },
  { id: "pressed", label: "Rayado" },
];

const TEMPLATES: Array<{ id: string; label: string; background: JourneyBackground }> = [
  { id: "polaroid", label: "Polaroid clásico", background: "cream" },
  { id: "diario", label: "Diario de viaje", background: "linen" },
  { id: "collage", label: "Collage", background: "olive" },
  { id: "minimal", label: "Minimalista", background: "pressed" },
  { id: "romantico", label: "Cuaderno romántico", background: "cream" },
];

export type MemorySeed = {
  title: string;
  happenedOn: string;
  experienceId: string;
  planId: string;
  location: string;
};

type Draft = {
  id?: string;
  title: string;
  happenedOn: string;
  story: string;
  background: JourneyBackground;
  experienceId: string | null;
  experienceTitle: string;
  planId: string | null;
  attended: boolean;
  template: string;
};

const emptyDraft = (): Draft => ({
  title: "",
  happenedOn: "",
  story: "",
  background: "cream",
  experienceId: null,
  experienceTitle: "",
  planId: null,
  attended: false,
  template: "polaroid",
});

export function JourneyJournal({
  memories,
  seed,
  onSeedConsumed,
  onSave,
  onDelete,
  onUpload,
  onDeletePhoto,
  onAddSticker,
  onMoveSticker,
  onDeleteSticker,
}: {
  memories: JourneyMemory[];
  seed: MemorySeed | null;
  onSeedConsumed: () => void;
  onSave: (memoryId: string | null, input: MemoryInput) => Promise<JourneyMemory>;
  onDelete: (memoryId: string) => Promise<void>;
  onUpload: (memoryId: string, file: File) => Promise<void>;
  onDeletePhoto: (memoryId: string, photoId: string) => Promise<void>;
  onAddSticker: (memoryId: string, stickerKey: JourneyStickerKey) => Promise<void>;
  onMoveSticker: (memoryId: string, stickerId: string, stickerKey: string, x: number, y: number, rotation: number) => Promise<void>;
  onDeleteSticker: (memoryId: string, stickerId: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<JourneyExperience[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const open = memories.find((memory) => memory.id === openId) ?? null;
  const editingMemory = draft?.id ? memories.find((memory) => memory.id === draft.id) : open;

  useEffect(() => {
    if (!seed) {
      return;
    }
    setOpenId(null);
    setPreview(false);
    setDraft({
      title: seed.title,
      happenedOn: seed.happenedOn,
      story: "",
      background: "cream",
      experienceId: seed.experienceId,
      experienceTitle: seed.title,
      planId: seed.planId,
      attended: false,
      template: "diario",
    });
    onSeedConsumed();
  }, [seed, onSeedConsumed]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchJourneyCatalog(query, controller.signal)
        .then(setHits)
        .catch((reason: { code?: string; name?: string }) => {
          if (reason?.code === "ERR_CANCELED" || reason?.name === "CanceledError") {
            return;
          }
          setHits([]);
        });
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [draft, query]);

  async function save() {
    if (!draft) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await onSave(draft.id ?? null, {
        title: draft.title,
        happenedOn: draft.happenedOn,
        story: draft.story,
        background: draft.background,
        experienceId: draft.experienceId,
        planId: draft.planId,
        attended: draft.attended,
      });
      setDraft({ ...draft, id: saved.id });
      setOpenId(saved.id);
      setNotice("Recuerdo guardado");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos guardar el recuerdo.");
    } finally {
      setBusy(false);
    }
  }

  function dragSticker(event: React.PointerEvent<HTMLButtonElement>, memory: JourneyMemory, stickerId: string, stickerKey: string, x: number, y: number, rotation: number) {
    if (preview) {
      return;
    }
    const page = event.currentTarget.parentElement;
    if (!page) {
      return;
    }
    const rect = page.getBoundingClientRect();
    const origin = { x, y, cx: event.clientX, cy: event.clientY, pointerId: event.pointerId };
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    let next = { x, y };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== origin.pointerId) {
        return;
      }
      next = {
        x: Math.min(88, Math.max(4, origin.x + ((ev.clientX - origin.cx) / rect.width) * 100)),
        y: Math.min(88, Math.max(4, origin.y + ((ev.clientY - origin.cy) / rect.height) * 100)),
      };
      handle.style.left = `${next.x}%`;
      handle.style.top = `${next.y}%`;
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== origin.pointerId) {
        return;
      }
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      void onMoveSticker(memory.id, stickerId, stickerKey, next.x, next.y, rotation);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  }

  const paper = editingMemory?.background || draft?.background || "cream";

  return (
    <section className="caminos-section caminos-album" aria-labelledby="caminos-journal-title">
      <div className="caminos-section__head">
        <div>
          <p className="caminos-kicker">Las historias que queremos conservar</p>
          <h2 id="caminos-journal-title">Mi bitácora</h2>
          <p className="caminos-section__lead">Hay momentos que merecen quedarse para siempre.</p>
        </div>
        <button type="button" className="caminos-btn" onClick={() => { setOpenId(null); setPreview(false); setDraft(emptyDraft()); setError(""); }}>+ Crear recuerdo</button>
      </div>

      {memories.length === 0 && !draft && !open ? (
        <div className="caminos-empty">
          <p>Tu álbum está en blanco.</p>
          <button type="button" className="caminos-quiet" onClick={() => setDraft(emptyDraft())}>Escribir la primera página</button>
        </div>
      ) : null}

      {!draft ? (
        <ul className="caminos-covers">
          {memories.map((memory) => (
            <li key={memory.id}>
              <button type="button" className="caminos-album-card" onClick={() => { setDraft(null); setPreview(true); setOpenId(memory.id); }}>
                <span className="caminos-album__shot">
                  {memory.photos[0] ? <img src={mediaUrl(memory.photos[0].url, 480)} alt="" loading="lazy" /> : <StickerArt stickerKey="leaf" />}
                </span>
                <strong>{memory.title}</strong>
                <span>{longDay(memory.happenedOn)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && !draft ? (
        <article className={`caminos-spread is-${open.background}`}>
          <header>
            <p>{longDay(open.happenedOn)}</p>
            <h3>{open.title}</h3>
            <p>{open.experience ? open.experience.location : "Recuerdo libre"}</p>
          </header>
          <div className="caminos-spread__photos">
            {open.photos.map((photo) => (
              <figure key={photo.id}>
                <img src={mediaUrl(photo.url, 720)} alt="" loading="lazy" />
              </figure>
            ))}
          </div>
          {open.story ? <p className="caminos-spread__story">{open.story}</p> : null}
          {open.stickers.map((sticker) => (
            <button key={sticker.id} type="button" className="caminos-spread__sticker" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: `rotate(${sticker.rotation}deg)` }} aria-label="Sticker del álbum">
              <StickerArt stickerKey={sticker.stickerKey} />
            </button>
          ))}
          <div className="caminos-inline">
            <button type="button" onClick={() => setDraft({
              id: open.id,
              title: open.title,
              happenedOn: open.happenedOn,
              story: open.story,
              background: (PAPERS.some((paperItem) => paperItem.id === open.background) ? open.background : "cream") as JourneyBackground,
              experienceId: open.experience?.id ?? null,
              experienceTitle: open.experience?.title ?? "",
              planId: open.planId,
              attended: open.attended,
              template: "polaroid",
            })}>Editar</button>
            <button type="button" onClick={() => setConfirmId(open.id)}>Eliminar</button>
            {open.experience ? <Link to={`/explorar/${open.experience.id}`}>Ver experiencia</Link> : null}
          </div>
        </article>
      ) : null}

      {draft ? (
        <div className="caminos-editor">
          <div className="caminos-editor__bar">
            <button type="button" className="caminos-quiet" onClick={() => { setDraft(null); setPreview(false); }}>Volver</button>
            <p className="caminos-saved">{notice || (busy ? "Guardando…" : "Sin cambios pendientes")}</p>
            <button type="button" className="caminos-quiet" onClick={() => setPreview((value) => !value)}>{preview ? "Editar" : "Vista previa"}</button>
          </div>
          {preview ? null : (
            <div className="caminos-editor__tools">
              <div className="caminos-templates" aria-label="Plantillas">
                {TEMPLATES.map((template) => (
                  <button key={template.id} type="button" className={`caminos-quiet${draft.template === template.id ? " is-on" : ""}`} onClick={() => setDraft({ ...draft, template: template.id, background: template.background })}>{template.label}</button>
                ))}
              </div>
              <div className="caminos-templates" aria-label="Fondos">
                {PAPERS.map((paperItem) => (
                  <button key={paperItem.id} type="button" className={`caminos-quiet${draft.background === paperItem.id ? " is-on" : ""}`} onClick={() => setDraft({ ...draft, background: paperItem.id })}>{paperItem.label}</button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            {preview ? null : (
              <>
                <label>Título<input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label>
                <label>Fecha<input type="date" value={draft.happenedOn} onChange={(event) => setDraft({ ...draft, happenedOn: event.target.value })} required /></label>
                <label>Texto<textarea maxLength={4000} value={draft.story} onChange={(event) => setDraft({ ...draft, story: event.target.value })} /></label>
                <label>Asociar una experiencia<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el catálogo" /></label>
                {draft.experienceTitle ? <p>Asociada: {draft.experienceTitle}</p> : null}
                <ul className="caminos-hits">
                  {hits.map((item) => (
                    <li key={item.id}>
                      <button type="button" className={draft.experienceId === item.id ? "is-on" : ""} onClick={() => setDraft({ ...draft, experienceId: item.id, experienceTitle: item.title, attended: false })}>
                        <img src={mediaUrl(item.imageUrl, 96)} alt="" loading="lazy" />
                        <span><strong>{item.title}</strong></span>
                      </button>
                    </li>
                  ))}
                </ul>
                {draft.experienceId ? (
                  <label className="caminos-inline">
                    <input type="checkbox" checked={draft.attended} onChange={(event) => setDraft({ ...draft, attended: event.target.checked })} />
                    Confirmo que realicé esta experiencia
                  </label>
                ) : (
                  <button type="button" className="caminos-quiet" onClick={() => setDraft({ ...draft, experienceId: null, experienceTitle: "", planId: null, attended: false })}>Sin experiencia del catálogo</button>
                )}
              </>
            )}
            <article className={`caminos-spread is-${paper}`}>
              <header>
                <p>{draft.happenedOn ? longDay(draft.happenedOn) : "Fecha"}</p>
                <h3>{draft.title || "Sin título"}</h3>
              </header>
              <div className="caminos-spread__photos">
                {(editingMemory?.photos ?? []).map((photo) => (
                  <figure key={photo.id}>
                    <img src={mediaUrl(photo.url, 720)} alt="" loading="lazy" />
                  </figure>
                ))}
              </div>
              {draft.story ? <p className="caminos-spread__story">{draft.story}</p> : null}
              {(editingMemory?.stickers ?? []).map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  className="caminos-spread__sticker"
                  style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: `rotate(${sticker.rotation}deg)` }}
                  onPointerDown={(event) => editingMemory && dragSticker(event, editingMemory, sticker.id, sticker.stickerKey, sticker.x, sticker.y, sticker.rotation)}
                  aria-label="Mover sticker"
                >
                  <StickerArt stickerKey={sticker.stickerKey} />
                </button>
              ))}
            </article>
            {preview || !draft.id ? null : (
              <div className="caminos-editor__tools">
                <label className="caminos-btn">
                  Añadir fotografía
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file && draft.id) {
                      void onUpload(draft.id, file).then(() => setNotice("Fotografía guardada")).catch((reason) => setError(reason instanceof Error ? reason.message : "No pudimos subir la fotografía."));
                    }
                  }} />
                </label>
                {PLANNER_STICKERS.map((item) => (
                  <button key={item.key} type="button" aria-label={`Agregar ${item.label}`} onClick={() => draft.id && void onAddSticker(draft.id, item.key)}>
                    <StickerArt stickerKey={item.key} />
                  </button>
                ))}
                {(editingMemory?.photos ?? []).map((photo) => (
                  <button key={photo.id} type="button" className="caminos-quiet" onClick={() => draft.id && void onDeletePhoto(draft.id, photo.id)}>Quitar foto</button>
                ))}
                {(editingMemory?.stickers ?? []).map((sticker) => (
                  <button key={sticker.id} type="button" className="caminos-quiet" onClick={() => draft.id && void onDeleteSticker(draft.id, sticker.id)}>Quitar sticker</button>
                ))}
              </div>
            )}
            {draft.id ? null : <p>Guarda la página para subir fotografías y stickers.</p>}
            {error ? <p className="caminos-error">{error}</p> : null}
            {preview ? null : (
              <div className="caminos-inline">
                <button type="submit" className="caminos-btn" disabled={busy || Boolean(draft.experienceId && !draft.attended)}>{busy ? "Guardando…" : "Guardar"}</button>
              </div>
            )}
          </form>
        </div>
      ) : null}

      {confirmId ? (
        <div className="caminos-confirm">
          <p>¿Eliminar este recuerdo y sus fotografías?</p>
          <div className="caminos-inline">
            <button type="button" onClick={() => setConfirmId(null)}>Cancelar</button>
            <button type="button" onClick={() => { void onDelete(confirmId).then(() => { setConfirmId(null); setOpenId(null); setDraft(null); }).catch((reason) => setError(reason instanceof Error ? reason.message : "No pudimos eliminar el recuerdo.")); }}>Eliminar</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
