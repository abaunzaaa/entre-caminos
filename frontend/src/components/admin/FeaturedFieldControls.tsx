import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type MenuOption = { value: string; label: string };

export function FeaturedMenuSelect({
  label,
  value,
  compact,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: MenuOption[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`featured-menu${compact ? " is-compact" : ""}${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="featured-menu__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="featured-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? "Seleccionar"}</span>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open ? (
        <div className="featured-menu__panel" id={listId} role="listbox" aria-labelledby={`${listId}-label`}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value || "empty"}
                type="button"
                role="option"
                aria-selected={active}
                className={`featured-menu__option${active ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseLocalDateTime(value: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toLocalDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function FeaturedDateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseLocalDateTime(value);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    setVisibleMonth(startOfMonth(parseLocalDateTime(value) ?? new Date()));
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, value]);

  const days = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const lead = (first.getDay() + 6) % 7;
    const cursor = new Date(first);
    cursor.setDate(1 - lead);
    return Array.from({ length: 42 }, () => {
      const day = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
      return day;
    });
  }, [visibleMonth]);

  const today = new Date();
  const hour = selected ? pad(selected.getHours()) : "00";
  const minute = selected ? pad(selected.getMinutes()) : "00";
  const labelText = selected
    ? selected.toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin fecha";

  function commit(next: Date) {
    onChange(toLocalDateTime(next));
  }

  function pickDay(day: Date) {
    const next = new Date(day);
    next.setHours(selected?.getHours() ?? 0, selected?.getMinutes() ?? 0, 0, 0);
    commit(next);
  }

  function updateTime(nextHour: string, nextMinute: string) {
    const base = selected ? new Date(selected) : new Date();
    const hours = Math.min(23, Math.max(0, Number(nextHour) || 0));
    const minutes = Math.min(59, Math.max(0, Number(nextMinute) || 0));
    base.setHours(hours, minutes, 0, 0);
    commit(base);
  }

  return (
    <div className={`featured-menu featured-calendar${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="featured-menu__label" id={titleId}>
        {label}
      </span>
      <button
        type="button"
        className="featured-menu__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{labelText}</span>
        <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open ? (
        <div className="featured-calendar__panel" role="dialog" aria-labelledby={titleId}>
          <div className="featured-calendar__nav">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <strong>
              {visibleMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
            </strong>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="featured-calendar__week" aria-hidden="true">
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="featured-calendar__grid" role="grid">
            {days.map((day) => {
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = selected ? sameDay(day, selected) : false;
              const isToday = sameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`featured-calendar__day${inMonth ? "" : " is-outside"}${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                  onClick={() => pickDay(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="featured-calendar__time">
            <label>
              Hora
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(event) => updateTime(event.target.value, minute)}
              />
            </label>
            <label>
              Min
              <input
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(event) => updateTime(hour, event.target.value)}
              />
            </label>
            <button type="button" className="featured-calendar__clear" onClick={() => onChange("")}>
              Quitar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
