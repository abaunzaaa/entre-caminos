import type { CSSProperties } from "react";
import { cn } from "../../utils/cn";
import "../../styles/pager.css";

/** Ventana móvil de como máximo 3 páginas alrededor de la actual. */
export function pageWindow(current: number, total: number) {
  const count = Math.max(0, total);
  if (count <= 3) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
  const start = Math.min(Math.max(current - 1, 1), count - 2);
  return [start, start + 1, start + 2];
}

type PagerProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Pager({ page, pageCount, onPageChange, label, disabled = false, className, style }: PagerProps) {
  const total = Math.max(0, pageCount);
  const current = total === 0 ? page : Math.min(Math.max(page, 1), total);
  const numbers = pageWindow(current, total);

  return (
    <nav className={cn("dash-exps-pager", className)} aria-label={label} style={style}>
      <button type="button" onClick={() => onPageChange(current - 1)} disabled={disabled || current <= 1}>
        Anterior
      </button>
      {numbers.map((number, index) => {
        const previous = numbers[index - 1];
        const gap = previous != null && number - previous > 1;
        const active = number === current;
        return (
          <span key={number} className="dash-exps-pager__group">
            {gap ? (
              <span className="dash-exps-pager__gap" aria-hidden="true">
                …
              </span>
            ) : null}
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={`Página ${number}`}
              className={active ? "is-current" : undefined}
              disabled={disabled}
              onClick={() => onPageChange(number)}
            >
              {number}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={() => onPageChange(current + 1)}
        disabled={disabled || total === 0 || current >= total}
      >
        Siguiente
      </button>
    </nav>
  );
}
