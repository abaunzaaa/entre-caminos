import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, User } from "lucide-react";
import { IllustrationPanel } from "../components/auth/IllustrationPanel";
import { IconField } from "../components/auth/IconField";
import { SocialButtons } from "../components/auth/SocialButtons";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/api-error";
import panelLogin from "../assets/panel-login.png";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <div className="grid min-h-screen bg-white lg:grid-cols-[42%_58%]">
      <IllustrationPanel
        image={panelLogin}
        variant="login"
        showBack
        onBack={() => navigate("/", { replace: true })}
      />
      <main className="flex items-center justify-center bg-white px-6 py-12 lg:rounded-tl-[72px]">
        <div className="w-full max-w-md">
          <h1 className="text-center font-serif text-5xl italic text-black">Iniciar sesión</h1>
          {registered && (
            <p className="mt-4 rounded-2xl bg-charcoal/10 px-4 py-3 text-center text-sm">
              Cuenta creada. Ya puedes entrar.
            </p>
          )}
          <form className="mt-10 space-y-4" onSubmit={onSubmit}>
            <IconField name="email" type="email" placeholder="Correo electrónico" icon={<User size={18} />} required />
            <IconField name="password" type="password" placeholder="Contraseña" icon={<Lock size={18} />} required />
            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="remember" className="accent-charcoal" />
                Recuérdame
              </label>
              <Link to="/forgot-password" className="underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              className="w-full rounded-full bg-charcoal py-3.5 text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Iniciar sesión"}
            </button>
          </form>
          <div className="mt-8">
            <SocialButtons label="O inicia sesión con" />
          </div>
          <p className="mt-8 text-center text-sm">
            ¿No tienes una cuenta?{" "}
            <Link to="/register" className="underline">
              Registrarse
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
