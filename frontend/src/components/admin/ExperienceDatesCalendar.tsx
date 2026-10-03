import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function formatChip(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function ExperienceDatesCalendar({
  dates,
  onChange,
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (dates[0]) {
      const [year, month] = dates[0].split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    return startOfMonth(new Date());
  });

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
  const selectedSet = useMemo(() => new Set(dates), [dates]);

  function toggleDay(day: Date) {
    const iso = toIsoDate(day);
    if (selectedSet.has(iso)) {
      onChange(dates.filter((item) => item !== iso));
      return;
    }
    onChange([...dates, iso].sort());
  }

  return (
    <div className="dash-exps-calendar">
      <div className="dash-exps-calendar__panel" role="group" aria-label="Calendario de fechas específicas">
        <div className="dash-exps-calendar__nav">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
          >
            <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <strong>
            {visibleMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </strong>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
          >
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <div className="dash-exps-calendar__week" aria-hidden="true">
          {WEEKDAY_LABELS.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="dash-exps-calendar__grid" role="grid">
          {days.map((day) => {
            const iso = toIsoDate(day);
            const inMonth = day.getMonth() === visibleMonth.getMonth();
            const isSelected = selectedSet.has(iso);
            const isToday = sameDay(day, today);
            return (
              <button
                key={iso}
                type="button"
                className={`dash-exps-calendar__day${inMonth ? "" : " is-outside"}${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                aria-pressed={isSelected}
                onClick={() => toggleDay(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      {dates.length ? (
        <div className="dash-exps-dates__chips">
          {dates.map((date) => (
            <span key={date} className="dash-exps-dates__chip">
              {formatChip(date)}
              <button
                type="button"
                aria-label={`Quitar ${formatChip(date)}`}
                onClick={() => onChange(dates.filter((item) => item !== date))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="dash-exps-calendar__hint">Selecciona una o varias fechas en el calendario.</p>
      )}
    </div>
  );
}
