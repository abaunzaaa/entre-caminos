import { Navigate, useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "../components/auth/ChangePasswordForm";
import { useAuth } from "../hooks/useAuth";
import passwordArt from "../assets/images/admin/cambiar-contrasena.png";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/auth-interactive.css";

export function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user && user.role !== "USER") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section className="explorer-section">
      <article className="dash-split__panel dash-password" aria-labelledby="change-password-title">
        <ChangePasswordForm
          onCancel={() =>
            navigate(user?.role === "USER" ? "/perfil" : user?.role === "ADMIN" ? "/admin/empresa" : "/admin/perfil")
          }
          onComplete={() => navigate("/explorar")}
        />
        <img src={passwordArt} alt="" className="dash-float-art dash-password__art" />
      </article>
    </section>
  );
}
