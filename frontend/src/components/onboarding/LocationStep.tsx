import { LocateFixed } from "lucide-react";
import { ONBOARDING_COUNTRIES } from "../../data/onboarding";
import { citiesForDepartment, departmentsList, type OnboardingForm } from "../../utils/onboarding";

type LocationStepProps = {
  form: OnboardingForm;
  locating: boolean;
  locationError: string;
  onChange: (form: OnboardingForm) => void;
  onUseLocation: () => void;
};

export function LocationStep({ form, locating, locationError, onChange, onUseLocation }: LocationStepProps) {
  const cities = citiesForDepartment(form.department);
  const departments = departmentsList();

  return (
    <form className="onboarding-location" onSubmit={(event) => event.preventDefault()}>
      <div className="onboarding-location__grid">
        <label className="onboarding-field">
          <span className="onboarding-field__label" id="onboarding-country-label">
            País
          </span>
          <div className="onboarding-select">
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
          <div className="onboarding-select">
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
          <div className="onboarding-select">
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
          <span className="onboarding-field__label" htmlFor="onboarding-neighborhood">
            Barrio o sector
          </span>
          <input
            id="onboarding-neighborhood"
            className="onboarding-input"
            value={form.neighborhood}
            onChange={(event) => onChange({ ...form, neighborhood: event.target.value })}
            autoComplete="address-level3"
          />
        </label>
        <label className="onboarding-field onboarding-field--wide">
          <span className="onboarding-field__label" htmlFor="onboarding-address">
            Dirección de referencia <span className="onboarding-optional">(opcional)</span>
          </span>
          <input
            id="onboarding-address"
            className="onboarding-input"
            value={form.addressReference}
            onChange={(event) => onChange({ ...form, addressReference: event.target.value })}
            autoComplete="street-address"
          />
        </label>
      </div>
      <button type="button" className="onboarding-text-btn onboarding-geo" onClick={onUseLocation} disabled={locating}>
        <LocateFixed size={16} strokeWidth={1.8} aria-hidden="true" />
        {locating ? "Buscando tu ubicación…" : "Usar mi ubicación"}
      </button>
      {locationError ? (
        <p className="onboarding-error" role="alert">
          {locationError}
        </p>
      ) : null}
    </form>
  );
}
