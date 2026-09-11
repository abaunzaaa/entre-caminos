import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoEntreCaminos from "../../assets/logo.png";
import { CompanyStep } from "../../components/onboarding/CompanyStep";
import { LocationStep } from "../../components/onboarding/LocationStep";
import { OnboardingActions } from "../../components/onboarding/OnboardingActions";
import { OnboardingOptionCard } from "../../components/onboarding/OnboardingOptionCard";
import { OnboardingStepper } from "../../components/onboarding/OnboardingStepper";
import { PreferencesStep } from "../../components/onboarding/PreferencesStep";
import { ProfileStep } from "../../components/onboarding/ProfileStep";
import { SummaryStep } from "../../components/onboarding/SummaryStep";
import { INTEREST_OPTIONS } from "../../data/onboarding";
import { useAuth } from "../../hooks/useAuth";
import {
  deleteOnboardingPhoto,
  saveOnboardingProfile,
  uploadOnboardingPhoto,
} from "../../services/onboarding.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { reverseGeocodeColombia } from "../../utils/geocode";
import {
  ONBOARDING_STEPS,
  PRIMARY_INTEREST_MAX,
  PRIMARY_INTEREST_MIN,
  applyCityChange,
  applyDepartmentChange,
  countPrimaryInterests,
  emptyOnboardingForm,
  getOnboardingResumeStep,
  isLocationComplete,
  isPhotoStepComplete,
  profileToForm,
  toggleMulti,
  toggleSingle,
  type OnboardingForm,
  validateOnboardingPhoto,
} from "../../utils/onboarding";

const COPY = [
  { title: "¿Dónde quieres comenzar?", lead: "Cuéntanos dónde estás para acercarte mejores experiencias." },
  { title: "Hazlo más tuyo", lead: "Elige cómo quieres presentarte en Entre Caminos." },
  { title: "¿Qué te gustaría descubrir?", lead: "Elige entre 3 y 5 intereses." },
  { title: "¿Con quién disfrutas tus planes?", lead: "Elige una o varias opciones." },
  { title: "Detalles que hacen la diferencia", lead: "Ayúdanos a afinar tus recomendaciones." },
  { title: "Todo listo", lead: "Así se verá tu perfil en Entre Caminos." },
] as const;

export function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const savingLock = useRef(false);
  const [form, setForm] = useState<OnboardingForm>(emptyOnboardingForm);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"face" | "hair" | "outfit" | "accessories">("face");
  const [prefTab, setPrefTab] = useState<"ambientes" | "musica" | "presupuesto" | "clima">("ambientes");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [formError, setFormError] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const next = profileToForm(user?.profile);
    setForm((current) => ({ ...next, localPhotoUrl: current.localPhotoUrl }));
    setHydrated(true);
  }, [user?.id, user?.profile?.updatedAt]);

  useEffect(() => {
    const next = profileToForm(user?.profile);
    setStep(user?.profile?.onboardingCompleted ? 6 : getOnboardingResumeStep(next));
  }, [user?.id]);

  const primaryCount = countPrimaryInterests(form.interests);
  const copy = COPY[step - 1] ?? COPY[0];
  const canContinue =
    (step === 1 && isLocationComplete(form)) ||
    (step === 2 && isPhotoStepComplete(form) && (form.profileImageType === "AVATAR" || Boolean(form.profileImageUrl))) ||
    (step === 3 && primaryCount >= PRIMARY_INTEREST_MIN) ||
    (step === 4 && form.companions.length > 0) ||
    step === 5 ||
    step === 6;

  function goTo(next: number) {
    setFormError("");
    setLimitMessage("");
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  }

  async function persistDraft(nextForm = form) {
    await saveOnboardingProfile(nextForm, false);
    await refresh();
  }

  async function onPickFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const invalid = validateOnboardingPhoto(file);
    if (invalid) {
      setPhotoError(invalid);
      return;
    }
    pendingFile.current = file;
    const localUrl = URL.createObjectURL(file);
    setForm((current) => {
      if (current.localPhotoUrl) {
        URL.revokeObjectURL(current.localPhotoUrl);
      }
      return { ...current, profileImageType: "PHOTO", localPhotoUrl: localUrl };
    });
    await uploadSelectedPhoto(file);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  async function uploadSelectedPhoto(file: File) {
    try {
      setPhotoLoading(true);
      setPhotoError("");
      const profile = await uploadOnboardingPhoto(file);
      setForm((current) => ({
        ...current,
        profileImageType: "PHOTO",
        profileImageUrl: profile.profileImageUrl,
      }));
      await refresh();
    } catch (error) {
      setPhotoError(getApiErrorMessage(error, "No se pudo subir la foto. Puedes reintentar."));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function onUseLocation() {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite usar la ubicación.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
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
        } catch {
          setLocationError("No pudimos leer tu ubicación. Complétala en el formulario.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
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

  async function onContinue() {
    if (!canContinue) {
      return;
    }
    try {
      setFormError("");
      if (step < 6) {
        await persistDraft();
        goTo(step + 1);
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No pudimos guardar este paso. Inténtalo de nuevo."));
    }
  }

  async function onExplore() {
    if (savingLock.current) {
      return;
    }
    savingLock.current = true;
    setSaving(true);
    setFormError("");
    try {
      await saveOnboardingProfile(form, true);
      await refresh();
      navigate("/explorar", { replace: true });
    } catch (error) {
      savingLock.current = false;
      setSaving(false);
      setFormError(getApiErrorMessage(error, "No pudimos guardar tu perfil. Conservamos tus datos para reintentar."));
    }
  }

  const title = copy.title;

  const body = useMemo(() => {
    if (step === 1) {
      return (
        <LocationStep
          form={form}
          locating={locating}
          locationError={locationError}
          onChange={setForm}
          onUseLocation={() => void onUseLocation()}
        />
      );
    }
    if (step === 2) {
      return (
        <ProfileStep
          form={form}
          tab={avatarTab}
          photoLoading={photoLoading}
          photoError={photoError}
          fileInput={fileInput}
          onMode={(profileImageType) => setForm((current) => ({ ...current, profileImageType }))}
          onForm={setForm}
          onPick={(file) => void onPickFile(file)}
          onRetry={() => pendingFile.current && void uploadSelectedPhoto(pendingFile.current)}
          onRemovePhoto={() => {
            void deleteOnboardingPhoto()
              .then(() => {
                setForm((current) => {
                  if (current.localPhotoUrl) {
                    URL.revokeObjectURL(current.localPhotoUrl);
                  }
                  return { ...current, profileImageUrl: null, localPhotoUrl: null, profileImageType: "AVATAR" };
                });
                return refresh();
              })
              .catch((error) => setPhotoError(getApiErrorMessage(error, "No se pudo eliminar la foto.")));
          }}
          onTab={setAvatarTab}
        />
      );
    }
    if (step === 3) {
      return (
        <div className="onboarding-choices">
          {INTEREST_OPTIONS.map((option) => (
            <OnboardingOptionCard
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={form.interests.includes(option.value)}
              onSelect={() => toggleInterest(option.value)}
            />
          ))}
        </div>
      );
    }
    if (step === 4) {
      return (
        <CompanyStep
          selected={form.companions}
          onToggle={(value) =>
            setForm((current) => ({ ...current, companions: toggleMulti(current.companions, value).next }))
          }
        />
      );
    }
    if (step === 5) {
      return (
        <PreferencesStep
          form={form}
          tab={prefTab}
          onTab={setPrefTab}
          onToggle={(field, value, multiple) =>
            setForm((current) => ({
              ...current,
              [field]: multiple ? toggleMulti(current[field], value).next : toggleSingle(current[field], value),
            }))
          }
        />
      );
    }
    return <SummaryStep form={form} userName={user?.name ?? ""} />;
  }, [avatarTab, form, locating, locationError, photoError, photoLoading, prefTab, step, user?.name]);

  if (!hydrated) {
    return <div className="onboarding-page" />;
  }

  return (
    <div className={`onboarding-page${step === 3 ? " is-interests" : ""}`}>
      <section className="onboarding-shell" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <Link to="/" className="onboarding-header__brand" aria-label="Entre Caminos, ir al inicio">
            <img src={logoEntreCaminos} alt="Entre Caminos" />
            <span className="onboarding-header__copy">
              <strong className="onboarding-header__wordmark">Entre Caminos</strong>
              <span className="onboarding-header__kicker">Personaliza tu experiencia</span>
            </span>
          </Link>
          <div className="onboarding-header__meta">
            <span className="onboarding-header__step">
              Paso {step} de {ONBOARDING_STEPS.length}
            </span>
            <button type="button" className="onboarding-header__exit" onClick={() => setExitOpen(true)}>
              Salir
            </button>
          </div>
        </header>

        <div className="onboarding-content">
          <div className="onboarding-pane" data-dir={direction} key={step}>
            <div className="onboarding-copy">
              <h1 id="onboarding-title" className="onboarding-title">
                {title}
              </h1>
              <p className="onboarding-lead">{copy.lead}</p>
              {step === 3 ? (
                <p className="onboarding-counter" aria-live="polite">
                  {primaryCount} de {PRIMARY_INTEREST_MAX} seleccionados
                </p>
              ) : null}
              {limitMessage ? (
                <p className="onboarding-limit" role="status">
                  {limitMessage}
                </p>
              ) : null}
              {formError ? (
                <p className="onboarding-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="onboarding-body">{body}</div>
          </div>
        </div>

        <footer className="onboarding-footer">
          {step < 6 ? (
            <OnboardingActions
              backLabel="Atrás"
              onBack={() => {
                if (step === 1) {
                  setExitOpen(true);
                  return;
                }
                goTo(step - 1);
              }}
              onContinue={() => void onContinue()}
              continueDisabled={!canContinue}
            />
          ) : (
            <OnboardingActions
              backLabel="Editar preferencias"
              continueLabel={saving ? "Guardando…" : "Guardar y explorar"}
              onBack={() => goTo(5)}
              onContinue={() => void onExplore()}
              continueLoading={saving}
            />
          )}
          <OnboardingStepper currentStep={step} onStepSelect={(next) => goTo(next)} />
        </footer>
      </section>

      {exitOpen ? (
        <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-exit-title">
          <div className="onboarding-modal__card">
            <h2 id="onboarding-exit-title">¿Salir del perfil?</h2>
            <p>Podrás continuar más tarde. El catálogo se abre cuando el perfil esté completo.</p>
            <div className="onboarding-modal__actions">
              <button type="button" className="onboarding-nav__btn onboarding-nav__btn--ghost" onClick={() => setExitOpen(false)}>
                Seguir personalizando
              </button>
              <button
                type="button"
                className="onboarding-nav__btn onboarding-nav__btn--primary"
                onClick={() => navigate("/", { replace: true })}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
