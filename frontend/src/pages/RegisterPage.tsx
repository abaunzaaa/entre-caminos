import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { IllustrationPanel } from "../components/auth/IllustrationPanel";
import { IconField } from "../components/auth/IconField";
import { SocialButtons } from "../components/auth/SocialButtons";
import { saveOnboarding } from "../utils/onboarding";
import { getApiErrorMessage } from "../utils/api-error";
import { validateRegisterForm, type RegisterFieldErrors } from "../utils/register-validation";
import { useAuth } from "../hooks/useAuth";
import panelRegister from "../assets/panel-register.png";

const PASSWORD_HINT =
  "Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string; verificationEmailSent: boolean } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <div className="grid min-h-screen bg-white lg:grid-cols-[58%_42%]">
        <main className="flex items-center justify-center px-6 py-12 lg:rounded-r-[48px]">
          <div className="w-full max-w-md text-center">
            <h1 className="font-serif text-5xl text-black">¡Cuenta creada correctamente!</h1>
            <p className="mt-6 text-sm leading-6 text-neutral-600">
              {success.verificationEmailSent
                ? `Enviamos un enlace a ${success.email} para confirmar tu correo.`
                : `Tu cuenta ${success.email} ya está guardada. El correo de verificación se enviará cuando SendGrid esté configurado; por ahora puedes continuar.`}
            </p>
            <button
              type="button"
              className="mt-10 w-full rounded-full bg-charcoal py-3.5 text-white"
              onClick={() => navigate("/onboarding", { replace: true })}
            >
              Continuar
            </button>
          </div>
        </main>
        <IllustrationPanel image={panelRegister} variant="register" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[58%_42%]">
      <main className="flex items-center justify-center px-6 py-12 lg:rounded-r-[48px]">
        <div className="w-full max-w-md">
          <h1 className="text-center font-serif text-5xl text-black">Crear cuenta</h1>
          <form className="mt-10 space-y-4" onSubmit={onSubmit} noValidate>
            <IconField
              name="name"
              placeholder="Nombre completo"
              icon={<User size={18} />}
              autoComplete="name"
              error={fieldErrors.name}
            />
            <IconField
              name="email"
              type="email"
              placeholder="Correo electrónico"
              icon={<Mail size={18} />}
              autoComplete="email"
              error={fieldErrors.email}
            />
            <IconField
              name="password"
              type="password"
              placeholder="Contraseña"
              icon={<Lock size={18} />}
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            <p className="text-xs text-neutral-500">{PASSWORD_HINT}</p>
            <IconField
              name="confirmPassword"
              type="password"
              placeholder="Confirmar contraseña"
              icon={<Lock size={18} />}
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />
            <label className="flex items-start gap-3 pt-1 text-sm">
              <input type="checkbox" name="terms" className="mt-1 accent-charcoal" />
              <span>
                Acepto los <span className="underline">términos de servicio</span> y la{" "}
                <span className="underline">política de privacidad</span>
              </span>
            </label>
            {fieldErrors.termsAccepted && (
              <p className="text-sm text-red-600">{fieldErrors.termsAccepted}</p>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              className="w-full rounded-full bg-charcoal py-3.5 text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Creando tu cuenta..." : "Registrarse"}
            </button>
          </form>
          <div className="mt-8">
            <SocialButtons label="O regístrate con" />
          </div>
          <p className="mt-8 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
      <IllustrationPanel image={panelRegister} variant="register" />
    </div>
  );
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
