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
  const saved = normalizeTimesForSave(times);

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraft();
    }
  }

  function addDraft() {
    if (!hour.trim() || !minute.trim()) {
      setNotice("Ingresa la hora y los minutos.");
      return;
    }
    const hourValue = Number(hour);
    const minuteValue = Number(minute);
    if (!Number.isInteger(hourValue) || hourValue < 1 || hourValue > 12) {
      setNotice("La hora va de 1 a 12.");
      return;
    }
    if (!Number.isInteger(minuteValue) || minuteValue < 0 || minuteValue > 59) {
      setNotice("Los minutos van de 00 a 59.");
      return;
    }
    const value = to24Hour(hourValue, minuteValue, period);
    if (saved.includes(value)) {
      setNotice("Ese horario ya está agregado.");
      return;
    }
    if (saved.length >= MAX_TIMES) {
      setNotice("Puedes agregar máximo 12 horarios.");
      return;
    }
    onChange([...saved, value].sort());
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
              const next = digits(event.target.value, 2);
              setHour(next);
              setNotice("");
              if (next.length === 2) {
                minuteRef.current?.focus();
              }
            }}
            onBlur={() => {
              if (hour !== "" && Number(hour) >= 1 && Number(hour) <= 12) {
                setHour(String(Number(hour)).padStart(2, "0"));
              }
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
              const next = digits(event.target.value, 2);
              setMinute(next);
              setNotice("");
              if (next.length === 2) {
                periodRef.current?.focus();
              }
            }}
            onBlur={() => {
              if (minute !== "" && Number(minute) >= 0 && Number(minute) <= 59) {
                setMinute(String(Number(minute)).padStart(2, "0"));
              }
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
