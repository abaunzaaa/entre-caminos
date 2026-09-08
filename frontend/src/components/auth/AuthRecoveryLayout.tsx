import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthBackLink } from "./AuthBackLink";
import { AuthVisualPanel } from "./AuthVisualPanel";
import { authArt } from "./authArt";
import "../../styles/auth-interactive.css";

export function AuthRecoveryLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="auth-stage">
      <div className="auth-stage__frame">
        <div className="auth-card is-login" data-mode="login" data-motion="reduce">
          <div className="auth-toggle" aria-hidden="true" />
          <div className="auth-visual-pane auth-visual-pane--login">
            <AuthVisualPanel
              mode="login"
              illustration={authArt.login}
              onAction={() => navigate("/register")}
            />
          </div>
          <div className="auth-form-pane auth-form-pane--login">{children}</div>
          <AuthBackLink />
        </div>
      </div>
    </div>
  );
}
