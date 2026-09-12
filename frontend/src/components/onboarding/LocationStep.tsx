import { Check, LocateFixed, RotateCcw } from "lucide-react";
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

export function LocationStep({
  form,
  locating,
  locationStatus,
  locationError,
  onChange,
  onUseLocation,
}: LocationStepProps) {
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
        <label className="onboarding-field">
          <span className="onboarding-field__label" id="onboarding-country-label">
            País
          </span>
          <div className="onboarding-control">
            <select
              aria-labelledby="onboarding-country-label"
              value={form.country}
              onChange={(event) =>
                onChange({
                  ...form,
                  country: event.target.value,
                  department: "",
                  city: "",
                  latitude: null,
                  longitude: null,
                })
              }
            >
              {ONBOARDING_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="onboarding-field">
          <span className="onboarding-field__label" id="onboarding-department-label">
            Departamento o estado
          </span>
          <div className="onboarding-control">
            <select
              aria-labelledby="onboarding-department-label"
              value={form.department}
              onChange={(event) => {
                const department = event.target.value;
                const nextCities = citiesForDepartment(department);
                onChange({
                  ...form,
                  department,
                  city: nextCities.includes(form.city) ? form.city : "",
                });
              }}
            >
              <option value="">Selecciona un departamento</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="onboarding-field">
          <span className="onboarding-field__label" id="onboarding-city-label">
            Ciudad o municipio
          </span>
          <div className="onboarding-control">
            <select
              aria-labelledby="onboarding-city-label"
              value={form.city}
              disabled={!form.department}
              onChange={(event) => onChange({ ...form, city: event.target.value })}
            >
              <option value="">Selecciona un municipio</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="onboarding-field">
          <span className="onboarding-field__label">
            Barrio o sector
          </span>
          <div className="onboarding-control">
            <input
              id="onboarding-neighborhood"
              value={form.neighborhood}
              onChange={(event) => onChange({ ...form, neighborhood: event.target.value })}
              autoComplete="address-level3"
            />
          </div>
        </label>
        <div className="onboarding-field onboarding-field--address">
          <span className="onboarding-field__label">
            Dirección de referencia <span className="onboarding-optional">(opcional)</span>
          </span>
          <div className="onboarding-address-row">
            <div className="onboarding-control">
              <input
                id="onboarding-address"
                value={form.addressReference}
                onChange={(event) => onChange({ ...form, addressReference: event.target.value })}
                autoComplete="street-address"
              />
            </div>
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
