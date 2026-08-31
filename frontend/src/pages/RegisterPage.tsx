import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthTextField } from "../components/auth/AuthTextField";
import { SocialButtons } from "../components/auth/SocialButtons";
import { saveOnboarding } from "../utils/onboarding";
import { getApiErrorMessage } from "../utils/api-error";
import { validateRegisterForm, type RegisterFieldErrors } from "../utils/register-validation";
import { useAuth } from "../hooks/useAuth";

const PASSWORD_HINT =
  "Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026";

export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string; verificationEmailSent: boolean } | null>(null);

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
      setSuccess({
        email: result.user.email,
        verificationEmailSent: result.verificationEmailSent,
      });
    } catch (err) {
      const mapped = mapRegisterError(err);
      setFieldErrors(mapped.fields);
      setFormError(mapped.form);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-form auth-success">
        <h1 className="auth-form__title">¡Cuenta creada correctamente!</h1>
        <p className="auth-form__lead">
          {success.verificationEmailSent
            ? `Enviamos un enlace a ${success.email} para confirmar tu correo.`
            : `Tu cuenta ${success.email} ya está guardada. El correo de verificación se enviará cuando SendGrid esté configurado; por ahora puedes continuar.`}
        </p>
        <button
          type="button"
          className="auth-submit"
          onClick={() => navigate("/onboarding", { replace: true })}
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <header className="auth-form__header">
        <h1 className="auth-form__title">Crea tu cuenta</h1>
        <p className="auth-form__lead">Empieza a descubrir experiencias que van contigo.</p>
      </header>
      <form className="auth-form__stack" onSubmit={onSubmit} noValidate>
        <AuthTextField
          name="name"
          label="Nombre completo"
          placeholder="Tu nombre"
          autoComplete="name"
          error={fieldErrors.name}
        />
        <AuthTextField
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@email.com"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <AuthTextField
          name="password"
          type="password"
          label="Contraseña"
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
        <label className="auth-check">
          <input type="checkbox" name="terms" />
          <span>
            Acepto los <span className="underline">términos de servicio</span> y la{" "}
            <span className="underline">política de privacidad</span>
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
        <div className="auth-alt">
          <SocialButtons label="O regístrate con" />
        </div>
      </footer>
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
