import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthForgotModalLayout } from "../components/auth/AuthForgotModalLayout";
import { AuthKeyIcon } from "../components/auth/AuthKeyIcon";
import { AuthTextField } from "../components/auth/AuthTextField";
import { PasswordRequirements } from "../components/auth/PasswordRequirements";
import { resetPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import {
  validateResetPasswordForm,
  type ResetPasswordFieldErrors,
} from "../utils/register-validation";
import "../styles/auth-recovery-modal.css";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const titleId = useId();
  const successActionRef = useRef<HTMLButtonElement>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [linkBroken, setLinkBroken] = useState(!token);

  useEffect(() => {
    if (success) {
      successActionRef.current?.focus();
    }
  }, [success]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success || linkBroken) {
      return;
    }

    setFormError("");
    const nextPassword = password;
    const nextConfirm = confirmPassword;
    const errors = validateResetPasswordForm({ password: nextPassword, confirmPassword: nextConfirm });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, nextPassword, nextConfirm);
      setSuccess(true);
    } catch (err) {
      const mapped = mapResetError(err);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
      if (mapped.linkBroken) {
        setLinkBroken(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthForgotModalLayout titleId={titleId}>
      <div className={`auth-form auth-reset-form${success ? " is-success" : ""}`}>
        {success ? (
          <div className="auth-reset-success" role="status">
            <AuthKeyIcon className="auth-reset-success__mark" />
            <h1 id={titleId} className="auth-form__title">
              Contraseña actualizada
            </h1>
            <p className="auth-form__lead">Ya puedes acceder con tu nueva contraseña.</p>
            <button
              ref={successActionRef}
              type="button"
              className="auth-submit"
              onClick={() => navigate("/login", { replace: true })}
            >
              Ir a acceder
            </button>
          </div>
        ) : (
          <>
            <AuthKeyIcon className="auth-recovery-icon auth-reset-key" />
            <header className="auth-form__header">
              <h1 id={titleId} className="auth-form__title">
                Crea una nueva contraseña
              </h1>
              <p className="auth-form__lead">
                Elige una clave segura para volver a entrar a tu cuenta.
              </p>
            </header>

            {linkBroken ? (
              <div className="auth-reset-invalid">
                <p className="auth-error" role="alert">
                  {formError || "Este enlace no es válido o expiró. Solicita uno nuevo."}
                </p>
                <Link to="/forgot-password" className="auth-submit auth-reset-invalid__action">
                  Solicitar un nuevo enlace
                </Link>
              </div>
            ) : (
              <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
                <AuthTextField
                  name="password"
                  type="password"
                  label="Nueva contraseña"
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  error={fieldErrors.password}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <PasswordRequirements value={password} />
                <AuthTextField
                  name="confirmPassword"
                  type="password"
                  label="Confirmar contraseña"
                  placeholder="Confirmar contraseña"
                  autoComplete="new-password"
                  error={fieldErrors.confirmPassword}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {formError ? (
                  <p className="auth-error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </form>
            )}

            <footer className="auth-form__footer">
              <Link to="/login" className="auth-recovery-back">
                ← Volver a iniciar sesión
              </Link>
            </footer>
          </>
        )}
      </div>
    </AuthForgotModalLayout>
  );
}

function mapResetError(err: unknown): {
  form: string;
  fields: ResetPasswordFieldErrors;
  linkBroken: boolean;
} {
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
      form: "No hay conexión con el servidor. Inténtalo de nuevo en unos momentos.",
      fields,
      linkBroken: false,
    };
  }

  if (Object.keys(fields).length > 0) {
    return { form: "", fields, linkBroken: false };
  }

  const message = getApiErrorMessage(err, "Este enlace no es válido o expiró. Solicita uno nuevo.");
  const linkBroken = /enlace|expir|inválid|invalido|utilizado/i.test(message);
  return { form: message, fields, linkBroken };
}
