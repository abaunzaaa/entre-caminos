import { useState } from "react";
import { Building2, Check, Compass, Globe, House, LocateFixed, MapPin, RotateCcw, type LucideIcon } from "lucide-react";
import { ONBOARDING_COUNTRIES } from "../../data/onboarding";
import { citiesForDepartment, departmentsList, type OnboardingForm } from "../../utils/onboarding";
import { OnboardingSelect, type OnboardingSelectOption } from "./OnboardingSelect";

export type LocationStatus = "idle" | "loading" | "success" | "error";

type LocationStepProps = {
  form: OnboardingForm;
  locating: boolean;
  locationStatus: LocationStatus;
  locationError: string;
  onChange: (form: OnboardingForm) => void;
  onUseLocation: () => void;
  labels?: {
    department?: string;
    neighborhood?: string;
    neighborhoodPlaceholder?: string;
    address?: string;
    addressPlaceholder?: string;
  };
};

function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="onboarding-field__icon" aria-hidden="true">
      <Icon size={20} strokeWidth={1.6} />
    </span>
  );
}

function toOptions(values: readonly string[]): OnboardingSelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

const COUNTRY_OPTIONS = toOptions(ONBOARDING_COUNTRIES);

export function LocationStep({
  form,
  locating,
  locationStatus,
  locationError,
  onChange,
  onUseLocation,
  labels,
}: LocationStepProps) {
  const departmentLabel = labels?.department ?? "Departamento o estado";
  const neighborhoodLabel = labels?.neighborhood ?? "Barrio o sector";
  const neighborhoodPlaceholder = labels?.neighborhoodPlaceholder ?? "Escribe tu barrio o sector";
  const addressLabel = labels?.address ?? "Dirección de referencia";
  const addressOptional = labels?.address == null;
  const addressPlaceholder = labels?.addressPlaceholder ?? "Ej. Cerca al parque, edificio, punto de referencia...";
  const [openField, setOpenField] = useState<"country" | "department" | "city" | null>(null);
  const cities = citiesForDepartment(form.department);
  const departments = toOptions(departmentsList());
  const geoLabel =
    locationStatus === "loading"
      ? "Buscando tu ubicación…"
      : locationStatus === "success"
        ? "Ubicación detectada"
        : locationStatus === "error"
          ? "Intentar de nuevo"
          : "Usar mi ubicación";

  function setCountry(country: string) {
    onChange({
      ...form,
      country,
      department: "",
      city: "",
      latitude: null,
      longitude: null,
    });
  }

  function setDepartment(department: string) {
    const nextCities = citiesForDepartment(department);
    onChange({
      ...form,
      department,
      city: nextCities.includes(form.city) ? form.city : "",
    });
  }

  return (
    <form className="onboarding-location" onSubmit={(event) => event.preventDefault()}>
      <div className="location-grid">
        <OnboardingSelect
          label="País"
          icon={Globe}
          value={form.country}
          placeholder="Selecciona un país"
          options={COUNTRY_OPTIONS}
          open={openField === "country"}
          onOpenChange={(open) => setOpenField(open ? "country" : null)}
          onChange={setCountry}
        />
        <OnboardingSelect
          label={departmentLabel}
          icon={MapPin}
          value={form.department}
          placeholder="Selecciona un departamento"
          options={departments}
          allowEmpty={true}
          searchable={true}
          open={openField === "department"}
          onOpenChange={(open) => setOpenField(open ? "department" : null)}
          onChange={setDepartment}
        />
        <OnboardingSelect
          label="Ciudad o municipio"
          icon={Building2}
          value={form.city}
          placeholder="Selecciona un municipio"
          options={toOptions(cities)}
          allowEmpty={true}
          searchable={true}
          placement="down"
          disabled={!form.department}
          open={openField === "city"}
          onOpenChange={(open) => setOpenField(open ? "city" : null)}
          onChange={(city) => onChange({ ...form, city })}
        />
        <label className="onboarding-field">
          <FieldIcon icon={House} />
          <span className="onboarding-field__copy">
            <span className="onboarding-field__label">{neighborhoodLabel}</span>
            <span className="onboarding-control">
              <input
                id="onboarding-neighborhood"
                name="ec-neighborhood"
                value={form.neighborhood}
                onChange={(event) => onChange({ ...form, neighborhood: event.target.value })}
                placeholder={neighborhoodPlaceholder}
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
                  {addressLabel}
                  {addressOptional ? <span className="onboarding-optional"> (opcional)</span> : null}
                </span>
                <span className="onboarding-control">
                  <input
                    id="onboarding-address"
                    name="ec-address-ref"
                    value={form.addressReference}
                    onChange={(event) => onChange({ ...form, addressReference: event.target.value })}
                    placeholder={addressPlaceholder}
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
