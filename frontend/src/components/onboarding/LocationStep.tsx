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
  fieldErrors?: {
    country?: string;
    department?: string;
    city?: string;
    neighborhood?: string;
    address?: string;
  };
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
  fieldErrors,
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
        <div className="location-grid__item">
          <OnboardingSelect
            id="location-country"
            label="País"
            icon={Globe}
            value={form.country}
            placeholder="Selecciona un país"
            options={COUNTRY_OPTIONS}
            invalid={Boolean(fieldErrors?.country)}
            describedBy={fieldErrors?.country ? "location-country-error" : undefined}
            open={openField === "country"}
            onOpenChange={(open) => setOpenField(open ? "country" : null)}
            onChange={setCountry}
          />
          {fieldErrors?.country ? (
            <p id="location-country-error" className="onboarding-error" role="alert">
              {fieldErrors.country}
            </p>
          ) : null}
        </div>
        <div className="location-grid__item">
          <OnboardingSelect
            id="location-department"
            label={departmentLabel}
            icon={MapPin}
            value={form.department}
            placeholder="Selecciona un departamento"
            options={departments}
            allowEmpty={true}
            searchable={true}
            invalid={Boolean(fieldErrors?.department)}
            describedBy={fieldErrors?.department ? "location-department-error" : undefined}
            open={openField === "department"}
            onOpenChange={(open) => setOpenField(open ? "department" : null)}
            onChange={setDepartment}
          />
          {fieldErrors?.department ? (
            <p id="location-department-error" className="onboarding-error" role="alert">
              {fieldErrors.department}
            </p>
          ) : null}
        </div>
        <div className="location-grid__item">
          <OnboardingSelect
            id="location-city"
            label="Ciudad o municipio"
            icon={Building2}
            value={form.city}
            placeholder="Selecciona un municipio"
            options={toOptions(cities)}
            allowEmpty={true}
            searchable={true}
            placement="down"
            disabled={!form.department}
            invalid={Boolean(fieldErrors?.city)}
            describedBy={fieldErrors?.city ? "location-city-error" : undefined}
            open={openField === "city"}
            onOpenChange={(open) => setOpenField(open ? "city" : null)}
            onChange={(city) => onChange({ ...form, city })}
          />
          {fieldErrors?.city ? (
            <p id="location-city-error" className="onboarding-error" role="alert">
              {fieldErrors.city}
            </p>
          ) : null}
        </div>
        <div className="location-grid__item">
        <label className="onboarding-field">
          <FieldIcon icon={House} />
          <span className="onboarding-field__copy">
            <span className="onboarding-field__label">{neighborhoodLabel}</span>
            <span className="onboarding-control">
              <input
                id="onboarding-neighborhood"
                name="ec-neighborhood"
                value={form.neighborhood}
                aria-invalid={Boolean(fieldErrors?.neighborhood) || undefined}
                aria-describedby={fieldErrors?.neighborhood ? "location-neighborhood-error" : undefined}
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
        {fieldErrors?.neighborhood ? (
          <p id="location-neighborhood-error" className="onboarding-error" role="alert">
            {fieldErrors.neighborhood}
          </p>
        ) : null}
        </div>
        <div className="location-grid__item">
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
                    aria-invalid={Boolean(fieldErrors?.address) || undefined}
                    aria-describedby={fieldErrors?.address ? "location-address-error" : undefined}
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
          {fieldErrors?.address ? (
            <p id="location-address-error" className="onboarding-error" role="alert">
              {fieldErrors.address}
            </p>
          ) : null}
        </div>
        </div>
      </div>
    </form>
  );
}
