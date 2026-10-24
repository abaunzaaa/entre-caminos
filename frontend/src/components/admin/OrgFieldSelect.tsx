import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type OrgFieldSelectProps = {
  id: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function OrgFieldSelect({
  id,
  value,
  options,
  placeholder = "Selecciona",
  disabled = false,
  onChange,
}: OrgFieldSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [box, setBox] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = useMemo(
    () => options.filter((item) => item.toLocaleLowerCase("es").includes(needle)),
    [needle, options],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const below = window.innerHeight - rect.bottom - 16;
      setBox({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
        maxHeight: Math.max(160, Math.min(260, below - 52)),
      });
    };
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={`org-select${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`org-select__trigger${!value ? " is-placeholder" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} strokeWidth={1.7} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="org-select__menu"
          style={box ? { left: box.left, top: box.top, width: box.width } : { visibility: "hidden" }}
        >
          <label className="org-select__search">
            <Search size={14} strokeWidth={1.7} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              aria-label="Buscar"
              placeholder="Buscar"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul id={listId} role="listbox" style={box ? { maxHeight: box.maxHeight } : undefined}>
            {!needle ? (
              <li role="none">
                <button type="button" role="option" aria-selected={!value} className={!value ? "is-selected" : ""} onClick={() => choose("")}>
                  <span>{placeholder}</span>
                </button>
              </li>
            ) : null}
            {visible.map((item) => (
              <li key={item} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={item === value}
                  className={item === value ? "is-selected" : ""}
                  onClick={() => choose(item)}
                >
                  <span>{item}</span>
                  {item === value ? <Check size={14} strokeWidth={1.8} aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
            {visible.length === 0 ? <li className="org-select__empty">No se encontraron resultados</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
