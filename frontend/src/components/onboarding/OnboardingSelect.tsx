import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Search, type LucideIcon } from "lucide-react";

export type OnboardingSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type OnboardingSelectBase = {
  label: string;
  icon: LucideIcon;
  placeholder: string;
  options: OnboardingSelectOption[];
  allowEmpty?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  placement?: "down" | "auto";
  pinDown?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wide?: boolean;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
};

type OnboardingSelectSingle = OnboardingSelectBase & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
  maxSelected?: never;
  onLimit?: never;
};

type OnboardingSelectMulti = OnboardingSelectBase & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
  maxSelected?: number;
  onLimit?: () => void;
};

export type OnboardingSelectProps = OnboardingSelectSingle | OnboardingSelectMulti;

type MenuBox = {
  openUp: boolean;
  maxHeight: number;
};

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="onboarding-field__icon" aria-hidden="true">
      <Icon size={20} strokeWidth={1.6} />
    </span>
  );
}

function matchesQuery(option: OnboardingSelectOption, needle: string) {
  if (!needle) {
    return true;
  }
  return `${option.label} ${option.hint ?? ""} ${option.value}`.toLowerCase().includes(needle);
}

export function OnboardingSelect(props: OnboardingSelectProps) {
  const {
    label,
    icon,
    placeholder,
    options,
    allowEmpty = false,
    disabled = false,
    open,
    onOpenChange,
    wide = false,
    multiple = false,
    id,
    invalid = false,
    describedBy,
  } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuBox, setMenuBox] = useState<MenuBox>({ openUp: false, maxHeight: 280 });

  const items = useMemo(() => {
    const mapped = allowEmpty ? [{ value: "", label: placeholder }, ...options] : options;
    return mapped;
  }, [allowEmpty, options, placeholder]);

  const searchable = props.searchable ?? options.length >= 6;
  const needle = query.trim().toLowerCase();
  const visible = needle ? items.filter((item) => matchesQuery(item, needle)) : items;
  const selectedValues = multiple ? props.value : props.value ? [props.value] : [];
  const selectedLabels = options.filter((option) => selectedValues.includes(option.value)).map((option) => option.label);
  const display = selectedLabels.length ? selectedLabels.join(", ") : placeholder;
  const activeOption = visible[activeIndex];
  const activeId = activeOption ? `${listId}-opt-${activeOption.value || "empty"}` : undefined;

  useLayoutEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    function place() {
      const field = rootRef.current;
      if (!field) {
        return;
      }
      const rect = field.getBoundingClientRect();
      const modal = field.closest(".profile-edit-modal");
      const body = modal?.querySelector(".profile-edit-modal__scroll") ?? modal?.querySelector(".profile-edit-modal__body");
      const bodyRect = body?.getBoundingClientRect();
      const footer = modal ? null : document.querySelector(".onboarding-footer");
      const viewBottom = bodyRect ? bodyRect.bottom - 6 : (footer?.getBoundingClientRect().top ?? window.innerHeight);
      const viewTop = bodyRect ? bodyRect.top + 6 : 8;
      const gap = 8;
      const forceDown = props.placement === "down" && !modal;
      const pinDown = Boolean(modal) && props.pinDown;
      const floor = forceDown ? window.innerHeight - 8 : viewBottom;
      const spaceBelow = Math.max(0, floor - rect.bottom - gap);
      const spaceAbove = Math.max(0, rect.top - viewTop - gap);
      const openUp = pinDown
        ? spaceBelow < 96 && spaceAbove > spaceBelow
        : !forceDown && spaceBelow < 168 && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;
      const maxHeight = modal ? Math.min(220, available) : Math.max(160, Math.min(320, available));
      setMenuBox({ openUp, maxHeight });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, visible.length, query, props.placement, props.pinDown]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const selectedIndex = visible.findIndex((item) => selectedValues.includes(item.value) && item.value !== "");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const option = optionRefs.current[activeIndex];
    const menu = option?.closest(".onboarding-select-menu");
    if (!option || !menu) {
      return;
    }
    const optionRect = option.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    if (optionRect.top < menuRect.top) {
      menu.scrollTop -= menuRect.top - optionRect.top;
    } else if (optionRect.bottom > menuRect.bottom) {
      menu.scrollTop += optionRect.bottom - menuRect.bottom;
    }
  }, [activeIndex, open, visible.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.documentElement.classList.add("onboarding-menu-open");
    const focusTimer = window.setTimeout(() => {
      if (searchable) {
        searchRef.current?.focus();
        return;
      }
      optionRefs.current[activeIndex]?.focus({ preventScroll: true });
    }, 0);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (!visible.length) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % visible.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + visible.length) % visible.length);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(visible.length - 1);
        return;
      }
      if (event.key === "Enter" || (event.key === " " && event.target !== searchRef.current)) {
        const option = visible[activeIndex];
        if (!option) {
          return;
        }
        event.preventDefault();
        choose(option.value);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.documentElement.classList.remove("onboarding-menu-open");
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange, searchable, visible, activeIndex, multiple, selectedValues]);

  function choose(nextValue: string) {
    if (multiple) {
      const current = props.value;
      if (current.includes(nextValue)) {
        props.onChange(current.filter((item) => item !== nextValue));
        return;
      }
      if (props.maxSelected && current.length >= props.maxSelected) {
        props.onLimit?.();
        return;
      }
      props.onChange([...current, nextValue]);
      return;
    }
    props.onChange(nextValue);
    onOpenChange(false);
  }

  function toggleOpen() {
    if (!disabled) {
      onOpenChange(!open);
    }
  }

  return (
    <div
      ref={rootRef}
      id={id}
      className={`onboarding-field onboarding-field--select${wide ? " onboarding-field--wide" : ""}${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={toggleOpen}
    >
      <FieldIcon icon={icon} />
      <span className="onboarding-field__copy">
        <span className="onboarding-field__label" id={labelId}>
          {label}
        </span>
        <button
          type="button"
          className={`onboarding-control onboarding-control--select${!selectedLabels.length ? " is-placeholder" : ""}`}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            toggleOpen();
          }}
        >
          {display}
        </button>
      </span>
      {open ? (
            <div
              ref={panelRef}
              className={`onboarding-select-panel${menuBox.openUp ? " is-up" : ""}`}
              style={{ maxHeight: menuBox.maxHeight }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {searchable ? (
                <label className="onboarding-select-search">
                  <Search size={16} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar"
                    autoComplete="off"
                    spellCheck={false}
                    aria-autocomplete="list"
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                  />
                </label>
              ) : null}
              <ul
                id={listId}
                className="onboarding-select-menu"
                role="listbox"
                aria-labelledby={labelId}
                aria-multiselectable={multiple || undefined}
              >
                {visible.length === 0 ? (
                  <li className="onboarding-select-empty">No se encontraron resultados</li>
                ) : (
                  visible.map((option, index) => {
                    const selected = selectedValues.includes(option.value) && (option.value !== "" || selectedValues.includes(""));
                    const emptySelected = option.value === "" && selectedValues.length === 0 && allowEmpty;
                    const isSelected = option.value === "" ? emptySelected : selected;
                    return (
                      <li key={option.value || "__empty"} role="presentation">
                        <button
                          type="button"
                          id={`${listId}-opt-${option.value || "empty"}`}
                          ref={(node) => {
                            optionRefs.current[index] = node;
                          }}
                          role="option"
                          aria-selected={isSelected}
                          className={`onboarding-select-option${isSelected ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}${option.value ? "" : " is-placeholder"}`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => choose(option.value)}
                        >
                          <span>
                            {option.label}
                            {option.hint ? <em className="onboarding-select-option__hint">{option.hint}</em> : null}
                          </span>
                          {isSelected ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : null}
    </div>
  );
}
