import { useEffect, useId, useRef, useState } from "react";
import { AuthForgotModalLayout } from "../auth/AuthForgotModalLayout";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { LocationStep, type LocationStatus } from "../onboarding/LocationStep";
import { OnboardingOptionCard } from "../onboarding/OnboardingOptionCard";
import {
  EditAccountFields,
  validateAccountAge,
  validateAccountName,
} from "../onboarding/EditAccountFields";
import { Button } from "../ui/Button";
import { COMPANY_OPTIONS, INTEREST_OPTIONS, PREFERENCE_GROUPS, PROFILE_GENDERS } from "../../data/onboarding";
import { useAuth } from "../../hooks/useAuth";
import { dismissFavoriteToast, showFavoriteToast } from "../../services/favorites-sync";
import { saveOnboardingProfile } from "../../services/onboarding.service";
import { getApiErrorFields, getApiErrorMessage } from "../../utils/api-error";
import { reverseGeocodeColombia } from "../../utils/geocode";
import {
  PRIMARY_INTEREST_MAX,
  PRIMARY_INTEREST_MIN,
  applyCityChange,
  applyDepartmentChange,
  citiesForDepartment,
  countPrimaryInterests,
  profileToForm,
  toggleMulti,
  toggleSingle,
  type OnboardingForm,
} from "../../utils/onboarding";
import {
  formatNationalPhone,
  nationalPhoneDigits,
  parseStoredPhone,
  phoneStorageValue,
  validateDialPhone,
} from "../../utils/profile-phone";
import "../../styles/onboarding.css";
import "../../styles/profile-view.css";

type PrefField = keyof Pick<OnboardingForm, "places" | "music" | "budget" | "climate">;

const SAVE_BLOCKED = "No pudimos guardar los cambios. Revisa los campos marcados.";
const SAVE_UNEXPECTED = "No pudimos actualizar el perfil. Inténtalo nuevamente.";

type LocationErrors = {
  country?: string;
  department?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
};

function locationProblems(form: OnboardingForm): LocationErrors {
  const next: LocationErrors = {};
  if (!form.country.trim()) {
    next.country = "El país es obligatorio.";
  }
  if (!form.department.trim()) {
    next.department = "Selecciona un departamento.";
  } else if (form.city.trim() && !citiesForDepartment(form.department).includes(form.city)) {
    next.city = "Selecciona un municipio que corresponda al departamento.";
  }
  if (!form.city.trim()) {
    next.city = "Selecciona una ciudad o municipio.";
  }
  if (form.neighborhood.trim().length > 80) {
    next.neighborhood = "El barrio es demasiado largo.";
  }
  if (form.addressReference.trim().length > 160) {
    next.address = "La dirección es demasiado larga.";
  }
  return next;
}

function keepLocationErrors(current: LocationErrors, form: OnboardingForm) {
  const still = locationProblems(form);
  const next: LocationErrors = {};
  (Object.keys(current) as Array<keyof LocationErrors>).forEach((key) => {
    if (current[key] && still[key]) {
      next[key] = still[key];
    }
  });
  return next;
}

function genderProblem(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return (PROFILE_GENDERS as readonly string[]).includes(trimmed) ? "" : "Selecciona un género válido.";
}

function interestProblem(interests: string[]) {
  const count = countPrimaryInterests(interests);
  if (count < PRIMARY_INTEREST_MIN) {
    return "Selecciona al menos 3 intereses para continuar.";
  }
  if (count > PRIMARY_INTEREST_MAX) {
    return "Puedes seleccionar máximo 5 intereses.";
  }
  return "";
}

type FieldErrorSnapshot = {
  account: { name?: string; phone?: string };
  location: LocationErrors;
  age: string;
  gender: string;
  interest: string;
  companion: string;
  formError: string;
};

function profileFieldsStillInvalid(snapshot: FieldErrorSnapshot) {
  return Boolean(
    snapshot.account.name ||
      snapshot.account.phone ||
      snapshot.location.country ||
      snapshot.location.department ||
      snapshot.location.city ||
      snapshot.location.neighborhood ||
      snapshot.location.address ||
      snapshot.age ||
      snapshot.gender ||
      snapshot.interest ||
      snapshot.companion,
  );
}

function scrollToField(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

const PREFERENCE_SECTIONS: Array<{ title: string; groupId: string }> = [
  { title: "Ambientes", groupId: "ambientes" },
  { title: "Presupuesto", groupId: "presupuesto" },
  { title: "Música", groupId: "musica" },
  { title: "Clima", groupId: "clima" },
];

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const { user, refresh, updateProfile } = useAuth();
  const savingLock = useRef(false);
  const initialPhone = parseStoredPhone(user?.phone);
  const [form, setForm] = useState<OnboardingForm>(() => profileToForm(user?.profile));
  const [accountName, setAccountName] = useState(user?.name ?? "");
  const [dialCode, setDialCode] = useState(initialPhone.dialCode);
  const [accountPhone, setAccountPhone] = useState(() => formatNationalPhone(initialPhone.national));
  const [accountErrors, setAccountErrors] = useState<{ name?: string; phone?: string }>({});
  const [locationErrors, setLocationErrors] = useState<LocationErrors>({});
  const [ageError, setAgeError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [interestError, setInterestError] = useState("");
  const [companionError, setCompanionError] = useState("");
  const [formError, setFormError] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [saving, setSaving] = useState(false);
  const liveErrors = useRef<FieldErrorSnapshot>({
    account: {},
    location: {},
    age: "",
    gender: "",
    interest: "",
    companion: "",
    formError: "",
  });
  const bannerSync = useRef(0);
  liveErrors.current = {
    account: accountErrors,
    location: locationErrors,
    age: ageError,
    gender: genderError,
    interest: interestError,
    companion: companionError,
    formError,
  };

  function scheduleBannerSync(snapshot: FieldErrorSnapshot = liveErrors.current) {
    const token = ++bannerSync.current;
    queueMicrotask(() => {
      if (token !== bannerSync.current) {
        return;
      }
      if (profileFieldsStillInvalid(snapshot) || !snapshot.formError) {
        return;
      }
      dismissFavoriteToast(snapshot.formError);
      liveErrors.current = { ...liveErrors.current, formError: "" };
      setFormError("");
    });
  }

  function noteErrors(partial: Partial<Omit<FieldErrorSnapshot, "formError">>) {
    const next = { ...liveErrors.current, ...partial };
    liveErrors.current = next;
    scheduleBannerSync(next);
    if (partial.account) {
      setAccountErrors(partial.account);
    }
    if (partial.location) {
      setLocationErrors(partial.location);
    }
    if (partial.age !== undefined) {
      setAgeError(partial.age);
    }
    if (partial.gender !== undefined) {
      setGenderError(partial.gender);
    }
    if (partial.interest !== undefined) {
      setInterestError(partial.interest);
    }
    if (partial.companion !== undefined) {
      setCompanionError(partial.companion);
    }
  }

  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened || !user) {
      return;
    }
    const storedPhone = parseStoredPhone(user.phone);
    setForm(profileToForm(user.profile));
    setAccountName(user.name ?? "");
    setDialCode(storedPhone.dialCode);
    setAccountPhone(formatNationalPhone(storedPhone.national));
    setAccountErrors({});
    setLocationErrors({});
    setAgeError("");
    setGenderError("");
    setInterestError("");
    setCompanionError("");
    setFormError("");
    setLimitMessage("");
    setLocating(false);
    setLocationStatus("idle");
    setLocationError("");
    setSaving(false);
    savingLock.current = false;
  }, [open, user]);

  if (!open || !user) {
    return null;
  }

  function requestClose() {
    if (saving || document.documentElement.classList.contains("onboarding-menu-open")) {
      return;
    }
    onClose();
  }

  function onUseLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Tu navegador no permite usar la ubicación.");
      return;
    }
    setLocating(true);
    setLocationStatus("loading");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const match = await reverseGeocodeColombia(position.coords.latitude, position.coords.longitude);
            setForm((current) => {
              const withCoords = {
                ...current,
                country: "Colombia",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              if (!match) {
                noteErrors({ location: keepLocationErrors(liveErrors.current.location, withCoords) });
                return withCoords;
              }
              const withDepartment = applyDepartmentChange(withCoords, match.department);
              const nextForm = applyCityChange(withDepartment, match.municipality);
              noteErrors({ location: keepLocationErrors(liveErrors.current.location, nextForm) });
              return nextForm;
            });
            setLocationStatus("success");
          } catch {
            setLocationStatus("error");
            setLocationError("No pudimos leer tu ubicación. Complétala en el formulario.");
          } finally {
            setLocating(false);
          }
        })();
      },
      () => {
        setLocating(false);
        setLocationStatus("error");
        setLocationError("Necesitamos permiso para usar tu ubicación.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  function onLocationChange(next: OnboardingForm) {
    setForm(next);
    noteErrors({ location: keepLocationErrors(liveErrors.current.location, next) });
  }

  function toggleInterest(value: string) {
    setForm((current) => {
      const result = toggleMulti(current.interests, value, PRIMARY_INTEREST_MAX);
      if (result.limited) {
        setLimitMessage("Puedes seleccionar máximo 5 intereses.");
        return current;
      }
      setLimitMessage("");
      const nextInterest = liveErrors.current.interest ? interestProblem(result.next) : "";
      noteErrors({ interest: nextInterest });
      return { ...current, interests: result.next };
    });
  }

  function togglePreference(field: PrefField, value: string, multiple: boolean) {
    setForm((current) => ({
      ...current,
      [field]: multiple ? toggleMulti(current[field], value).next : toggleSingle(current[field], value),
    }));
  }

  async function onSave() {
    if (savingLock.current) {
      return;
    }
    const nextAgeError = validateAccountAge(form.age);
    const nextGenderError = genderProblem(form.gender);
    const nextLocation = locationProblems(form);
    const nextInterest = interestProblem(form.interests);
    const nextCompanion = form.companions.length < 1 ? "Elige al menos una compañía." : "";
    const nextErrors = {
      name: validateAccountName(accountName) || undefined,
      phone: validateDialPhone(dialCode, accountPhone) || undefined,
    };
    setAccountErrors(nextErrors);
    setLocationErrors(nextLocation);
    setAgeError(nextAgeError);
    setGenderError(nextGenderError);
    setInterestError(nextInterest);
    setCompanionError(nextCompanion);
    const firstInvalid = [
      nextErrors.name ? "profile-edit-name" : "",
      nextLocation.country ? "location-country" : "",
      nextLocation.department ? "location-department" : "",
      nextLocation.city ? "location-city" : "",
      nextLocation.neighborhood ? "onboarding-neighborhood" : "",
      nextLocation.address ? "onboarding-address" : "",
      nextErrors.phone ? "profile-edit-phone" : "",
      nextAgeError ? "profile-edit-age" : "",
      nextGenderError ? "profile-edit-gender" : "",
      nextInterest ? "profile-edit-interests" : "",
      nextCompanion ? "profile-edit-companions" : "",
    ].find(Boolean);
    if (firstInvalid) {
      liveErrors.current = {
        account: nextErrors,
        location: nextLocation,
        age: nextAgeError,
        gender: nextGenderError,
        interest: nextInterest,
        companion: nextCompanion,
        formError: SAVE_BLOCKED,
      };
      setFormError(SAVE_BLOCKED);
      showFavoriteToast(SAVE_BLOCKED, "error");
      scrollToField(firstInvalid);
      return;
    }
    savingLock.current = true;
    setSaving(true);
    setFormError("");
    try {
      await updateProfile({
        name: accountName.trim(),
        phone: phoneStorageValue(dialCode, nationalPhoneDigits(accountPhone)),
      });
      await saveOnboardingProfile(form, true);
      await refresh();
      showFavoriteToast("Perfil actualizado correctamente");
      onClose();
    } catch (error) {
      savingLock.current = false;
      setSaving(false);
      applyServerError(error);
    }
  }

  function applyServerError(error: unknown) {
    const message = getApiErrorMessage(error, SAVE_UNEXPECTED);
    const fields = getApiErrorFields(error);
    const targets: string[] = [];
    let mapped = false;
    fields.forEach((item) => {
      if (item.field === "name") {
        setAccountErrors((current) => ({ ...current, name: item.message }));
        targets.push("profile-edit-name");
        mapped = true;
      }
      if (item.field === "phone") {
        setAccountErrors((current) => ({ ...current, phone: item.message }));
        targets.push("profile-edit-phone");
        mapped = true;
      }
      if (item.field === "country") {
        setLocationErrors((current) => ({ ...current, country: item.message }));
        targets.push("location-country");
        mapped = true;
      }
      if (item.field === "department") {
        setLocationErrors((current) => ({ ...current, department: item.message }));
        targets.push("location-department");
        mapped = true;
      }
      if (item.field === "city") {
        setLocationErrors((current) => ({ ...current, city: item.message }));
        targets.push("location-city");
        mapped = true;
      }
      if (item.field === "age") {
        setAgeError(item.message);
        targets.push("profile-edit-age");
        mapped = true;
      }
      if (item.field === "gender") {
        setGenderError(item.message);
        targets.push("profile-edit-gender");
        mapped = true;
      }
      if (item.field === "neighborhood") {
        setLocationErrors((current) => ({ ...current, neighborhood: item.message }));
        targets.push("onboarding-neighborhood");
        mapped = true;
      }
      if (item.field === "addressReference" || item.field === "address") {
        setLocationErrors((current) => ({ ...current, address: item.message }));
        targets.push("onboarding-address");
        mapped = true;
      }
    });
    if (/intereses/i.test(message)) {
      setInterestError(message);
      targets.push("profile-edit-interests");
      mapped = true;
    }
    if (/compañía/i.test(message)) {
      setCompanionError(message);
      targets.push("profile-edit-companions");
      mapped = true;
    }
    if (/país es obligatorio/i.test(message)) {
      setLocationErrors((current) => ({ ...current, country: message }));
      targets.push("location-country");
      mapped = true;
    }
    if (/departamento y la ciudad/i.test(message)) {
      setLocationErrors((current) => ({
        ...current,
        department: form.department.trim() ? current.department : "Selecciona un departamento.",
        city: form.city.trim() ? current.city : "Selecciona una ciudad o municipio.",
      }));
      targets.push(form.department.trim() ? "location-city" : "location-department");
      mapped = true;
    }
    if (/teléfono|número de |número solo/i.test(message)) {
      setAccountErrors((current) => ({ ...current, phone: current.phone || message }));
      targets.push("profile-edit-phone");
      mapped = true;
    }
    const banner = mapped ? SAVE_BLOCKED : message || SAVE_UNEXPECTED;
    liveErrors.current = { ...liveErrors.current, formError: banner };
    setFormError(banner);
    showFavoriteToast(banner, "error");
    const order = [
      "profile-edit-name",
      "location-country",
      "location-department",
      "location-city",
      "onboarding-neighborhood",
      "onboarding-address",
      "profile-edit-phone",
      "profile-edit-age",
      "profile-edit-gender",
      "profile-edit-interests",
      "profile-edit-companions",
    ];
    const first = order.find((id) => targets.includes(id));
    if (first) {
      scrollToField(first);
    }
  }

  const primaryCount = countPrimaryInterests(form.interests);

  return (
    <AuthForgotModalLayout titleId={titleId} className="profile-edit-modal" onClose={requestClose}>
      <div className="profile-edit-modal__scroll">
      <header className="profile-edit-modal__header">
        <AuthKeyIcon className="auth-recovery-icon" />
        <h1 id={titleId} className="dash-profile__name">
          Editar perfil
        </h1>
      </header>
      <div className="profile-edit-modal__body">
        <section className="profile-edit-section" aria-labelledby="profile-edit-data-title">
          <h2 id="profile-edit-data-title" className="dash-exps-dossier__kicker">
            Mis datos
          </h2>
          <EditAccountFields
            name={accountName}
            phone={accountPhone}
            email=""
            showEmail={false}
            errors={accountErrors}
            age={form.age}
            gender={form.gender}
            ageError={ageError}
            genderError={genderError}
            dialCode={dialCode}
            onDialCode={(code) => {
              setDialCode(code);
              noteErrors({
                account: {
                  ...liveErrors.current.account,
                  phone: validateDialPhone(code, accountPhone) || undefined,
                },
              });
            }}
            onAge={(value) => {
              setForm((current) => ({ ...current, age: value }));
              noteErrors({ age: validateAccountAge(value) });
            }}
            onAgeRejected={() => noteErrors({ age: "La edad solo puede contener números." })}
            onGender={(value) => {
              setForm((current) => ({ ...current, gender: value }));
              noteErrors({
                gender: liveErrors.current.gender ? genderProblem(value) : "",
              });
            }}
            onName={(value) => {
              setAccountName(value);
              if (!liveErrors.current.account.name) {
                scheduleBannerSync();
                return;
              }
              noteErrors({
                account: {
                  ...liveErrors.current.account,
                  name: validateAccountName(value) || undefined,
                },
              });
            }}
            onPhone={(value) => {
              setAccountPhone(value);
              noteErrors({
                account: {
                  ...liveErrors.current.account,
                  phone: validateDialPhone(dialCode, value) || undefined,
                },
              });
            }}
            onPhoneRejected={() =>
              noteErrors({
                account: {
                  ...liveErrors.current.account,
                  phone: "El número solo puede contener números.",
                },
              })
            }
            afterName={
              <LocationStep
                form={form}
                locating={locating}
                locationStatus={locationStatus}
                locationError={locationError}
                fieldErrors={locationErrors}
                onChange={onLocationChange}
                onUseLocation={onUseLocation}
                labels={{
                  department: "Departamento",
                  neighborhood: "Barrio",
                  neighborhoodPlaceholder: "Escribe tu barrio",
                  address: "Dirección de referencia",
                  addressPlaceholder: "Ej. Cerca al parque",
                }}
              />
            }
          />
        </section>

        <section className="profile-edit-section" aria-labelledby="profile-edit-prefs-title">
          <h2 id="profile-edit-prefs-title" className="dash-exps-dossier__kicker">
            Mis preferencias
          </h2>
          <div className="profile-edit-blocks">
            <div className="profile-edit-block" id="profile-edit-interests">
              <h3 className="profile-edit-block__title">Intereses</h3>
              <p className="profile-edit-block__hint">
                Selecciona entre 3 y 5 intereses. {primaryCount} de {PRIMARY_INTEREST_MAX} seleccionados.
              </p>
              {limitMessage ? (
                <p className="onboarding-error" role="status">
                  {limitMessage}
                </p>
              ) : null}
              {interestError ? (
                <p className="onboarding-error" role="alert">
                  {interestError}
                </p>
              ) : null}
              <div className="onboarding-chips">
                {INTEREST_OPTIONS.map((option) => (
                  <OnboardingOptionCard
                    key={option.value}
                    variant="chip"
                    label={option.label}
                    icon={option.icon}
                    selected={form.interests.includes(option.value)}
                    onSelect={() => toggleInterest(option.value)}
                  />
                ))}
              </div>
            </div>

            {PREFERENCE_SECTIONS.slice(0, 2).map((section) => {
              const group = PREFERENCE_GROUPS.find((item) => item.id === section.groupId);
              if (!group) {
                return null;
              }
              const field = group.id === "ambientes" ? "places" : group.id === "musica" ? "music" : group.id === "presupuesto" ? "budget" : "climate";
              return (
                <div className="profile-edit-block" key={section.groupId}>
                  <h3 className="profile-edit-block__title">{section.title}</h3>
                  <p className="profile-edit-block__hint">{group.hint}</p>
                  <div className="onboarding-chips">
                    {group.options.map((option) => (
                      <OnboardingOptionCard
                        key={option.value}
                        variant="chip"
                        label={option.label}
                        icon={option.icon}
                        selected={form[field].includes(option.value)}
                        onSelect={() => togglePreference(field, option.value, group.multiple)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="profile-edit-block" id="profile-edit-companions">
              <h3 className="profile-edit-block__title">Compañía</h3>
              <p className="profile-edit-block__hint">Elige una o varias opciones.</p>
              {companionError ? (
                <p className="onboarding-error" role="alert">
                  {companionError}
                </p>
              ) : null}
              <div className="onboarding-chips">
                {COMPANY_OPTIONS.map((option) => (
                  <OnboardingOptionCard
                    key={option.value}
                    variant="chip"
                    label={option.label}
                    icon={option.icon}
                    selected={form.companions.includes(option.value)}
                    onSelect={() =>
                      setForm((current) => {
                        const next = toggleMulti(current.companions, option.value).next;
                        const nextError = liveErrors.current.companion && next.length > 0 ? "" : liveErrors.current.companion;
                        noteErrors({ companion: nextError });
                        return { ...current, companions: next };
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {PREFERENCE_SECTIONS.slice(2).map((section) => {
              const group = PREFERENCE_GROUPS.find((item) => item.id === section.groupId);
              if (!group) {
                return null;
              }
              const field: PrefField = group.id === "musica" ? "music" : "climate";
              return (
                <div className="profile-edit-block" key={section.groupId}>
                  <h3 className="profile-edit-block__title">{section.title}</h3>
                  <p className="profile-edit-block__hint">{group.hint}</p>
                  <div className="onboarding-chips">
                    {group.options.map((option) => (
                      <OnboardingOptionCard
                        key={option.value}
                        variant="chip"
                        label={option.label}
                        icon={option.icon}
                        selected={form[field].includes(option.value)}
                        onSelect={() => togglePreference(field, option.value, group.multiple)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      </div>
      <footer className="profile-edit-modal__footer">
        {formError ? (
          <p className="onboarding-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="profile-edit-modal__actions">
          <Button type="button" variant="secondary" disabled={saving} onClick={requestClose}>
            Cancelar
          </Button>
          <button type="button" className="tourist-hero__cta" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </footer>
    </AuthForgotModalLayout>
  );
}
