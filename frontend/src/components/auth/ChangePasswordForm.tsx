import { FormEvent, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { PasswordRequirements } from "./PasswordRequirements";
import { SuccessConfirm } from "../feedback/SuccessConfirm";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import passwordUpdated from "../../assets/images/password-updated.png";
import "../../styles/auth-interactive.css";

const POLICY = [
  { test: (value: string) => value.length >= 8, message: "La contraseña debe tener al menos 8 caracteres." },
  { test: (value: string) => /[A-Z]/.test(value), message: "Debe incluir al menos una mayúscula." },
  { test: (value: string) => /[a-z]/.test(value), message: "Debe incluir al menos una minúscula." },
  { test: (value: string) => /[0-9]/.test(value), message: "Debe incluir al menos un número." },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), message: "Debe incluir al menos un símbolo." },
];

export function ChangePasswordForm({
  titleId = "change-password-title",
  layout = "page",
  onCancel,
  onComplete,
}: {
  titleId?: string;
  layout?: "page" | "modal";
  onCancel: () => void;
  onComplete: () => void;
}) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof fieldErrors = {};
    if (!currentPassword) {
      next.currentPassword = "Ingresa tu contraseña actual.";
    }
    if (!password) {
      next.password = "Ingresa la nueva contraseña.";
    } else {
      const failed = POLICY.find((rule) => !rule.test(password));
      if (failed) {
        next.password = failed.message;
      } else if (password === currentPassword) {
        next.password = "La nueva contraseña debe ser distinta a la actual.";
      }
    }
    if (!confirmPassword) {
      next.confirmPassword = "Confirma tu contraseña.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Las contraseñas no coinciden.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setSaving(true);
    setToast(null);
    try {
      await changePassword({ currentPassword, password, confirmPassword });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setConfirmed(true);
    } catch (err) {
      setToast(getApiErrorMessage(err, "No se pudo actualizar la contraseña."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form
        className={layout === "page" ? "dash-team-invite dash-password__form" : "dash-team-invite dash-password__form profile-password-modal__form"}
        style={{ ["--auth-forest" as string]: "#294942", ["--auth-muted" as string]: "#7a7368" }}
        onSubmit={(event) => void onSubmit(event)}
        noValidate
      >
        {toast ? (
          <p className={`dash-team-toast is-error dash-team-invite__full${layout === "modal" ? " profile-password-modal__error" : ""}`} role="status">
            {toast}
          </p>
        ) : null}
        <div className="dash-profile__identity dash-team-invite__full">
          <h1 id={titleId} className="dash-profile__name">
            Cambiar contraseña
          </h1>
          <p className="dash-section__lead">Actualiza tu contraseña para mantener segura tu cuenta.</p>
        </div>
        <div className="dash-team-invite__full">
          <Input
            label="Contraseña actual"
            type="password"
            passwordToggle
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={fieldErrors.currentPassword}
            required
          />
        </div>
        <div className="dash-team-invite__full">
          <Input
            label="Nueva contraseña"
            type="password"
            passwordToggle
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          <PasswordRequirements value={password} />
        </div>
        <div className="dash-team-invite__full">
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            passwordToggle
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>
        <div className="dash-password__actions">
          {layout === "modal" ? (
            <button type="submit" className="tourist-hero__cta" disabled={saving}>
              {saving ? "Guardando..." : "Actualizar contraseña"}
            </button>
          ) : (
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Actualizar contraseña"}
            </Button>
          )}
          <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
      <SuccessConfirm
        open={confirmed}
        image={passwordUpdated}
        title="¡Contraseña actualizada!"
        text="Tu contraseña se ha cambiado correctamente."
        actionLabel="Aceptar"
        actionClassName={layout === "modal" ? "tourist-hero__cta" : undefined}
        onClose={onComplete}
      />
    </>
  );
}
