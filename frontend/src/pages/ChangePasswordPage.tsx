import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordRequirements } from "../components/auth/PasswordRequirements";
import { SuccessConfirm } from "../components/feedback/SuccessConfirm";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/api-error";
import passwordArt from "../assets/images/admin/cambiar-contrasena.png";
import passwordUpdated from "../assets/images/password-updated.png";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/auth-interactive.css";

const POLICY = [
  { test: (value: string) => value.length >= 8, message: "La contraseña debe tener al menos 8 caracteres." },
  { test: (value: string) => /[A-Z]/.test(value), message: "Debe incluir al menos una mayúscula." },
  { test: (value: string) => /[a-z]/.test(value), message: "Debe incluir al menos una minúscula." },
  { test: (value: string) => /[0-9]/.test(value), message: "Debe incluir al menos un número." },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), message: "Debe incluir al menos un símbolo." },
];

export function ChangePasswordPage() {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof fieldErrors = {};
    if (!currentPassword) {
      next.currentPassword = "Ingresa tu contraseña actual.";
    }
    if (!password) {
      next.password = "Ingresa la nueva contraseña.";
    } else {
      const failed = POLICY.find((rule) => !rule.test(password));
      if (failed) {
        next.password = failed.message;
      } else if (password === currentPassword) {
        next.password = "La nueva contraseña debe ser distinta a la actual.";
      }
    }
    if (!confirmPassword) {
      next.confirmPassword = "Confirma tu contraseña.";
    } else if (password !== confirmPassword) {
      next.confirmPassword = "Las contraseñas no coinciden.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    setSaving(true);
    setToast(null);
    try {
      await changePassword({ currentPassword, password, confirmPassword });
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setConfirmed(true);
    } catch (err) {
      setToast(getApiErrorMessage(err, "No se pudo actualizar la contraseña."));
    } finally {
      setSaving(false);
    }
  }

  if (user && user.role !== "USER") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section className="explorer-section">
      {toast ? (
        <p className="dash-team-toast is-error" role="status">
          {toast}
        </p>
      ) : null}

      <article className="dash-split__panel dash-password" aria-labelledby="change-password-title">
        <form
          className="dash-team-invite dash-password__form"
          style={{ ["--auth-forest" as string]: "#294942", ["--auth-muted" as string]: "#7a7368" }}
          onSubmit={(event) => void onSubmit(event)}
          noValidate
        >
          <div className="dash-profile__identity dash-team-invite__full">
            <h1 id="change-password-title" className="dash-profile__name">Cambiar contraseña</h1>
            <p className="dash-section__lead">Actualiza tu contraseña para mantener segura tu cuenta.</p>
          </div>
          <div className="dash-team-invite__full">
            <Input
              label="Contraseña actual"
              type="password"
              passwordToggle
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              error={fieldErrors.currentPassword}
              required
            />
          </div>
          <div className="dash-team-invite__full">
            <Input
              label="Nueva contraseña"
              type="password"
              passwordToggle
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              required
            />
            <PasswordRequirements value={password} />
          </div>
          <div className="dash-team-invite__full">
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              passwordToggle
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={fieldErrors.confirmPassword}
              required
            />
          </div>
          <div className="dash-password__actions">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Actualizar contraseña"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => navigate(user?.role === "USER" ? "/onboarding" : "/admin/perfil")}
            >
              Cancelar
            </Button>
          </div>
        </form>
        <img src={passwordArt} alt="" className="dash-float-art dash-password__art" />
      </article>
      <SuccessConfirm
        open={confirmed}
        image={passwordUpdated}
        title="¡Contraseña actualizada!"
        text="Tu contraseña se ha cambiado correctamente."
        actionLabel="Aceptar"
        onClose={() => navigate("/explorar")}
      />
    </section>
  );
}
