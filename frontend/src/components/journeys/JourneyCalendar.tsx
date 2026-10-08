import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PLANNER_STICKERS, STICKER_GROUPS, StickerArt } from "./StickerArt";
import {
  bogotaClock,
  bogotaDay,
  bogotaTimeValue,
  bogotaToday,
  longDay,
  monthCells,
  monthTitle,
  toPlannedAt,
  weekDays,
  weekdayShort,
} from "../../utils/journey-dates";
import { mediaUrl } from "../../utils/media";
import {
  searchJourneyCatalog,
  type JourneyDecoration,
  type JourneyExperience,
  type JourneyPlan,
  type JourneyStickerKey,
  type JourneyTheme,
} from "../../services/journey.service";

const THEMES: Array<{ id: JourneyTheme; label: string }> = [
  { id: "cream", label: "Marfil" },
  { id: "sand", label: "Papel" },
  { id: "olive", label: "Oliva" },
  { id: "sage", label: "Salvia" },
];

const NOTE_STYLES = [
  { id: "ink", label: "Tinta" },
  { id: "script", label: "Manuscrita" },
  { id: "tape", label: "Cinta" },
];

type Dialog = { mode: "create"; day: string } | { mode: "edit"; plan: JourneyPlan };

function clamp(value: number) {
  return Math.min(82, Math.max(4, value));
}

function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function JourneyCalendar({
  plans,
  decorations,
  theme,
  memoryPlanIds,
  onTheme,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onDecorate,
  onMoveDecoration,
  onCommitDecoration,
  onDeleteDecoration,
  onUpdateNote,
  onRemember,
}: {
  plans: JourneyPlan[];
  decorations: JourneyDecoration[];
  theme: JourneyTheme;
  memoryPlanIds: Set<string>;
  onTheme: (theme: JourneyTheme) => void;
  onCreatePlan: (experienceId: string, plannedAt: string) => Promise<void>;
  onUpdatePlan: (planId: string, plannedAt: string) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onDecorate: (input: { kind: "sticker" | "note"; stickerKey?: JourneyStickerKey; text?: string; day?: string; color?: string; x?: number; y?: number }) => Promise<void>;
  onMoveDecoration: (id: string, x: number, y: number) => void;
  onCommitDecoration: (id: string, x: number, y: number) => Promise<void>;
  onDeleteDecoration: (id: string) => Promise<void>;
  onUpdateNote: (id: string, text: string, color: string) => void;
  onRemember: (plan: JourneyPlan) => void;
}) {
  const today = bogotaToday();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<"month" | "week">("month");
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [experienceId, setExperienceId] = useState("");
  const [time, setTime] = useState("09:00");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<JourneyExperience[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [note, setNote] = useState("");
  const [noteStyle, setNoteStyle] = useState("ink");
  const [library, setLibrary] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<string | null>(null);

  const cells = mode === "month" ? monthCells(year, month) : weekDays(selected);
  const dayPlans = plans.filter((plan) => bogotaDay(plan.plannedAt) === selected);
  const dayDecorations = decorations.filter((item) => item.day === selected || (!item.day && false));

  useEffect(() => {
    if (!dialog || dialog.mode !== "create") {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchJourneyCatalog(query, controller.signal)
        .then(setHits)
        .catch((error: { code?: string; name?: string }) => {
          if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
            return;
          }
          setHits([]);
        });
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [dialog, query]);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth() + 1);
  }

  function goToday() {
    const now = bogotaToday();
    setYear(Number(now.slice(0, 4)));
    setMonth(Number(now.slice(5, 7)));
    setSelected(now);
  }

  function openCreate() {
    setDialog({ mode: "create", day: selected });
    setExperienceId("");
    setQuery("");
    setHits([]);
    setTime("09:00");
    setFormError("");
  }

  function openEdit(plan: JourneyPlan) {
    setSelected(bogotaDay(plan.plannedAt));
    setDialog({ mode: "edit", plan });
    setTime(bogotaTimeValue(plan.plannedAt));
    setFormError("");
  }

  async function savePlan() {
    if (!dialog) {
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const day = dialog.mode === "create" ? dialog.day : selected;
      if (dialog.mode === "create") {
        if (!experienceId) {
          setFormError("Elige una experiencia del catálogo.");
          return;
        }
        await onCreatePlan(experienceId, toPlannedAt(day, time));
      } else {
        await onUpdatePlan(dialog.plan.id, toPlannedAt(selected, time));
      }
      setDialog(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos guardar el plan.");
    } finally {
      setBusy(false);
    }
  }

  function dragSticker(event: React.PointerEvent<HTMLButtonElement>, item: JourneyDecoration) {
    if (!editing) {
      return;
    }
    const cell = event.currentTarget.parentElement;
    if (!cell) {
      return;
    }
    event.stopPropagation();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const rect = cell.getBoundingClientRect();
    const origin = { x: item.x, y: item.y, cx: event.clientX, cy: event.clientY, id: event.pointerId, latestX: item.x, latestY: item.y };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== origin.id) {
        return;
      }
      origin.latestX = clamp(origin.x + ((ev.clientX - origin.cx) / rect.width) * 100);
      origin.latestY = clamp(origin.y + ((ev.clientY - origin.cy) / rect.height) * 100);
      onMoveDecoration(item.id, origin.latestX, origin.latestY);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== origin.id) {
        return;
      }
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      void onCommitDecoration(item.id, origin.latestX, origin.latestY);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  }

  const visibleDow = mode === "month" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : cells.map((day) => weekdayShort(day));

  return (
    <section className={`caminos-section${editing ? " is-editing" : ""}`} aria-labelledby="caminos-calendar-title">
      <div className="caminos-section__head">
        <div>
          <p className="caminos-kicker">Tu espacio para soñar y planear</p>
          <h2 id="caminos-calendar-title">Mi calendario</h2>
          <p className="caminos-section__lead">Dale un lugar a tus próximas aventuras.</p>
        </div>
        <div className="caminos-actions">
          <button type="button" className="caminos-btn" onClick={openCreate}>+ Añadir experiencia</button>
          <button type="button" className={`caminos-quiet${mode === "month" ? " is-on" : ""}`} onClick={() => setMode("month")}>Mes</button>
          <button type="button" className={`caminos-quiet${mode === "week" ? " is-on" : ""}`} onClick={() => setMode("week")}>Semana</button>
          <button type="button" className={`caminos-quiet${editing ? " is-on" : ""}`} aria-pressed={editing} onClick={() => setEditing((value) => !value)}>
            {editing ? "Listo" : "Personalizar"}
          </button>
        </div>
      </div>

      <div className="caminos-monthbar">
        <h3>{monthTitle(year, month)}</h3>
        <div className="caminos-monthbar__nav">
          <button type="button" aria-label="Periodo anterior" onClick={() => (mode === "month" ? shiftMonth(-1) : setSelected(shiftDay(selected, -7)))}>←</button>
          <button type="button" className="caminos-quiet" onClick={goToday}>Hoy</button>
          <button type="button" aria-label="Periodo siguiente" onClick={() => (mode === "month" ? shiftMonth(1) : setSelected(shiftDay(selected, 7)))}>→</button>
        </div>
      </div>

      {editing ? (
        <div className="caminos-actions" style={{ marginBottom: "0.8rem" }}>
          <div className="caminos-swatches" role="group" aria-label="Papel del planner">
            {THEMES.map((item) => (
              <button key={item.id} type="button" className={`caminos-swatch caminos-swatch--${item.id}${theme === item.id ? " is-on" : ""}`} aria-label={item.label} aria-pressed={theme === item.id} onClick={() => onTheme(item.id)} />
            ))}
          </div>
          <button type="button" className="caminos-quiet" onClick={() => setLibrary((open) => !open)}>Stickers</button>
        </div>
      ) : null}

      {editing && library ? (
        <div className="caminos-library" aria-label="Biblioteca de stickers">
          {STICKER_GROUPS.map((group) => (
            <div key={group.id}>
              <h4>{group.label}</h4>
              <div className="caminos-library__row">
                {group.keys.map((key) => (
                  <button key={key} type="button" aria-label={PLANNER_STICKERS.find((item) => item.key === key)?.label} onClick={() => void onDecorate({ kind: "sticker", stickerKey: key, day: selected, x: 18, y: 42 })}>
                    <StickerArt stickerKey={key} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className={`caminos-grid caminos-board--${theme}${mode === "week" ? " is-week" : ""}`}>
        {visibleDow.map((label) => (
          <span key={label} className="caminos-dow">{label}</span>
        ))}
        {cells.map((day) => {
          const items = plans.filter((plan) => bogotaDay(plan.plannedAt) === day);
          const notes = decorations.filter((item) => item.kind === "note" && item.day === day);
          const stickers = decorations.filter((item) => item.kind !== "note" && item.day === day);
          const outside = mode === "month" && Number(day.slice(5, 7)) !== month;
          return (
            <div key={day} className={`caminos-day${day === selected ? " is-selected" : ""}${day === today ? " is-today" : ""}${outside ? " is-out" : ""}`}>
              <button type="button" className="caminos-day__num" aria-pressed={day === selected} aria-label={longDay(day)} onClick={() => { setSelected(day); setDialog(null); }}>
                {Number(day.slice(8))}
              </button>
              {items[0] ? <img className="caminos-day__shot" src={mediaUrl(items[0].experience.imageUrl, 96)} alt="" loading="lazy" /> : null}
              {items.length > 1 ? <span className="caminos-day__note">+{items.length - 1}</span> : null}
              {notes[0] ? <span className={`caminos-day__note is-${notes[0].color || "ink"}`}>{notes[0].text}</span> : null}
              {stickers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="caminos-day__sticker"
                  style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  aria-label="Sticker del día"
                  onPointerDown={(event) => dragSticker(event, item)}
                >
                  <StickerArt stickerKey={item.stickerKey ?? "leaf"} />
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <aside className="caminos-panel" aria-label="Día seleccionado">
        <h3>{longDay(selected)}</h3>
        <p>{editing ? "Estás personalizando este día." : "Consulta el día o añade una experiencia."}</p>
        {dayPlans.length === 0 ? <p>Este día todavía no tiene planes.</p> : null}
        <ul className="caminos-daylist">
          {dayPlans.map((plan) => (
            <li key={plan.id}>
              <img src={mediaUrl(plan.experience.imageUrl, 160)} alt="" loading="lazy" />
              <div>
                <strong>{plan.experience.title}</strong>
                <span>{bogotaClock(plan.plannedAt)} · {plan.experience.location}</span>
                <div className="caminos-inline">
                  {plan.experience.status === "PUBLISHED" ? <Link to={`/explorar/${plan.experience.id}`}>Ver experiencia</Link> : null}
                  <button type="button" onClick={() => openEdit(plan)}>Reprogramar</button>
                  <button type="button" onClick={() => setPendingDelete(plan.id)}>Quitar</button>
                  {bogotaDay(plan.plannedAt) < today && !memoryPlanIds.has(plan.id) ? (
                    <button type="button" onClick={() => onRemember(plan)}>Crear recuerdo</button>
                  ) : null}
                </div>
                {pendingDelete === plan.id ? (
                  <div className="caminos-confirm">
                    <p>¿Retirar este plan? No es una reserva.</p>
                    <div className="caminos-inline">
                      <button type="button" onClick={() => setPendingDelete(null)}>Cancelar</button>
                      <button type="button" onClick={() => { void onDeletePlan(plan.id).then(() => setPendingDelete(null)); }}>Retirar</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {editing ? (
          <form onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; void onDecorate({ kind: "note", text: note.trim(), day: selected, color: noteStyle, x: 8, y: 62 }).then(() => setNote("")); }}>
            <label htmlFor="caminos-note">Nota de este día
              <textarea id="caminos-note" maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <div className="caminos-note-styles">
              {NOTE_STYLES.map((style) => (
                <label key={style.id}><input type="radio" name="note-style" checked={noteStyle === style.id} onChange={() => setNoteStyle(style.id)} /> {style.label}</label>
              ))}
            </div>
            <button type="submit" className="caminos-quiet">Guardar nota</button>
          </form>
        ) : null}

        {editing ? dayDecorations.filter((item) => item.kind === "note").map((item) => (
          <div key={item.id}>
            {noteEdit === item.id ? (
              <form onSubmit={(event) => { event.preventDefault(); const field = event.currentTarget.elements.namedItem("text"); const value = field instanceof HTMLTextAreaElement ? field.value.trim() : ""; if (value) onUpdateNote(item.id, value, item.color || "ink"); setNoteEdit(null); }}>
                <label>Editar nota<textarea name="text" defaultValue={item.text ?? ""} maxLength={280} /></label>
                <button type="submit" className="caminos-quiet">Guardar</button>
              </form>
            ) : (
              <div className="caminos-inline">
                <span>{item.text}</span>
                <button type="button" onClick={() => setNoteEdit(item.id)}>Editar</button>
                <button type="button" onClick={() => void onDeleteDecoration(item.id)}>Eliminar</button>
              </div>
            )}
          </div>
        )) : null}

        {dialog ? (
          <form className="caminos-sheet" onSubmit={(event) => { event.preventDefault(); void savePlan(); }}>
            <h3>{dialog.mode === "create" ? "Añadir experiencia" : "Reprogramar"}</h3>
            <p>Es un plan personal, no una reserva.</p>
            {dialog.mode === "edit" ? <p>{dialog.plan.experience.title}</p> : null}
            <label>Fecha
              <input type="date" value={dialog.mode === "create" ? dialog.day : selected} onChange={(event) => {
                const value = event.target.value;
                setSelected(value);
                if (dialog.mode === "create") {
                  setDialog({ mode: "create", day: value });
                }
              }} required />
            </label>
            <label>Hora<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
            {dialog.mode === "create" ? (
              <>
                <label htmlFor="caminos-search">Buscar en el catálogo</label>
                <input id="caminos-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o lugar" />
                <ul className="caminos-hits">
                  {hits.map((item) => (
                    <li key={item.id}>
                      <button type="button" className={experienceId === item.id ? "is-on" : ""} onClick={() => setExperienceId(item.id)}>
                        <img src={mediaUrl(item.imageUrl, 120)} alt="" loading="lazy" />
                        <span><strong>{item.title}</strong><small>{item.category} · {item.location}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {formError ? <p className="caminos-error">{formError}</p> : null}
            <div className="caminos-inline">
              <button type="button" onClick={() => setDialog(null)} disabled={busy}>Cancelar</button>
              <button type="submit" className="caminos-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar plan"}</button>
            </div>
          </form>
        ) : (
          <button type="button" className="caminos-quiet" onClick={openCreate}>Añadir experiencia a este día</button>
        )}
      </aside>
    </section>
  );
}
