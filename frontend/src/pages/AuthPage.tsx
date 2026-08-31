import { useLocation, useNavigate } from "react-router-dom";
import { AuthInteractiveCard } from "../components/auth/AuthInteractiveCard";
import { LoginForm } from "./LoginPage";
import { RegisterForm } from "./RegisterPage";

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname.startsWith("/login") ? "login" : "register";

  return (
    <div className="auth-stage">
      <div className="auth-stage__frame">
        <AuthInteractiveCard
          mode={mode}
          registerForm={<RegisterForm />}
          loginForm={<LoginForm />}
          onGoLogin={() => navigate("/login")}
          onGoRegister={() => navigate("/register")}
        />
      </div>
    </div>
  );
}
