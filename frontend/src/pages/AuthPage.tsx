import { useLocation } from "react-router-dom";
import { AuthInteractiveCard } from "../components/auth/AuthInteractiveCard";
import { AuthScrollLock } from "../components/auth/AuthScrollLock";
import { LoginForm } from "./LoginPage";
import { RegisterForm } from "./RegisterPage";

export function AuthPage() {
  const location = useLocation();
  const mode = location.pathname.startsWith("/login") ? "login" : "register";

  return (
    <div className="auth-stage auth-stage--access">
      <AuthScrollLock />
      <div className="auth-stage__frame">
        <AuthInteractiveCard
          mode={mode}
          registerForm={<RegisterForm />}
          loginForm={<LoginForm />}
        />
      </div>
    </div>
  );
}
