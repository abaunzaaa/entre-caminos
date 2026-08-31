import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { IllustrationPanel } from "../components/auth/IllustrationPanel";
import { IconField } from "../components/auth/IconField";
import { forgotPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import panelLogin from "../assets/panel-login.png";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      setLoading(true);
      const result = await forgotPassword(String(form.get("email")));
      const token = result.data?.devToken;
      setMessage(
        result.message ??
          "Si el correo existe, enviaremos instrucciones. En desarrollo te llevamos al enlace.",
      );
      if (token) {
        window.setTimeout(() => {
          navigate(`/reset-password?token=${encodeURIComponent(token)}`);
        }, 900);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos enviar el correo"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[42%_58%]">
      <IllustrationPanel image={panelLogin} variant="login" showBack onBack={() => navigate("/login")} />
      <main className="flex items-center justify-center px-6 py-12 lg:rounded-tl-[72px]">
        <div className="w-full max-w-md">
          <h1 className="text-center font-serif text-4xl italic">Recuperar contraseña</h1>
          <p className="mt-3 text-center text-sm text-neutral-500">
            Escribe el correo de tu cuenta. Te enviaremos un enlace seguro para crear una nueva clave.
          </p>
          <form className="mt-10 space-y-4" onSubmit={onSubmit}>
            <IconField name="email" type="email" placeholder="Correo electrónico" icon={<Mail size={18} />} required />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-forest">{message}</p>}
            <button className="w-full rounded-full bg-charcoal py-3.5 text-white disabled:opacity-60" disabled={loading}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </button>
          </form>
          <p className="mt-8 text-center text-sm">
            <Link to="/login" className="underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
