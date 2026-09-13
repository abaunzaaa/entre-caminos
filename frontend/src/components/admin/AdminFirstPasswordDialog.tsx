import { FormEvent, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { Input } from "../ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import "../../styles/auth-recovery-modal.css";
import "../../styles/contact-modal.css";

/** Modal obligatorio para el primer acceso de un administrador. */
export function AdminFirstPasswordDialog({ open }: { open: boolean }) {
  const { changePassword } = useAuth();
  const titleId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);

  if (!open) {
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const next: typeof fieldErrors = {};
    if (password.length < 8) {
      next.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Confirma la contraseña.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Las contraseñas no coinciden.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    try {
      setSaving(true);
      await changePassword({ password, confirmPassword });
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar la contraseña."));
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="contact-success contact-success--subtle" role="presentation">
      <div
        className="contact-success__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-copy`}
      >
        <div className="contact-success__media" aria-hidden="true">
          <AuthKeyIcon className="auth-reset-success__mark" />
        </div>
        <h2 id={titleId} className="contact-success__title">
          Cambia tu contraseña
        </h2>
        <p id={`${titleId}-copy`} className="contact-success__text">
          Es tu primer acceso. Elige una contraseña nueva para continuar en el panel.
        </p>
        <form className="admin-first-password" onSubmit={(event) => void onSubmit(event)} noValidate>
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          <Input
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />
          {error ? <p className="admin-first-password__error">{error}</p> : null}
          <button type="submit" className="contact-success__action admin-cta" disabled={saving}>
            {saving ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
