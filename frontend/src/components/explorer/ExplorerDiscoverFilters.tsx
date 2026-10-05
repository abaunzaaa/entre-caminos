import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { parseStoredLocation } from "../../data/colombia-locations";
import type { Experience } from "../../types";
import { experienceCategoryNames } from "../../utils/experience-categories";

export type DiscoverPlan = "family" | "couple" | "solo" | "friends" | "";

export type DiscoverFiltersState = {
  city: string;
  categoryId: string;
  price: string;
  plan: DiscoverPlan;
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFiltersState = {
  city: "",
  categoryId: "",
  price: "",
  plan: "",
};

const PRICE_OPTIONS = [
  { value: "", label: "Cualquier precio" },
  { value: "0-50000", label: "Hasta $50.000" },
  { value: "50000-100000", label: "$50.000 – $100.000" },
  { value: "100000-200000", label: "$100.000 – $200.000" },
  { value: "200000+", label: "Más de $200.000" },
] as const;

const PLAN_OPTIONS: Array<{ value: DiscoverPlan; label: string }> = [
  { value: "", label: "Cualquier plan" },
  { value: "family", label: "En familia" },
  { value: "couple", label: "En pareja" },
  { value: "solo", label: "Solo" },
  { value: "friends", label: "Con amigos" },
];

function priceNumber(value: string | number) {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function matchesPrice(experience: Experience, price: string) {
  if (!price) {
    return true;
  }
  const value = priceNumber(experience.price);
  if (price === "0-50000") {
    return value <= 50000;
  }
  if (price === "50000-100000") {
    return value > 50000 && value <= 100000;
  }
  if (price === "100000-200000") {
    return value > 100000 && value <= 200000;
  }
  if (price === "200000+") {
    return value > 200000;
  }
  return true;
}

function matchesPlan(experience: Experience, plan: DiscoverPlan) {
  if (!plan) {
    return true;
  }
  const haystack = `${experience.title} ${experience.description} ${experience.category?.name ?? ""}`.toLowerCase();
  if (plan === "family") {
    return /familia|familiar|niñ/.test(haystack);
  }
  if (plan === "couple") {
    return /pareja|románt|romant/.test(haystack);
  }
  if (plan === "solo") {
    return /solo|individual|autogui/.test(haystack);
  }
  if (plan === "friends") {
    return /amigo|grupo|compart/.test(haystack);
  }
  return true;
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(experience: Experience, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const place = parseStoredLocation(experience.location || "");
  const haystack = normalizeSearchText(
    [
      experience.title || "",
      experienceCategoryNames(experience).join(" "),
      experience.location || "",
      place.department,
      place.municipality,
      experience.description || "",
    ].join(" "),
  );

  if (haystack.includes(normalizedQuery)) {
    return true;
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

export function applyDiscoverFilters(
  experiences: Experience[],
  filters: DiscoverFiltersState,
  searchQuery = "",
) {
  const filtered = experiences.filter((experience) => {
    if (filters.city) {
      const city = parseStoredLocation(experience.location || "").municipality.trim();
      if (city !== filters.city) {
        return false;
      }
    }
    if (filters.categoryId && experience.categoryId !== filters.categoryId) {
      return false;
    }
    if (!matchesPrice(experience, filters.price)) {
      return false;
    }
    if (!matchesPlan(experience, filters.plan)) {
      return false;
    }
    if (!matchesQuery(experience, searchQuery)) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

type FilterSegmentProps = {
  label: string;
  valueLabel: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  wide?: boolean;
  roomy?: boolean;
  alignEnd?: boolean;
};

type MenuCoords = {
  top: number;
  left: number;
  minWidth: number;
  maxHeight: number;
};

function FilterSegment({ label, valueLabel, open, onToggle, children, wide, roomy, alignEnd }: FilterSegmentProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !open) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 184);
    const maxWidth = Math.min(288, window.innerWidth - 16);
    const width = Math.min(minWidth, maxWidth);
    let left = alignEnd ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = rect.bottom + 8;
    const maxHeight = Math.max(120, Math.min(248, window.innerHeight - top - 12));
    setCoords({ top, left, minWidth: width, maxHeight });
  }, [alignEnd, open]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const menuStyle = coords
    ? ({
        position: "fixed",
        top: coords.top,
        left: coords.left,
        minWidth: coords.minWidth,
        maxWidth: Math.min(288, window.innerWidth - 16),
        maxHeight: coords.maxHeight,
        zIndex: 99999,
      } as CSSProperties)
    : undefined;

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            className="explorer-filter-seg__menu explorer-filter-seg__menu--portal is-open"
            style={menuStyle}
            role="listbox"
            aria-label={label}
            data-explorer-filter-menu="true"
          >
            {children}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`explorer-filter-seg${open ? " is-open" : ""}${wide ? " is-wide" : ""}${roomy ? " is-roomy" : ""}${alignEnd ? " is-end" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="explorer-filter-seg__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={onToggle}
      >
        <span className="explorer-filter-seg__label">{label}</span>
        <span className="explorer-filter-seg__value-row">
          <span className="explorer-filter-seg__value">{valueLabel}</span>
          <ChevronDown size={14} strokeWidth={2} className="explorer-filter-seg__chevron" aria-hidden="true" />
        </span>
      </button>
      {menu}
    </div>
  );
}

type ExplorerDiscoverFiltersProps = {
  experiences: Experience[];
  cityOptions?: string[];
  categoryOptions?: Array<{ id: string; name: string }>;
  value: DiscoverFiltersState;
  onChange: (next: DiscoverFiltersState) => void;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearchClear: () => void;
  searchActive: boolean;
};

export function ExplorerDiscoverFilters({
  experiences,
  cityOptions,
  categoryOptions,
  value,
  onChange,
  searchDraft,
  onSearchDraftChange,
  onSearchClear,
  searchActive,
}: ExplorerDiscoverFiltersProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (rootRef.current?.contains(target)) {
        return;
      }
      if (target instanceof Element && target.closest("[data-explorer-filter-menu='true']")) {
        return;
      }
      setOpenKey(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const cities = useMemo(() => {
    if (cityOptions) {
      return cityOptions;
    }
    const set = new Set<string>();
    for (const experience of experiences) {
      const city = parseStoredLocation(experience.location || "").municipality.trim();
      if (city) {
        set.add(city);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [cityOptions, experiences]);

  const categories = useMemo(() => {
    if (categoryOptions) {
      return categoryOptions;
    }
    const map = new Map<string, string>();
    for (const experience of experiences) {
      if (experience.categoryId) {
        map.set(experience.categoryId, experience.category?.name?.trim() || "Sin categoría");
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [categoryOptions, experiences]);

  function patch(partial: Partial<DiscoverFiltersState>) {
    onChange({ ...value, ...partial });
    setOpenKey(null);
  }

  function toggle(key: string) {
    setOpenKey((current) => (current === key ? null : key));
  }

  const cityLabel = value.city || "Todas";
  const categoryLabel =
    categories.find((item) => item.id === value.categoryId)?.name || "Todas";
  const priceLabel = PRICE_OPTIONS.find((item) => item.value === value.price)?.label || "Cualquier precio";
  const planLabel = PLAN_OPTIONS.find((item) => item.value === value.plan)?.label || "Cualquier plan";
  const canClearSearch = searchActive || Boolean(searchDraft.trim());

  return (
    <div
      className={`explorer-filter-rail${openKey ? " is-menu-open" : ""}`}
      ref={rootRef}
    >
      <div className="explorer-filter-bar" role="toolbar" aria-label="Filtros de exploración">
        <FilterSegment
          label="Ciudad"
          valueLabel={cityLabel}
          open={openKey === "city"}
          onToggle={() => toggle("city")}
        >
          <button type="button" role="option" className={!value.city ? "is-active" : ""} onClick={() => patch({ city: "" })}>
            Todas
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              role="option"
              className={value.city === city ? "is-active" : ""}
              onClick={() => patch({ city })}
            >
              {city}
            </button>
          ))}
        </FilterSegment>

        <span className="explorer-filter-bar__divider" aria-hidden="true" />

        <FilterSegment
          label="Categoría"
          valueLabel={categoryLabel}
          open={openKey === "category"}
          onToggle={() => toggle("category")}
        >
          <button
            type="button"
            role="option"
            className={!value.categoryId ? "is-active" : ""}
            onClick={() => patch({ categoryId: "" })}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="option"
              className={value.categoryId === category.id ? "is-active" : ""}
              onClick={() => patch({ categoryId: category.id })}
            >
              {category.name}
            </button>
          ))}
        </FilterSegment>

        <span className="explorer-filter-bar__divider" aria-hidden="true" />

        <FilterSegment
          label="Precio (COP)"
          valueLabel={priceLabel}
          open={openKey === "price"}
          onToggle={() => toggle("price")}
          wide
        >
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              role="option"
              className={value.price === option.value ? "is-active" : ""}
              onClick={() => patch({ price: option.value })}
            >
              {option.label}
            </button>
          ))}
        </FilterSegment>

        <span className="explorer-filter-bar__divider" aria-hidden="true" />

        <FilterSegment
          label="Tipo de plan"
          valueLabel={planLabel}
          open={openKey === "plan"}
          onToggle={() => toggle("plan")}
          roomy
          alignEnd
        >
          {PLAN_OPTIONS.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              role="option"
              className={value.plan === option.value ? "is-active" : ""}
              onClick={() => patch({ plan: option.value })}
            >
              {option.label}
            </button>
          ))}
        </FilterSegment>

        <span className="explorer-filter-bar__divider" aria-hidden="true" />

        <div className={`explorer-filter-bar__query${searchActive ? " is-active" : ""}`}>
          <label className="explorer-filter-bar__query-field" htmlFor="explorer-discover-search">
            <span className="explorer-filter-bar__query-label">Buscar</span>
            <input
              id="explorer-discover-search"
              type="search"
              value={searchDraft}
              placeholder="Buscar experiencias..."
              aria-label="Buscar experiencias por nombre o palabras relacionadas"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => onSearchDraftChange(event.target.value)}
            />
          </label>
          {canClearSearch ? (
            <button
              type="button"
              className="explorer-filter-bar__query-clear"
              aria-label="Limpiar búsqueda"
              onClick={onSearchClear}
            >
              <X size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
