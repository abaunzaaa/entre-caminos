import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthBackLink } from "./AuthBackLink";
import { AuthVisualPanel } from "./AuthVisualPanel";
import { authArt, type AuthMode } from "./authArt";
import { cn } from "../../utils/cn";
import "../../styles/auth-interactive.css";

const ANIMATION_MS = 850;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function AuthInteractiveCard({
  mode,
  registerForm,
  loginForm,
  onGoLogin,
  onGoRegister,
}: {
  mode: AuthMode;
  registerForm: ReactNode;
  loginForm: ReactNode;
  onGoLogin: () => void;
  onGoRegister: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const previousMode = useRef(mode);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (previousMode.current === mode) {
      return;
    }
    previousMode.current = mode;

    if (reducedMotion) {
      setAnimating(false);
      return;
    }

    setAnimating(true);
    const timeout = window.setTimeout(() => setAnimating(false), ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [mode, reducedMotion]);

  const registerActive = mode === "register";
  const loginActive = mode === "login";
  const registerInteractive = registerActive && !animating;
  const loginInteractive = loginActive && !animating;

  return (
    <div
      className={cn("auth-card", loginActive && "is-login", animating && "is-animating")}
      data-mode={mode}
      data-motion={reducedMotion ? "reduce" : "full"}
    >
      <div className="auth-toggle" aria-hidden="true" />

      <div
        className="auth-visual-pane auth-visual-pane--register"
        aria-hidden={!registerActive}
        {...(registerInteractive ? {} : { inert: true })}
      >
        <AuthVisualPanel
          mode="register"
          illustration={authArt.register}
          onAction={onGoLogin}
        />
      </div>
      <div
        className="auth-visual-pane auth-visual-pane--login"
        aria-hidden={!loginActive}
        {...(loginInteractive ? {} : { inert: true })}
      >
        <AuthVisualPanel mode="login" illustration={authArt.login} onAction={onGoRegister} />
      </div>

      <div
        className="auth-form-pane auth-form-pane--register"
        aria-hidden={!registerActive}
        {...(registerInteractive ? {} : { inert: true })}
      >
        {registerForm}
      </div>
      <div
        className="auth-form-pane auth-form-pane--login"
        aria-hidden={!loginActive}
        {...(loginInteractive ? {} : { inert: true })}
      >
        {loginForm}
      </div>

      <AuthBackLink />
    </div>
  );
}
