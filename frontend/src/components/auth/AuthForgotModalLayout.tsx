import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { AuthInteractiveCard } from "./AuthInteractiveCard";
import { AuthScrollLock } from "./AuthScrollLock";
import { LoginForm } from "../../pages/LoginPage";
import "../../styles/auth-recovery-modal.css";

export function AuthForgotModalLayout({ children }: { children: ReactNode }) {
  const closeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeRef.current?.click();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeRef.current?.click();
    }
  }

  return (
    <div className="auth-stage auth-stage--access auth-recovery-root">
      <AuthScrollLock />
      <div className="auth-recovery-scene" aria-hidden="true" inert>
        <div className="auth-stage__frame">
          <AuthInteractiveCard mode="login" registerForm={null} loginForm={<LoginForm />} />
        </div>
      </div>
      <div className="auth-recovery-layer" onClick={onOverlayClick}>
        <div
          className="auth-recovery-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          onClick={(event) => event.stopPropagation()}
        >
          <Link ref={closeRef} to="/login" className="auth-recovery-close" aria-label="Cerrar">
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
