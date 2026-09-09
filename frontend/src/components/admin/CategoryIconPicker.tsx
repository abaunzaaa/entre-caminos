import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CATEGORY_ICON_OPTIONS,
  getCategoryIconOption,
  type CategoryIconOption,
} from "../../utils/category-icons";

function IconMark({ option, size }: { option: CategoryIconOption; size: number }) {
  const Icon = option.Icon;
  return <Icon size={size} strokeWidth={1.75} />;
}

export function CategoryIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = getCategoryIconOption(value);

  useEffect(() => {
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
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const host = rootRef.current;
    const panel = host?.querySelector<HTMLElement>(".dash-cats-iconpick__menu");
    if (!host || !panel) {
      return;
    }

    function applyMaxHeight() {
      const styles = getComputedStyle(host);
      const gap = parseFloat(styles.getPropertyValue("--iconpick-gap")) || 8;
      const rows = parseFloat(styles.getPropertyValue("--iconpick-visible-rows")) || 4;
      const pad = parseFloat(styles.getPropertyValue("--iconpick-menu-pad")) || 24;
      const option = host.querySelector<HTMLElement>(".dash-cats-iconpick__option");
      const cell =
        option?.getBoundingClientRect().height ||
        parseFloat(styles.getPropertyValue("--iconpick-cell")) ||
        52;
      const preferred = Math.ceil(pad + cell * rows + gap * Math.max(0, rows - 1) + 2);
      const available = Math.floor(window.innerHeight - panel.getBoundingClientRect().top - 16);
      const next = `${Math.max(Math.ceil(pad + cell * 2 + gap), Math.min(preferred, available))}px`;
      if (host.style.getPropertyValue("--iconpick-max") !== next) {
        host.style.setProperty("--iconpick-max", next);
      }
    }

    applyMaxHeight();
    window.addEventListener("resize", applyMaxHeight);
    return () => {
      window.removeEventListener("resize", applyMaxHeight);
      host.style.removeProperty("--iconpick-max");
    };
  }, [open]);

  return (
    <div className="dash-team-role dash-cats-iconpick" ref={rootRef}>
      <span className="dash-team-role__label" id={`${listId}-label`}>
        Icono de categoría
      </span>
      <button
        type="button"
        className={`dash-team-role__trigger dash-cats-iconpick__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dash-cats-iconpick__value">
          {selected ? (
            <>
              <span className="dash-cats-iconpick__preview" aria-hidden="true">
                <IconMark option={selected} size={20} />
              </span>
              <span className="sr-only">{selected.label}</span>
            </>
          ) : (
            <span className="dash-cats-iconpick__placeholder">Seleccionar icono</span>
          )}
        </span>
        <ChevronDown className="dash-cats-iconpick__chevron" size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <div
        id={listId}
        className={`dash-team-role__menu dash-cats-iconpick__menu${open ? " is-open" : ""}`}
        role="listbox"
        aria-label="Iconos de categoría"
      >
        <div className="dash-cats-iconpick__grid">
          {CATEGORY_ICON_OPTIONS.map((option) => {
            const active = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={option.label}
                title={option.label}
                className={`dash-cats-iconpick__option${active ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <IconMark option={option} size={22} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
