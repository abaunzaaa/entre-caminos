import { useState, type ReactNode } from "react";
import { Cake, Mail, Phone, UserRound, VenusAndMars } from "lucide-react";
import { PROFILE_GENDERS } from "../../data/onboarding";
import { OnboardingSelect } from "./OnboardingSelect";

export function compactPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\+/g, "")}`;
  }
  return compact.replace(/\+/g, "");
}

export function formatPhoneDisplay(value: string) {
  const compact = compactPhone(value);
  if (!compact) {
    return "";
  }
  const hasCountry = compact.startsWith("+57");
  const national = hasCountry ? compact.slice(3) : compact.startsWith("+") ? compact.slice(1) : compact;
  if (/^3\d{0,9}$/.test(national) || /^60\d{0,8}$/.test(national)) {
    const groups = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 10)].filter(Boolean);
    return `${hasCountry ? "+57 " : ""}${groups.join(" ")}`;
  }
  return compact;
}

function isValidColombianPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  const national = compact.startsWith("+57") ? compact.slice(3) : compact;
  return /^3\d{9}$/.test(national) || /^60\d{8}$/.test(national);
}

export function validateAccountName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "El nombre es obligatorio";
  }
  if (trimmed.length < 2) {
    return "El nombre debe tener al menos 2 caracteres";
  }
  if (trimmed.length > 80) {
    return "El nombre es demasiado largo";
  }
  return "";
}

export function validateAccountPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(trimmed)) {
    return "El número solo puede contener números.";
  }
  if (trimmed.length > 20) {
    return "El teléfono es demasiado largo";
  }
  if (!isValidColombianPhone(trimmed)) {
    return "Ingresa un teléfono colombiano válido. Ejemplo: 300 123 4567";
  }
  return "";
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function validateAccountAge(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/\D/.test(trimmed)) {
    return "La edad solo puede contener números.";
  }
  const age = Number(trimmed);
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return "Ingresa una edad válida entre 1 y 120 años.";
  }
  return "";
}

export function EditAccountFields({
  name,
  phone,
  email,
  errors,
  onName,
  onPhone,
  onPhoneRejected,
  afterName,
  showEmail = true,
  age,
  gender,
  ageError,
  onAge,
  onAgeRejected,
  onGender,
}: {
  name: string;
  phone: string;
  email: string;
  errors: { name?: string; phone?: string };
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onPhoneRejected?: () => void;
  afterName?: ReactNode;
  showEmail?: boolean;
  age?: string;
  gender?: string;
  ageError?: string;
  onAge?: (value: string) => void;
  onAgeRejected?: () => void;
  onGender?: (value: string) => void;
}) {
  const [genderOpen, setGenderOpen] = useState(false);

  return (
    <div className="onboarding-account">
      <label className="onboarding-field">
        <span className="onboarding-field__icon" aria-hidden="true">
          <UserRound size={20} strokeWidth={1.6} />
        </span>
        <span className="onboarding-field__copy">
          <span className="onboarding-field__label">Nombre</span>
          <span className="onboarding-control">
            <input
              id="profile-edit-name"
              name="name"
              value={name}
              maxLength={80}
              autoComplete="name"
              onChange={(event) => onName(event.target.value)}
            />
          </span>
        </span>
      </label>
      {errors.name ? <p className="onboarding-error">{errors.name}</p> : null}
      {afterName}
      {showEmail ? (
        <>
          <label className="onboarding-field">
            <span className="onboarding-field__icon" aria-hidden="true">
              <Mail size={20} strokeWidth={1.6} />
            </span>
            <span className="onboarding-field__copy">
              <span className="onboarding-field__label">Correo</span>
              <span className="onboarding-control">
                <input value={email} readOnly aria-readonly="true" />
              </span>
            </span>
          </label>
          <p className="onboarding-account__hint">El correo requiere verificación y no puede modificarse aquí.</p>
        </>
      ) : null}
      <label className="onboarding-field">
        <span className="onboarding-field__icon" aria-hidden="true">
          <Phone size={20} strokeWidth={1.6} />
        </span>
        <span className="onboarding-field__copy">
          <span className="onboarding-field__label">Número</span>
          <span className="onboarding-control">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="300 123 4567"
              maxLength={16}
              value={phone}
              onChange={(event) => {
                const raw = event.target.value;
                const hadLetter = /[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(raw);
                onPhone(formatPhoneDisplay(raw.replace(/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/g, "")));
                if (hadLetter) {
                  onPhoneRejected?.();
                }
              }}
            />
          </span>
        </span>
      </label>
      {errors.phone ? <p className="onboarding-error">{errors.phone}</p> : null}
      {onAge && onGender ? (
        <>
          <label className="onboarding-field">
            <span className="onboarding-field__icon" aria-hidden="true">
              <Cake size={20} strokeWidth={1.6} />
            </span>
            <span className="onboarding-field__copy">
              <span className="onboarding-field__label">Edad</span>
              <span className="onboarding-control">
                <input
                  name="age"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej. 28"
                  maxLength={3}
                  value={age}
                  onChange={(event) => {
                    const raw = event.target.value;
                    onAge(digitsOnly(raw).slice(0, 3));
                    if (/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(raw)) {
                      onAgeRejected?.();
                    }
                  }}
                />
              </span>
            </span>
          </label>
          {ageError ? <p className="onboarding-error">{ageError}</p> : null}
          <OnboardingSelect
            label="Género"
            icon={VenusAndMars}
            value={gender ?? ""}
            placeholder="Selecciona una opción"
            options={PROFILE_GENDERS.map((value) => ({ value, label: value }))}
            allowEmpty={true}
            searchable={false}
            open={genderOpen}
            onOpenChange={setGenderOpen}
            onChange={onGender}
          />
        </>
      ) : (
        <>
          <div className="onboarding-account__missing">
            <span>Edad</span>
            <strong>No registrado</strong>
          </div>
          <div className="onboarding-account__missing">
            <span>Género</span>
            <strong>No registrado</strong>
          </div>
        </>
      )}
    </div>
  );
}
