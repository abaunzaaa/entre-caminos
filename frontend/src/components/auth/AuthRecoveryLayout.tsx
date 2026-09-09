import type { ReactNode } from "react";
import { AuthBackLink } from "./AuthBackLink";
import { AuthVisualPanel } from "./AuthVisualPanel";
import { authScenicPhoto } from "./authArt";
import "../../styles/auth-interactive.css";

export function AuthRecoveryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage">
      <div className="auth-stage__frame">
        <div className="auth-card is-login" data-mode="login" data-motion="reduce">
          <div className="auth-form-pane auth-form-pane--login">{children}</div>
          <div className="auth-visual-pane" aria-hidden="true">
            <AuthVisualPanel mode="login" photo={authScenicPhoto} />
          </div>
        </div>
        <AuthBackLink />
      </div>
    </div>
  );
}
