import { FormEvent, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthForgotModalLayout } from "../auth/AuthForgotModalLayout";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { AuthTextField } from "../auth/AuthTextField";
import { PasswordRequirements } from "../auth/PasswordRequirements";
import { Button } from "../ui/Button";
import { SuccessConfirm } from "../feedback/SuccessConfirm";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import passwordUpdated from "../../assets/images/password-updated.png";
import "../../styles/auth-recovery-modal.css";
import "../../styles/auth-interactive.css";

const POLICY = [
  { test: (value: string) => value.length >= 8, message: "La contraseña debe tener al menos 8 caracteres." },
  { test: (value: string) => /[A-Z]/.test(value), message: "Debe incluir al menos una mayúscula." },
  { test: (value: string) => /[a-z]/.test(value), message: "Debe incluir al menos una minúscula." },
  { test: (value: string) => /[0-9]/.test(value), message: "Debe incluir al menos un número." },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), message: "Debe incluir al menos un símbolo." },
];

export function AdminChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const titleId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving && !confirmed) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving, confirmed]);

  if (!open && !confirmed) {
    return null;
  }

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
    setFormError("");
    if (Object.keys(next).length > 0) {
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, password, confirmPassword });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setConfirmed(true);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo actualizar la contraseña."));
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    setConfirmed(false);
    onClose();
    if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
      navigate("/admin");
    }
  }

  return (
    <>
      {open && !confirmed ? (
        <AuthForgotModalLayout titleId={titleId} onClose={() => !saving && onClose()}>
                <div className="auth-form auth-form--change-password">
                  <AuthKeyIcon className="auth-recovery-icon" />
                  <header className="auth-form__header">
                    <h1 id={titleId} className="auth-form__title">
                      Cambiar contraseña
                    </h1>
                    <p className="auth-form__lead">Actualiza tu contraseña para mantener segura tu cuenta.</p>
                  </header>
                  <form className="auth-form__stack" onSubmit={(event) => void onSubmit(event)} noValidate>
                    <AuthTextField
                      name="currentPassword"
                      type="password"
                      label="Contraseña actual"
                      autoComplete="current-password"
                      value={currentPassword}
                      error={fieldErrors.currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                    <AuthTextField
                      name="password"
                      type="password"
                      label="Nueva contraseña"
                      autoComplete="new-password"
                      value={password}
                      error={fieldErrors.password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <PasswordRequirements value={password} />
                    <AuthTextField
                      name="confirmPassword"
                      type="password"
                      label="Confirmar nueva contraseña"
                      autoComplete="new-password"
                      value={confirmPassword}
                      error={fieldErrors.confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    {formError ? (
                      <p className="auth-error" role="alert">
                        {formError}
                      </p>
                    ) : null}
                    <div className="auth-change-actions">
                      <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                        Cancelar
                      </Button>
                      <button type="submit" className="auth-submit" disabled={saving}>
                        {saving ? "Actualizando..." : "Cambiar contraseña"}
                      </button>
                    </div>
                  </form>
                </div>
        </AuthForgotModalLayout>
      ) : null}
      <SuccessConfirm
        open={confirmed}
        image={passwordUpdated}
        title="¡Contraseña actualizada!"
        text="Tu contraseña se ha cambiado correctamente."
        actionLabel="Aceptar"
        onClose={finish}
      />
    </>
  );
}
