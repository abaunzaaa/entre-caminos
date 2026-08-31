import { FormEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { IllustrationPanel } from "../components/auth/IllustrationPanel";
import { IconField } from "../components/auth/IconField";
import { resetPassword } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/api-error";
import panelLogin from "../assets/panel-login.png";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirmPassword"));
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!token) {
      setError("Falta el enlace de recuperación. Solicítalo de nuevo.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(token, password);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(getApiErrorMessage(err, "El enlace no es válido o expiró"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[42%_58%]">
      <IllustrationPanel image={panelLogin} variant="login" showBack onBack={() => navigate("/login")} />
      <main className="flex items-center justify-center px-6 py-12 lg:rounded-tl-[72px]">
        <form className="w-full max-w-md space-y-4" onSubmit={onSubmit}>
          <h1 className="text-center font-serif text-4xl italic">Nueva contraseña</h1>
          <p className="text-center text-xs text-neutral-500">
            Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026
          </p>
          <IconField name="password" type="password" placeholder="Contraseña" icon={<Lock size={18} />} required />
          <IconField
            name="confirmPassword"
            type="password"
            placeholder="Confirmar"
            icon={<Lock size={18} />}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-full bg-charcoal py-3.5 text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </main>
    </div>
  );
}
