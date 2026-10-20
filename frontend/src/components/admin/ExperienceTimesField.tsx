import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { ChevronDown } from "lucide-react";
import { formatTimeLabel, isAvailabilityTime } from "../../utils/experience-details";

const MAX_TIMES = 12;

export function normalizeTimesForSave(times: string[]) {
  const unique: string[] = [];
  for (const item of times) {
    if (!isAvailabilityTime(item) || unique.includes(item)) {
      continue;
    }
    unique.push(item);
  }
  return unique.sort();
}

function to24Hour(hour12: number, minute: number, period: "am" | "pm") {
  const hour = (hour12 % 12) + (period === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function placeCaretAtEnd(input: HTMLInputElement) {
  requestAnimationFrame(() => {
    if (document.activeElement !== input) {
      return;
    }
    const end = input.value.length;
    input.setSelectionRange(end, end);
  });
}

/** While typing, keep the digits captured in onChange if blur sees a shorter DOM value. */
export function resolveClockDraft(domValue: string, draft: string, max = 2) {
  const fromDom = digits(domValue, max);
  const fromDraft = digits(draft, max);
  if (fromDraft.length > fromDom.length && fromDraft.startsWith(fromDom)) {
    return fromDraft;
  }
  return fromDom || fromDraft;
}

export function draftToAvailabilityTime(hour: string, minute: string, period: "am" | "pm") {
  const hourValue = Number(hour);
  const minuteValue = Number(minute);
  if (!Number.isInteger(hourValue) || hourValue < 1 || hourValue > 12) {
    return null;
  }
  if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) {
    return null;
  }
  return to24Hour(hourValue, minuteValue, period);
}

/** Pads a finished part (1–12 or 0–59). Leaves an in-progress or out-of-range draft unchanged. */
export function commitClockPart(raw: string, min: number, max: number) {
  if (!raw.trim()) {
    return "";
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return raw;
  }
  return String(value).padStart(2, "0");
}

function PeriodField({
  value,
  onChange,
  buttonRef,
}: {
  value: "am" | "pm";
  onChange: (value: "am" | "pm") => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className={`dash-team-role dash-exps-times__period${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`dash-team-role__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="a. m. o p. m."
        ref={buttonRef}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value === "am" ? "a. m." : "p. m."}</span>
        <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <div className={`dash-team-role__menu${open ? " is-open" : ""}`} role="listbox">
        <div className="dash-exps-picker__list">
          {(["am", "pm"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={value === item}
              className={`dash-team-role__option${value === item ? " is-active" : ""}`}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {item === "am" ? "a. m." : "p. m."}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExperienceTimesField({
  times,
  onChange,
}: {
  times: string[];
  onChange: (times: string[]) => void;
}) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"am" | "pm">("pm");
  const [notice, setNotice] = useState("");
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const periodRef = useRef<HTMLButtonElement>(null);
  const hourDraft = useRef("");
  const minuteDraft = useRef("");
  const saved = normalizeTimesForSave(times);

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraft();
    }
  }

  function addDraft() {
    const hourRaw = hourDraft.current;
    const minuteRaw = minuteDraft.current;
    if (!hourRaw.trim() || !minuteRaw.trim()) {
      setNotice("Ingresa la hora y los minutos.");
      return;
    }
    const hourValue = Number(hourRaw);
    const minuteValue = Number(minuteRaw);
    if (!Number.isInteger(hourValue) || hourValue < 1 || hourValue > 12) {
      setNotice("La hora va de 1 a 12.");
      return;
    }
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) {
      setNotice("Los minutos van de 00 a 59.");
      return;
    }
    const value = draftToAvailabilityTime(hourRaw, minuteRaw, period);
    if (!value) {
      return;
    }
    if (saved.includes(value)) {
      setNotice("Ese horario ya está agregado.");
      return;
    }
    if (saved.length >= MAX_TIMES) {
      setNotice("Puedes agregar máximo 12 horarios.");
      return;
    }
    onChange([...saved, value].sort());
    hourDraft.current = "";
    minuteDraft.current = "";
    setHour("");
    setMinute("");
    setNotice("");
    hourRef.current?.focus();
  }

  return (
    <div className="dash-exps-times">
      <span className="dash-team-role__label">Horarios</span>
      <div className="dash-exps-times__compose">
        <label className="dash-exps-times__slot">
          <input
            ref={hourRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            placeholder="12"
            aria-label="Hora"
            value={hour}
            onChange={(event) => {
              const next = digits(event.currentTarget.value, 2);
              hourDraft.current = next;
              setHour(next);
              setNotice("");
              placeCaretAtEnd(event.currentTarget);
            }}
            onBlur={(event) => {
              const raw = resolveClockDraft(event.currentTarget.value, hourDraft.current);
              const value = Number(raw);
              if (raw !== "" && (!Number.isInteger(value) || value < 1 || value > 12)) {
                hourDraft.current = raw;
                setHour(raw);
                setNotice("La hora va de 1 a 12.");
                return;
              }
              const next = commitClockPart(raw, 1, 12);
              hourDraft.current = next;
              setHour(next);
            }}
            onKeyDown={onEnter}
          />
        </label>
        <span className="dash-exps-times__colon" aria-hidden="true">
          :
        </span>
        <label className="dash-exps-times__slot">
          <input
            ref={minuteRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            placeholder="45"
            aria-label="Minutos"
            value={minute}
            onChange={(event) => {
              const next = digits(event.currentTarget.value, 2);
              minuteDraft.current = next;
              setMinute(next);
              setNotice("");
              placeCaretAtEnd(event.currentTarget);
            }}
            onBlur={(event) => {
              const raw = resolveClockDraft(event.currentTarget.value, minuteDraft.current);
              const value = Number(raw);
              if (raw !== "" && (!Number.isInteger(value) || value < 0 || value > 59)) {
                minuteDraft.current = raw;
                setMinute(raw);
                setNotice("Los minutos van de 00 a 59.");
                return;
              }
              const next = commitClockPart(raw, 0, 59);
              minuteDraft.current = next;
              setMinute(next);
            }}
            onKeyDown={onEnter}
          />
        </label>
        <PeriodField value={period} onChange={setPeriod} buttonRef={periodRef} />
        <button type="button" className="dash-exps-times__add" onClick={addDraft}>
          Agregar
        </button>
      </div>
      {notice ? <p className="dash-exps-calendar__hint">{notice}</p> : null}
      {saved.length ? (
        <div className="dash-exps-dates__chips" aria-label="Horarios agregados">
          {saved.map((time) => (
            <span key={time} className="dash-exps-dates__chip">
              {formatTimeLabel(time)}
              <button
                type="button"
                aria-label={`Quitar ${formatTimeLabel(time)}`}
                onClick={() => onChange(saved.filter((item) => item !== time))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
