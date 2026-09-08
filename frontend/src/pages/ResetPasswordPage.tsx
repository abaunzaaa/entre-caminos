import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthRecoveryLayout } from "../components/auth/AuthRecoveryLayout";
import { AuthTextField } from "../components/auth/AuthTextField";
import { resetPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import {
  PASSWORD_HINT,
  validateResetPasswordForm,
  type ResetPasswordFieldErrors,
} from "../utils/register-validation";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState(() =>
    token ? "" : "Falta el enlace de recuperación. Solicítalo de nuevo.",
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success) {
      return;
    }

    setFormError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const errors = validateResetPasswordForm({ password, confirmPassword });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!token) {
      setFormError("Falta el enlace de recuperación. Solicítalo de nuevo.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err) {
      const mapped = mapResetError(err);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthRecoveryLayout>
        <div className="auth-form auth-success">
          <h1 className="auth-form__title">Contraseña actualizada</h1>
          <p className="auth-form__lead">
            Ya puedes iniciar sesión con tu nueva contraseña. El enlace anterior dejó de funcionar.
          </p>
          <button type="button" className="auth-submit" onClick={() => navigate("/login", { replace: true })}>
            Ir a iniciar sesión
          </button>
        </div>
      </AuthRecoveryLayout>
    );
  }

  return (
    <AuthRecoveryLayout>
      <div className="auth-form">
        <header className="auth-form__header">
          <h1 className="auth-form__title">Nueva contraseña</h1>
          <p className="auth-form__lead">Elige una clave que cumpla las mismas reglas del registro.</p>
        </header>
        <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
          <AuthTextField
            name="password"
            type="password"
            label="Nueva contraseña"
            placeholder="Crea una contraseña segura"
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          <p className="auth-hint">{PASSWORD_HINT}</p>
          <AuthTextField
            name="confirmPassword"
            type="password"
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />
          {formError && (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="auth-submit" disabled={loading || !token}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
        <footer className="auth-form__footer">
          <div className="auth-row">
            <Link to="/forgot-password">Solicitar un enlace nuevo</Link>
            <Link to="/login">Volver a iniciar sesión</Link>
          </div>
        </footer>
      </div>
    </AuthRecoveryLayout>
  );
}

function mapResetError(err: unknown): { form: string; fields: ResetPasswordFieldErrors } {
  const axiosErr = err as {
    response?: {
      status?: number;
      data?: { error?: { message?: string; details?: Array<{ field?: string; message?: string }> } };
    };
  };
  const details = axiosErr.response?.data?.error?.details ?? [];
  const fields: ResetPasswordFieldErrors = {};
  for (const item of details) {
    if (item.field === "password") fields.password = item.message;
    if (item.field === "confirmPassword") fields.confirmPassword = item.message;
  }

  if (!axiosErr.response) {
    return {
      form: "No hay conexión con el servidor. Asegúrate de que el backend esté en http://localhost:4000.",
      fields,
    };
  }

  if (Object.keys(fields).length > 0) {
    return { form: "", fields };
  }

  return {
    form: getApiErrorMessage(err, "El enlace de recuperación no es válido o expiró."),
    fields,
  };
}
