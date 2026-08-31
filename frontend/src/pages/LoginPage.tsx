import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthTextField } from "../components/auth/AuthTextField";
import { SocialButtons } from "../components/auth/SocialButtons";
import { AuthBackLink } from "../components/auth/AuthBackLink";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/api-error";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      setLoading(true);
      const user = await login(String(form.get("email")), String(form.get("password")));
      navigate(user.role === "USER" ? "/explorar" : "/admin", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Credenciales incorrectas"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form">
      <header className="auth-form__header">
        <h1 className="auth-form__title">Bienvenido de nuevo</h1>
        <p className="auth-form__lead">Continúa descubriendo nuevos caminos y experiencias.</p>
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
          <label className="auth-check" style={{ margin: 0 }}>
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
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Entrando..." : "Iniciar sesión"}
        </button>
      </form>
      <footer className="auth-form__footer">
        <div className="auth-alt">
          <SocialButtons label="O inicia sesión con" />
        </div>
        <AuthBackLink />
      </footer>
    </div>
  );
}

export function LoginPage() {
  return <LoginForm />;
}
