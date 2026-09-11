import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthRecoveryLayout } from "../components/auth/AuthRecoveryLayout";
import { AuthTextField } from "../components/auth/AuthTextField";
import { useAuth } from "../hooks/useAuth";
import { resendVerificationCode } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
  setPendingVerificationEmail,
} from "../utils/pending-verification";

const SPAM_HINT =
  "Si no encuentras el correo en tu bandeja de entrada, revisa la carpeta de spam o correo no deseado.";
const RESENT_CODE_NOTICE = "Te enviamos un nuevo código de verificación a tu correo.";

export function VerifyEmailPage() {
  const { user, verifyEmail, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { email?: string; resent?: boolean; notice?: string } | null;
  const email = useMemo(() => {
    return (locationState?.email ?? user?.email ?? getPendingVerificationEmail()).trim().toLowerCase();
  }, [locationState?.email, user?.email]);

  useEffect(() => {
    if (email) {
      setPendingVerificationEmail(email);
    }
  }, [email]);

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() =>
    locationState?.resent ? locationState.notice || RESENT_CODE_NOTICE : "",
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setError("");
    setNotice("");

    if (!email) {
      setError("Falta el correo a verificar. Inicia sesión para continuar la verificación.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("El código debe tener 6 dígitos.");
      return;
    }

    try {
      setLoading(true);
      const verified = await verifyEmail(email, code.trim());
      if (!verified.emailVerified) {
        setError("No pudimos verificar el código.");
        return;
      }
      clearPendingVerificationEmail();
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos verificar el código."));
    } finally {
      setLoading(false);
    }
  }

  async function goHome() {
    await logout().catch(() => undefined);
    navigate("/", { replace: true });
  }

  async function onResend() {
    if (resending || !email) {
      return;
    }
    setError("");
    setNotice("");
    try {
      setResending(true);
      await resendVerificationCode(email);
      setNotice(RESENT_CODE_NOTICE);
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos reenviar el código."));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthRecoveryLayout onBack={() => void goHome()}>
      <div className="auth-form">
        <header className="auth-form__header">
          <h1 className="auth-form__title">Verifica tu correo</h1>
          <p className="auth-form__lead">
            {email
              ? `Ingresa el código de 6 dígitos que enviamos a ${email}.`
              : "Ingresa el código de 6 dígitos que enviamos a tu correo."}
          </p>
          <p className="auth-form__lead">{SPAM_HINT}</p>
        </header>
        <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
          <AuthTextField
            name="code"
            label="Código de verificación"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="auth-notice">{notice}</p>}
          <button type="submit" className="auth-submit" disabled={loading || !email}>
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>
        <footer className="auth-form__footer">
          <div className="auth-row">
            <a
              href="#reenviar-codigo"
              onClick={(event) => {
                event.preventDefault();
                void onResend();
              }}
              aria-disabled={resending || !email}
            >
              {resending ? "Reenviando..." : "¿No recibiste el código? Reenviar código"}
            </a>
          </div>
        </footer>
      </div>
    </AuthRecoveryLayout>
  );
}
