import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AuthForgotModalLayout } from "../components/auth/AuthForgotModalLayout";
import { AuthKeyIcon } from "../components/auth/AuthKeyIcon";
import { AuthTextField } from "../components/auth/AuthTextField";
import { forgotPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import { validateEmailFormat } from "../utils/register-validation";

const GENERIC_MESSAGE =
  "Revisa tu correo. Te enviamos las instrucciones para crear una nueva contraseña.";
const SPAM_HINT = "Si no lo encuentras, revisa la carpeta de spam.";

export function ForgotPasswordPage() {
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setEmailError("");
    setFormError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const invalidEmail = validateEmailFormat(email);
    if (invalidEmail) {
      setEmailError(invalidEmail);
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(email);
      setMessage(GENERIC_MESSAGE);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No pudimos enviar el correo. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthForgotModalLayout>
      <div className="auth-form">
        <AuthKeyIcon className="auth-recovery-icon" />
        <header className="auth-form__header">
          <h1 id="forgot-password-title" className="auth-form__title">
            Recuperar contraseña
          </h1>
          <p className="auth-form__lead">
            Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.
          </p>
        </header>
        <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
          <AuthTextField
            name="email"
            type="email"
            label="Correo electrónico"
            autoComplete="email"
            error={emailError}
          />
          {formError && (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          )}
          {message ? (
            <div className="auth-notice" role="status">
              <p>{message}</p>
              <p className="auth-notice__hint">{SPAM_HINT}</p>
            </div>
          ) : null}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
        <footer className="auth-form__footer">
          <Link to="/login" className="auth-recovery-back">
            ← Volver a iniciar sesión
          </Link>
        </footer>
      </div>
    </AuthForgotModalLayout>
  );
}
