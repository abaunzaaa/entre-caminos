import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AuthFormBrand } from "../components/auth/AuthFormBrand";
import { AuthTextField } from "../components/auth/AuthTextField";
import { PasswordRequirements } from "../components/auth/PasswordRequirements";
import { SocialButtons } from "../components/auth/SocialButtons";
import { TermsModal, type LegalDocument } from "../components/legal/TermsModal";
import { saveOnboarding } from "../utils/onboarding";
import { getApiErrorMessage } from "../utils/api-error";
import { setPendingVerificationEmail } from "../utils/pending-verification";
import { validateRegisterForm, type RegisterFieldErrors } from "../utils/register-validation";
import { useAuth } from "../hooks/useAuth";

export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }
    setFormError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
      termsAccepted: Boolean(form.get("terms")),
    };

    const errors = validateRegisterForm(payload);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      const result = await register({
        name: payload.name.trim(),
        email: payload.email,
        password: payload.password,
        confirmPassword: payload.confirmPassword,
        termsAccepted: true,
      });
      saveOnboarding({ name: payload.name.trim(), preferences: [] });
      setPendingVerificationEmail(result.user.email);
      navigate("/verify-email", { replace: true, state: { email: result.user.email } });
    } catch (err) {
      const mapped = mapRegisterError(err);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form auth-form--register">
      <AuthFormBrand />
      <header className="auth-form__header">
        <h1 className="auth-form__title">Crea tu cuenta</h1>
      </header>
      <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
        <div className="auth-form__fields">
          <AuthTextField
            name="name"
            label="Nombre completo"
            autoComplete="name"
            error={fieldErrors.name}
          />
          <AuthTextField
            name="email"
            type="email"
            label="Correo electrónico"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <AuthTextField
            name="password"
            type="password"
            label="Contraseña"
            autoComplete="new-password"
            error={fieldErrors.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthTextField
            name="confirmPassword"
            type="password"
            label="Confirmar contraseña"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />
        </div>
        <PasswordRequirements value={password} />
        <label className="auth-check">
          <input type="checkbox" name="terms" />
          <span>
            Acepto los{" "}
            <span
              className="underline"
              role="link"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setLegalDocument("terms");
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setLegalDocument("terms");
              }}
            >
              términos de servicio
            </span>{" "}
            y la{" "}
            <span
              className="underline"
              role="link"
              tabIndex={0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setLegalDocument("privacy");
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setLegalDocument("privacy");
              }}
            >
              política de privacidad
            </span>
          </span>
        </label>
        {fieldErrors.termsAccepted && (
          <p className="auth-error" role="alert">
            {fieldErrors.termsAccepted}
          </p>
        )}
        {formError && (
          <p className="auth-error" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creando tu cuenta..." : "Crear cuenta"}
        </button>
      </form>
      <footer className="auth-form__footer">
        <p className="auth-switch">
          ¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
        <div className="auth-alt">
          <SocialButtons remember />
        </div>
      </footer>
      {createPortal(
        <TermsModal
          open={legalDocument !== null}
          kind={legalDocument ?? "terms"}
          onClose={() => setLegalDocument(null)}
        />,
        document.body,
      )}
    </div>
  );
}

export function RegisterPage() {
  return <RegisterForm />;
}

function mapRegisterError(err: unknown): { form: string; fields: RegisterFieldErrors } {
  const axiosErr = err as {
    response?: {
      status?: number;
      data?: { error?: { message?: string; details?: Array<{ field?: string; message?: string }> } };
    };
  };
  const status = axiosErr.response?.status;
  const details = axiosErr.response?.data?.error?.details ?? [];
  const fields: RegisterFieldErrors = {};
  for (const item of details) {
    if (item.field === "name") fields.name = item.message;
    if (item.field === "email") fields.email = item.message;
    if (item.field === "password") fields.password = item.message;
    if (item.field === "confirmPassword") fields.confirmPassword = item.message;
    if (item.field === "termsAccepted") fields.termsAccepted = item.message;
  }

  if (status === 409) {
    fields.email = "Ya existe una cuenta asociada a este correo electrónico.";
    return { form: "", fields };
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
    form: getApiErrorMessage(err, "No pudimos crear tu cuenta. Inténtalo de nuevo."),
    fields,
  };
}
