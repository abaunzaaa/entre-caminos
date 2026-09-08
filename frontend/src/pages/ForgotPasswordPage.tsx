import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AuthRecoveryLayout } from "../components/auth/AuthRecoveryLayout";
import { AuthTextField } from "../components/auth/AuthTextField";
import { forgotPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import { validateEmailFormat } from "../utils/register-validation";

const GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña";

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
      const result = await forgotPassword(email);
      setMessage(result.message || GENERIC_MESSAGE);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No pudimos enviar el correo. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthRecoveryLayout>
      <div className="auth-form">
        <header className="auth-form__header">
          <h1 className="auth-form__title">Recuperar contraseña</h1>
          <p className="auth-form__lead">
            Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva.
          </p>
        </header>
        <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
          <AuthTextField
            name="email"
            type="email"
            label="Correo electrónico"
            placeholder="Correo electrónico"
            autoComplete="email"
            error={emailError}
          />
          {formError && (
            <p className="auth-error" role="alert">
              {formError}
            </p>
          )}
          {message && <p className="auth-notice">{message}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
        <footer className="auth-form__footer">
          <div className="auth-row">
            <Link to="/login">Volver a iniciar sesión</Link>
          </div>
        </footer>
      </div>
    </AuthRecoveryLayout>
  );
}
