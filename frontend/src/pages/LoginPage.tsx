import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthFormBrand } from "../components/auth/AuthFormBrand";
import { AuthTextField } from "../components/auth/AuthTextField";
import { SocialButtons } from "../components/auth/SocialButtons";
import { useAuth } from "../hooks/useAuth";
import { consumeSessionExpiredMessage } from "../services/api";
import { resendVerificationCode } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import { setPendingVerificationEmail } from "../utils/pending-verification";

const UNVERIFIED_LOGIN_MESSAGE = "Debes verificar tu correo antes de iniciar sesión.";
const RESENT_CODE_NOTICE = "Te enviamos un nuevo código de verificación a tu correo.";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(() => consumeSessionExpiredMessage());
  const [pendingEmail, setPendingEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || resending) {
      return;
    }
    setError("");
    setPendingEmail("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    try {
      setLoading(true);
      const user = await login(email, String(form.get("password")));
      navigate(user.role === "USER" ? "/explorar" : "/admin", { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, "Credenciales incorrectas");
      setError(message);
      if (message === UNVERIFIED_LOGIN_MESSAGE && email) {
        setPendingEmail(email);
        setPendingVerificationEmail(email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function continueVerification() {
    if (!pendingEmail || resending) {
      return;
    }
    setError("");
    try {
      setResending(true);
      await resendVerificationCode(pendingEmail);
      setPendingVerificationEmail(pendingEmail);
      navigate("/verify-email", {
        replace: true,
        state: { email: pendingEmail, resent: true, notice: RESENT_CODE_NOTICE },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos enviar un nuevo código. Inténtalo de nuevo."));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-form">
      <header className="auth-form__header">
        <AuthFormBrand />
        <h1 className="auth-form__title">Bienvenido de nuevo</h1>
        <p className="auth-form__lead">Continúa descubriendo experiencias para recordar.</p>
        {registered && <p className="auth-notice">Cuenta creada. Ya puedes entrar.</p>}
      </header>
      <form className="auth-form__stack" onSubmit={onSubmit}>
        <AuthTextField
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="Correo electrónico"
          autoComplete="username"
          required
        />
        <AuthTextField
          name="password"
          type="password"
          label="Contraseña"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
        />
        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" name="remember" />
            Recuérdame
          </label>
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {pendingEmail ? (
          <div className="auth-row">
            <a
              href="/verify-email"
              onClick={(event) => {
                event.preventDefault();
                void continueVerification();
              }}
            >
              {resending ? "Enviando código..." : "Verificar cuenta"}
            </a>
          </div>
        ) : null}
        <button type="submit" className="auth-submit" disabled={loading || resending}>
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </form>
      <footer className="auth-form__footer">
        <p className="auth-switch">
          ¿No tienes cuenta?{" "}
          <Link to="/register">Crear cuenta</Link>
        </p>
        <div className="auth-alt">
          <SocialButtons label="O inicia sesión con" />
        </div>
      </footer>
    </div>
  );
}

export function LoginPage() {
  return <LoginForm />;
}
