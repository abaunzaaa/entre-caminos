import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { COMPANY_OPTIONS, INTEREST_OPTIONS, PLACE_OPTIONS, canonicalizeInterest, isPrimaryInterest } from "../../data/onboarding";
import type { DurationKey, PlannerCompanion, PlannerPreferences } from "../../services/planner.service";

const DURATIONS: Array<{ id: DurationKey; label: string }> = [
  { id: "1-2", label: "1–2 horas" },
  { id: "3-5", label: "3–5 horas" },
  { id: "5-8", label: "5–8 horas" },
  { id: "8+", label: "Más de 8 horas" },
];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const BUDGET_MIN = 20_000;
const BUDGET_MAX = 20_000_000;
const SLIDER_MIN = 50_000;
const SLIDER_MAX = 2_000_000;
const PEOPLE_MAX = 30;

const PLACE_ALIAS: Record<string, string> = { Bosque: "Bosque / Naturaleza", Pueblos: "Pueblos mágicos" };
const COMPANION_ALIAS: Record<string, PlannerCompanion> = { "Con amigos": "Amigos", "En familia": "Familia" };

export function todayBogota() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function createPlannerPreferences(raw?: Partial<PlannerPreferences> | null): PlannerPreferences {
  const today = todayBogota();
  const people = 1;
  const blank: PlannerPreferences = {
    date: "",
    budgetCop: 300_000,
    budgetChosen: false,
    touched: false,
    categoryIds: [],
    interests: [],
    environments: [],
    companion: "",
    durationKey: "",
    municipality: "",
    people,
    note: "",
  };
  if (!raw?.touched) return blank;
  const interests = Array.isArray(raw.interests)
    ? [...new Set(raw.interests.map((item) => canonicalizeInterest(item)).filter((item) => isPrimaryInterest(item)))]
    : [];
  const budget = Number.isFinite(raw.budgetCop) ? Math.round(Number(raw.budgetCop)) : 300_000;
  const duration = DURATIONS.some((item) => item.id === raw.durationKey) ? (raw.durationKey as DurationKey) : "";
  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) && raw.date >= today ? raw.date : "";
  return {
    ...blank,
    date,
    budgetCop: budget,
    budgetChosen: raw.budgetChosen === true,
    touched: true,
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds.filter((item) => typeof item === "string") : [],
    interests,
    durationKey: duration,
    municipality: typeof raw.municipality === "string" ? raw.municipality : "",
    note: typeof raw.note === "string" ? raw.note.slice(0, 400) : "",
  };
}

export function profilePlannerHints(profile?: { places?: string[]; companions?: string[] } | null) {
  const places = new Set(PLACE_OPTIONS.map((option) => option.value));
  const companions = new Set(COMPANY_OPTIONS.map((option) => option.value));
  const profileEnvironments = [...new Set((profile?.places ?? []).map((item) => PLACE_ALIAS[item] ?? item).filter((item) => places.has(item)))];
  const profileCompanions = [...new Set((profile?.companions ?? []).map((item) => COMPANION_ALIAS[item] ?? item).filter((item): item is PlannerCompanion => companions.has(item)))];
  return { profileEnvironments, profileCompanions };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function yearMonths(year: number, activeMonth: number) {
  const today = todayBogota();
  return MONTHS.map((label, index) => {
    const month = index + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const end = `${key}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
    return {
      key,
      month,
      label: label.toUpperCase(),
      name: `${MONTH_NAMES[index]} ${year}`,
      on: month === activeMonth,
      disabled: end < today,
    };
  });
}

function validDays(year: number, month: number) {
  const today = todayBogota();
  const last = daysInMonth(year, month);
  const days: number[] = [];
  for (let day = 1; day <= last; day += 1) {
    if (isoDate(year, month, day) >= today) days.push(day);
  }
  return days;
}

function shiftDay(current: string, year: number, month: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) return { date: "", dropped: false };
  const day = Number(current.slice(8, 10));
  if (day > daysInMonth(year, month)) return { date: "", dropped: true };
  const next = isoDate(year, month, day);
  if (next < todayBogota()) return { date: "", dropped: true };
  return { date: next, dropped: false };
}

function longDate(value: string) {
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return `${day} de ${MONTH_NAMES[month - 1]} de ${value.slice(0, 4)}`;
}

function moneyDigits(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
}

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function validate(prefs: PlannerPreferences) {
  const today = todayBogota();
  if (!prefs.date) return "Selecciona una fecha.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefs.date) || prefs.date < today) {
    return "Elige una fecha de hoy en adelante.";
  }
  const [year, month, day] = prefs.date.split("-").map(Number);
  if (day < 1 || day > daysInMonth(year, month)) return "Esa fecha no existe. Elige otro día.";
  if (!prefs.budgetChosen) return "Selecciona tu presupuesto.";
  if (!Number.isInteger(prefs.budgetCop) || prefs.budgetCop < BUDGET_MIN || prefs.budgetCop > BUDGET_MAX) {
    return "El presupuesto debe estar entre $ 20.000 y $ 20.000.000 COP.";
  }
  if (!prefs.interests.length) return "Elige al menos un interés.";
  if (prefs.people < 1 || prefs.people > PEOPLE_MAX) return "La cantidad de personas debe estar entre 1 y 30.";
  if (!prefs.municipality) return "Selecciona un municipio.";
  if (!prefs.durationKey) return "Elige la duración del plan.";
  if (prefs.note.length > 400) return "El comentario puede tener hasta 400 caracteres.";
  return "";
}

type MenuOption = { value: string; label: string };

function useAnchorBox(open: boolean, anchor: RefObject<HTMLButtonElement | null>) {
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number; up: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const node = anchor.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const up = below < 220 && above > below;
      setBox({
        top: up ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 168),
        maxHeight: Math.max(148, Math.min(260, (up ? above : below) - 8)),
        up,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor]);
  return box;
}

function PrefsMenu({
  anchorRef,
  open,
  label,
  options,
  value,
  searchable,
  onClose,
  onPick,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  label: string;
  options: MenuOption[];
  value: string;
  searchable?: boolean;
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const box = useAnchorBox(open, anchorRef);
  const visible = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return options;
    return options.filter((option) => fold(option.label).includes(needle));
  }, [options, query]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const selected = Math.max(0, visible.findIndex((option) => option.value === value));
    setActive(selected);
    const timer = window.setTimeout(() => (searchable ? searchRef.current?.focus() : listRef.current?.focus()), 20);
    function onPointer(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        anchorRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive((current) => {
          if (!visible.length) return 0;
          if (event.key === "Home") return 0;
          if (event.key === "End") return visible.length - 1;
          if (event.key === "ArrowDown") return (current + 1) % visible.length;
          return (current - 1 + visible.length) % visible.length;
        });
        return;
      }
      const picked = visible[activeRef.current];
      if (event.key === "Enter" && picked) {
        event.preventDefault();
        onPick(picked.value);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, onPick, anchorRef, visible, value, searchable, box]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLButtonElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || !box) return null;
  return createPortal(
    <div
      ref={listRef}
      className={`prefs-menu${box.up ? " is-up" : ""}`}
      role="listbox"
      aria-label={label}
      tabIndex={-1}
      style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight, transform: box.up ? "translateY(-100%)" : undefined }}
    >
      {searchable ? (
        <label className="prefs-menu__search">
          <Search size={14} strokeWidth={1.8} aria-hidden="true" />
          <input ref={searchRef} value={query} placeholder="Buscar" aria-label={`Buscar ${label}`} onChange={(event) => setQuery(event.target.value)} />
        </label>
      ) : null}
      <div className="prefs-menu__list">
        {visible.length ? visible.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="option"
            data-active={index === active}
            aria-selected={option.value === value}
            className={`${option.value === value ? "is-on" : ""}${index === active ? " is-active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </button>
        )) : <p>Sin resultados</p>}
      </div>
    </div>,
    document.body,
  );
}

export function PlannerPreferencesForm({
  prefs,
  municipalities,
  error,
  busy,
  onChange,
  onSubmit,
  onBack,
}: {
  prefs: PlannerPreferences;
  municipalities: string[];
  error: string;
  busy: boolean;
  onChange: (next: PlannerPreferences) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const cityAnchor = useRef<HTMLButtonElement>(null);
  const dayAnchor = useRef<HTMLButtonElement>(null);
  const today = todayBogota();
  const [localError, setLocalError] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number((prefs.date || today).slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number((prefs.date || today).slice(5, 7)));
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const message = localError || error;
  const sliderValue = prefs.budgetChosen ? Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, prefs.budgetCop)) : SLIDER_MIN;
  const sliderFill = prefs.budgetChosen ? ((sliderValue - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100 : 0;
  const minYear = Number(today.slice(0, 4));
  const months = yearMonths(viewYear, viewMonth);
  const cityOptions = useMemo(() => municipalities.map((name) => ({ value: name, label: name })), [municipalities]);
  const days = useMemo(() => validDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const dayOptions = useMemo(() => days.map((day) => ({ value: String(day).padStart(2, "0"), label: String(day) })), [days]);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(prefs.date)
    && Number(prefs.date.slice(0, 4)) === viewYear
    && Number(prefs.date.slice(5, 7)) === viewMonth
    ? prefs.date.slice(8, 10)
    : "";

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prefs.date)) return;
    setViewYear(Number(prefs.date.slice(0, 4)));
    setViewMonth(Number(prefs.date.slice(5, 7)));
  }, [prefs.date]);

  function commit(next: PlannerPreferences) {
    setLocalError("");
    onChange({ ...next, touched: true, people: 1 });
  }

  function chooseDay(day: string) {
    setDayNote("");
    setDayOpen(false);
    commit({ ...prefs, date: isoDate(viewYear, viewMonth, Number(day)) });
  }

  function moveView(year: number, month: number) {
    const boundedMonth = Math.min(12, Math.max(1, month));
    const boundedYear = Math.max(minYear, year);
    setViewYear(boundedYear);
    setViewMonth(boundedMonth);
    const moved = shiftDay(prefs.date, boundedYear, boundedMonth);
    setDayNote(moved.dropped ? "Ese mes no conserva el día anterior. Elige otro." : "");
    if (moved.date !== prefs.date) commit({ ...prefs, date: moved.date });
  }

  function toggleInterest(value: string) {
    const interests = prefs.interests.includes(value) ? prefs.interests.filter((item) => item !== value) : [...prefs.interests, value];
    commit({ ...prefs, interests });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate(prefs);
    setLocalError(problem);
    if (problem || busy) return;
    onSubmit();
  }

  return (
    <form className="prefs" onSubmit={submit}>
      <header className="prefs__head">
        <button type="button" className="prefs__back" aria-label="Volver a la bienvenida" onClick={onBack}>
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <h1 className="prefs__title">Comparte tus preferencias.</h1>
      </header>

      <section className="prefs__card prefs-date">
        <div className="prefs-card__copy">
          <h2>Fechas del plan</h2>
          <p>Elige el mes y selecciona el día.</p>
        </div>
        <div className="prefs-date__control">
          <div className="prefs-date__rail">
            <div className="prefs-date__months">
              <div className="prefs-year">
                <button type="button" aria-label="Año anterior" disabled={viewYear <= minYear} onClick={() => moveView(viewYear - 1, viewMonth)}>
                  <ChevronLeft size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <span>{viewYear}</span>
                <button type="button" aria-label="Año siguiente" onClick={() => moveView(viewYear + 1, viewMonth)}>
                  <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              <div className="prefs-ruler" role="group" aria-label={`Meses de ${viewYear}`}>
                {months.map((month) => (
                  <button
                    key={month.key}
                    type="button"
                    className={month.on ? "is-on" : ""}
                    aria-pressed={month.on}
                    aria-label={month.name}
                    disabled={month.disabled}
                    onClick={() => moveView(viewYear, month.month)}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              ref={dayAnchor}
              type="button"
              className={`prefs-date__day${selectedDay ? "" : " is-empty"}`}
              aria-haspopup="listbox"
              aria-expanded={dayOpen}
              disabled={!days.length}
              onClick={() => {
                setCityOpen(false);
                setDayOpen((open) => !open);
              }}
            >
              <span>{selectedDay ? String(Number(selectedDay)) : "Día"}</span>
              <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          {prefs.date ? <p className="prefs-date__chosen">{longDate(prefs.date)}</p> : null}
          {dayNote ? <p className="prefs-date__note">{dayNote}</p> : null}
          <PrefsMenu
            anchorRef={dayAnchor}
            open={dayOpen}
            label="Día"
            value={selectedDay}
            options={dayOptions}
            onClose={() => setDayOpen(false)}
            onPick={chooseDay}
          />
        </div>
      </section>

      <div className="prefs__split">
        <section className="prefs__card">
          <div className="prefs-card__copy">
            <h2>Presupuesto total</h2>
            <p>Indica cuánto quieres invertir en todo el plan.</p>
          </div>
          <div className="prefs-budget">
            <div className={`prefs-budget__track${prefs.budgetChosen ? " is-set" : ""}`} style={{ ["--fill" as string]: `${sliderFill}%` }}>
              <span className="prefs-budget__ticks" aria-hidden="true" />
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={10_000}
                value={sliderValue}
                aria-label="Ajustar presupuesto"
                aria-valuetext={prefs.budgetChosen ? `${moneyDigits(prefs.budgetCop)} pesos` : "Selecciona tu presupuesto"}
                onChange={(event) => commit({ ...prefs, budgetCop: Number(event.target.value), budgetChosen: true })}
              />
            </div>
            <label className={`prefs-money${prefs.budgetChosen ? "" : " is-suggested"}`}>
              {prefs.budgetChosen ? <span aria-hidden="true">$</span> : null}
              <input
                inputMode="numeric"
                aria-label="Presupuesto en pesos"
                placeholder="Selecciona tu presupuesto"
                value={prefs.budgetChosen ? (budgetDraft ?? moneyDigits(prefs.budgetCop)) : (budgetDraft ?? "")}
                onFocus={() => setBudgetDraft(prefs.budgetChosen ? String(prefs.budgetCop) : "")}
                onChange={(event) => setBudgetDraft(event.target.value.replace(/\D/g, "").slice(0, 8))}
                onBlur={() => {
                  const next = Number(budgetDraft);
                  setBudgetDraft(null);
                  if (Number.isFinite(next) && budgetDraft) commit({ ...prefs, budgetCop: next, budgetChosen: true });
                }}
              />
            </label>
          </div>
        </section>

        <section className="prefs__card prefs-interests">
          <div className="prefs-card__copy">
            <h2>Actividades e intereses</h2>
            <p>Selecciona las experiencias que más te llaman la atención.</p>
          </div>
          <div className="prefs__chips" role="group" aria-label="Intereses">
            {[INTEREST_OPTIONS.slice(0, 8), INTEREST_OPTIONS.slice(8)].map((row) => (
              <div className="prefs__chip-row" key={row[0]?.value}>
                {row.map((option) => {
                  const on = prefs.interests.includes(option.value);
                  return (
                    <button key={option.value} type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => toggleInterest(option.value)}>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="prefs__pair">
        <section className="prefs__card">
          <div className="prefs-card__copy">
            <h2>Municipio</h2>
            <p>Selecciona un municipio con experiencias disponibles.</p>
          </div>
          <button
            ref={cityAnchor}
            type="button"
            className={`prefs-city${prefs.municipality ? "" : " is-empty"}`}
            aria-haspopup="listbox"
            aria-expanded={cityOpen}
            onClick={() => {
              setDayOpen(false);
              setCityOpen((open) => !open);
            }}
          >
            <span>{prefs.municipality || "Selecciona un municipio"}</span>
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <PrefsMenu
            anchorRef={cityAnchor}
            open={cityOpen}
            label="Municipio"
            searchable={municipalities.length > 6}
            value={prefs.municipality}
            options={cityOptions}
            onClose={() => setCityOpen(false)}
            onPick={(name) => {
              setCityOpen(false);
              commit({ ...prefs, municipality: name });
            }}
          />
        </section>

        <section className="prefs__card prefs-duration">
          <div className="prefs-card__copy">
            <h2>Duración del plan</h2>
            <p>¿Cuánto tiempo tienes disponible?</p>
          </div>
          <div className="prefs__chips" role="group" aria-label="Duración">
            {DURATIONS.map((item) => (
              <button key={item.id} type="button" className={prefs.durationKey === item.id ? "is-on" : ""} aria-pressed={prefs.durationKey === item.id} onClick={() => commit({ ...prefs, durationKey: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="prefs-note">
        <h2>Personalizado</h2>
        <label className="prefs-note__field">
          <textarea
            rows={1}
            maxLength={400}
            value={prefs.note}
            placeholder="Escribe aquí lo que se te ocurra..."
            aria-label="Personalizado"
            onChange={(event) => commit({ ...prefs, note: event.target.value.slice(0, 400) })}
          />
          <em>{prefs.note.length}/400</em>
        </label>
      </section>

      <div className="prefs__foot">
        {message ? <p className="prefs__error" role="alert">{message}</p> : <span />}
        <button type="submit" className="prefs__go" disabled={busy}>
          Generar mi plan
          <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
