import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { VisitedCategoryFilter } from "../../utils/visited-filters";

type VisitedCoverFiltersProps = {
  options: VisitedCategoryFilter[];
  total: number;
  activeId: string | null;
  onChange: (categoryId: string | null) => void;
};

export function VisitedCoverFilters({ options, total, activeId, onChange }: VisitedCoverFiltersProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = options.find((option) => option.id === activeId) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (options.length === 0) {
    return null;
  }

  function choose(categoryId: string | null) {
    onChange(categoryId);
    setOpen(false);
  }

  return (
    <div className="visited-filters">
      <div className="visited-filters__box" ref={rootRef}>
        <button
          type="button"
          className={`visited-filters__trigger${open ? " is-open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="visited-filters__value">{active?.name ?? "Todas"}</span>
          <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {open ? (
          <ul className="visited-filters__list" id={listId} role="listbox" aria-label="Categorías visitadas">
            <li>
              <button type="button" role="option" aria-selected={activeId == null} className={activeId == null ? "is-active" : ""} onClick={() => choose(null)}>
                <span>Todas</span>
                <span className="visited-filters__count">{total}</span>
              </button>
            </li>
            {options.map((option) => {
              const selected = activeId === option.id;
              return (
                <li key={option.id}>
                  <button type="button" role="option" aria-selected={selected} className={selected ? "is-active" : ""} onClick={() => choose(option.id)}>
                    <span>{option.name}</span>
                    <span className="visited-filters__count">{option.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
