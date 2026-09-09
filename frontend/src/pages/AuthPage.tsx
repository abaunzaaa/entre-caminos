import { useLocation } from "react-router-dom";
import { AuthBackLink } from "../components/auth/AuthBackLink";
import { AuthInteractiveCard } from "../components/auth/AuthInteractiveCard";
import { LoginForm } from "./LoginPage";
import { RegisterForm } from "./RegisterPage";

export function AuthPage() {
  const location = useLocation();
  const mode = location.pathname.startsWith("/login") ? "login" : "register";

  return (
    <div className="auth-stage">
      <div className="auth-stage__frame">
        <AuthInteractiveCard
          mode={mode}
          registerForm={<RegisterForm />}
          loginForm={<LoginForm />}
        />
        <AuthBackLink />
      </div>
    </div>
  );
}
