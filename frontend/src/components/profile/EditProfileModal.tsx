import { useEffect, useId, useRef, useState } from "react";
import { AuthForgotModalLayout } from "../auth/AuthForgotModalLayout";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { LocationStep, type LocationStatus } from "../onboarding/LocationStep";
import { OnboardingOptionCard } from "../onboarding/OnboardingOptionCard";
import {
  EditAccountFields,
  compactPhone,
  formatPhoneDisplay,
  validateAccountAge,
  validateAccountName,
  validateAccountPhone,
} from "../onboarding/EditAccountFields";
import { Button } from "../ui/Button";
import { COMPANY_OPTIONS, INTEREST_OPTIONS, PREFERENCE_GROUPS } from "../../data/onboarding";
import { useAuth } from "../../hooks/useAuth";
import { showFavoriteToast } from "../../services/favorites-sync";
import { saveOnboardingProfile } from "../../services/onboarding.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { reverseGeocodeColombia } from "../../utils/geocode";
import {
  PRIMARY_INTEREST_MAX,
  applyCityChange,
  applyDepartmentChange,
  countPrimaryInterests,
  profileToForm,
  toggleMulti,
  toggleSingle,
  type OnboardingForm,
} from "../../utils/onboarding";
import "../../styles/onboarding.css";
import "../../styles/profile-view.css";

type PrefField = keyof Pick<OnboardingForm, "places" | "music" | "budget" | "climate">;

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
  const [form, setForm] = useState<OnboardingForm>(() => profileToForm(user?.profile));
  const [accountName, setAccountName] = useState(user?.name ?? "");
  const [accountPhone, setAccountPhone] = useState(() => formatPhoneDisplay(user?.phone ?? ""));
  const [accountErrors, setAccountErrors] = useState<{ name?: string; phone?: string }>({});
  const [ageError, setAgeError] = useState("");
  const [formError, setFormError] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState("");
  const [saving, setSaving] = useState(false);

  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!justOpened || !user) {
      return;
    }
    setForm(profileToForm(user.profile));
    setAccountName(user.name ?? "");
    setAccountPhone(formatPhoneDisplay(user.phone ?? ""));
    setAccountErrors({});
    setAgeError("");
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
                return withCoords;
              }
              const withDepartment = applyDepartmentChange(withCoords, match.department);
              return applyCityChange(withDepartment, match.municipality);
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

  function toggleInterest(value: string) {
    setForm((current) => {
      const result = toggleMulti(current.interests, value, PRIMARY_INTEREST_MAX);
      setLimitMessage(result.limited ? "Puedes elegir hasta 5 intereses." : "");
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
    savingLock.current = true;
    setSaving(true);
    setFormError("");
    const nextAgeError = validateAccountAge(form.age);
    const nextErrors = {
      name: validateAccountName(accountName) || undefined,
      phone: validateAccountPhone(accountPhone) || undefined,
    };
    setAccountErrors(nextErrors);
    setAgeError(nextAgeError);
    if (nextErrors.name || nextErrors.phone || nextAgeError) {
      savingLock.current = false;
      setSaving(false);
      return;
    }
    try {
      await updateProfile({
        name: accountName.trim(),
        phone: compactPhone(accountPhone) || null,
      });
      await saveOnboardingProfile(form, true);
      await refresh();
      showFavoriteToast("Perfil actualizado correctamente");
      onClose();
    } catch (error) {
      savingLock.current = false;
      setSaving(false);
      showFavoriteToast("No se pudo actualizar el perfil correctamente");
      setFormError(getApiErrorMessage(error, "No pudimos guardar tu perfil. Conservamos tus datos para reintentar."));
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
            onAge={(value) => {
              setForm((current) => ({ ...current, age: value }));
              setAgeError(validateAccountAge(value));
            }}
            onAgeRejected={() => setAgeError("La edad solo puede contener números.")}
            onGender={(value) => setForm((current) => ({ ...current, gender: value }))}
            onName={(value) => {
              setAccountName(value);
              if (accountErrors.name) {
                setAccountErrors((current) => ({
                  ...current,
                  name: validateAccountName(value) || undefined,
                }));
              }
            }}
            onPhone={(value) => {
              setAccountPhone(value);
              setAccountErrors((current) => ({
                ...current,
                phone: validateAccountPhone(value) || undefined,
              }));
            }}
            onPhoneRejected={() =>
              setAccountErrors((current) => ({
                ...current,
                phone: "El número solo puede contener números.",
              }))
            }
            afterName={
              <LocationStep
                form={form}
                locating={locating}
                locationStatus={locationStatus}
                locationError={locationError}
                onChange={setForm}
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
            <div className="profile-edit-block">
              <h3 className="profile-edit-block__title">Intereses</h3>
              <p className="profile-edit-block__hint">
                Elige entre 3 y 5 intereses. {primaryCount} de {PRIMARY_INTEREST_MAX} seleccionados.
              </p>
              {limitMessage ? (
                <p className="onboarding-limit" role="status">
                  {limitMessage}
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

            <div className="profile-edit-block">
              <h3 className="profile-edit-block__title">Compañía</h3>
              <p className="profile-edit-block__hint">Elige una o varias opciones.</p>
              <div className="onboarding-chips">
                {COMPANY_OPTIONS.map((option) => (
                  <OnboardingOptionCard
                    key={option.value}
                    variant="chip"
                    label={option.label}
                    icon={option.icon}
                    selected={form.companions.includes(option.value)}
                    onSelect={() =>
                      setForm((current) => ({
                        ...current,
                        companions: toggleMulti(current.companions, option.value).next,
                      }))
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
