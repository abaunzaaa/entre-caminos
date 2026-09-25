import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, Compass, Globe, House, LocateFixed, MapPin, RotateCcw, Search, type LucideIcon } from "lucide-react";
import { ONBOARDING_COUNTRIES } from "../../data/onboarding";
import { citiesForDepartment, departmentsList, type OnboardingForm } from "../../utils/onboarding";

export type LocationStatus = "idle" | "loading" | "success" | "error";

type LocationStepProps = {
  form: OnboardingForm;
  locating: boolean;
  locationStatus: LocationStatus;
  locationError: string;
  onChange: (form: OnboardingForm) => void;
  onUseLocation: () => void;
};

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="onboarding-field__icon" aria-hidden="true">
      <Icon size={20} strokeWidth={1.6} />
    </span>
  );
}

type LocationSelectProps = {
  label: string;
  icon: LucideIcon;
  value: string;
  placeholder: string;
  options: string[];
  allowEmpty?: boolean;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
};

function LocationSelect({
  label,
  icon,
  value,
  placeholder,
  options,
  allowEmpty = false,
  disabled = false,
  open,
  onOpenChange,
  onChange,
}: LocationSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const items = allowEmpty ? ["", ...options] : options;
  const [query, setQuery] = useState("");
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 });
  const searchable = options.length > 8;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) => (item || placeholder).toLowerCase().includes(needle))
    : items;

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
      const footer = document.querySelector(".onboarding-footer");
      const floor = footer?.getBoundingClientRect().top ?? window.innerHeight;
      const gap = 10;
      const maxHeight = Math.max(168, Math.min(320, floor - rect.bottom - gap - 12));
      setMenuBox({ top: rect.bottom + gap, left: rect.left, width: rect.width, maxHeight });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.documentElement.classList.add("onboarding-menu-open");
    searchRef.current?.focus();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.classList.remove("onboarding-menu-open");
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className={`onboarding-field onboarding-field--select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={() => {
        if (!disabled) {
          onOpenChange(!open);
        }
      }}
    >
      <FieldIcon icon={icon} />
      <span className="onboarding-field__copy">
        <span className="onboarding-field__label" id={labelId}>
          {label}
        </span>
        <button
          type="button"
          className={`onboarding-control onboarding-control--select${!value ? " is-placeholder" : ""}`}
          aria-labelledby={labelId}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            if (!disabled) {
              onOpenChange(!open);
            }
          }}
        >
          {value || placeholder}
        </button>
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="onboarding-select-panel"
              style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width, maxHeight: menuBox.maxHeight }}
              onClick={(event) => event.stopPropagation()}
            >
              {searchable ? (
                <label className="onboarding-select-search">
                  <Search size={16} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              ) : null}
              <ul className="onboarding-select-menu" role="listbox" aria-labelledby={labelId}>
                {visible.length === 0 ? (
                  <li className="onboarding-select-empty">Sin coincidencias</li>
                ) : (
                  visible.map((option) => {
                    const selected = option === value;
                    return (
                      <li key={option || "__empty"} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`onboarding-select-option${selected ? " is-selected" : ""}${option ? "" : " is-placeholder"}`}
                          onClick={() => {
                            onChange(option);
                            onOpenChange(false);
                          }}
                        >
                          <span>{option || placeholder}</span>
                          {selected ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function LocationStep({
  form,
  locating,
  locationStatus,
  locationError,
  onChange,
  onUseLocation,
}: LocationStepProps) {
  const [openField, setOpenField] = useState<"country" | "department" | "city" | null>(null);
  const cities = citiesForDepartment(form.department);
  const departments = departmentsList();
  const geoLabel =
    locationStatus === "loading"
      ? "Buscando tu ubicación…"
      : locationStatus === "success"
        ? "Ubicación detectada"
        : locationStatus === "error"
          ? "Intentar de nuevo"
          : "Usar mi ubicación";

  return (
    <form className="onboarding-location" onSubmit={(event) => event.preventDefault()}>
      <div className="location-grid">
        <LocationSelect
          label="País"
          icon={Globe}
          value={form.country}
          placeholder="Selecciona un país"
          options={ONBOARDING_COUNTRIES}
          open={openField === "country"}
          onOpenChange={(open) => setOpenField(open ? "country" : null)}
          onChange={(country) =>
            onChange({
              ...form,
              country,
              department: "",
              city: "",
              latitude: null,
              longitude: null,
            })
          }
        />
        <LocationSelect
          label="Departamento o estado"
          icon={MapPin}
          value={form.department}
          placeholder="Selecciona un departamento"
          options={departments}
          allowEmpty
          open={openField === "department"}
          onOpenChange={(open) => setOpenField(open ? "department" : null)}
          onChange={(department) => {
            const nextCities = citiesForDepartment(department);
            onChange({
              ...form,
              department,
              city: nextCities.includes(form.city) ? form.city : "",
            });
          }}
        />
        <LocationSelect
          label="Ciudad o municipio"
          icon={Building2}
          value={form.city}
          placeholder="Selecciona un municipio"
          options={cities}
          allowEmpty
          disabled={!form.department}
          open={openField === "city"}
          onOpenChange={(open) => setOpenField(open ? "city" : null)}
          onChange={(city) => onChange({ ...form, city })}
        />
        <label className="onboarding-field">
          <FieldIcon icon={House} />
          <span className="onboarding-field__copy">
            <span className="onboarding-field__label">Barrio o sector</span>
            <span className="onboarding-control">
              <input
                id="onboarding-neighborhood"
                name="ec-neighborhood"
                value={form.neighborhood}
                onChange={(event) => onChange({ ...form, neighborhood: event.target.value })}
                placeholder="Escribe tu barrio o sector"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </span>
          </span>
        </label>
        <div className="onboarding-field--address">
          <div className="onboarding-address-row">
            <label className="onboarding-field">
              <FieldIcon icon={Compass} />
              <span className="onboarding-field__copy">
                <span className="onboarding-field__label">
                  Dirección de referencia <span className="onboarding-optional">(opcional)</span>
                </span>
                <span className="onboarding-control">
                  <input
                    id="onboarding-address"
                    name="ec-address-ref"
                    value={form.addressReference}
                    onChange={(event) => onChange({ ...form, addressReference: event.target.value })}
                    placeholder="Ej. Cerca al parque, edificio, punto de referencia..."
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </span>
              </span>
            </label>
            <button
              type="button"
              className={`onboarding-geo${locationStatus === "success" ? " is-success" : ""}${locationStatus === "error" ? " is-error" : ""}`}
              onClick={onUseLocation}
              disabled={locating}
            >
              {locationStatus === "success" ? (
                <Check size={18} strokeWidth={2.2} aria-hidden="true" />
              ) : locationStatus === "error" ? (
                <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <LocateFixed size={18} strokeWidth={1.8} aria-hidden="true" />
              )}
              {geoLabel}
            </button>
          </div>
          {locationError ? (
            <p className="onboarding-error" role="alert">
              {locationError}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
