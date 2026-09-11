import type { ReactNode } from "react";
import { AuthBackLink } from "./AuthBackLink";
import { AuthScrollLock } from "./AuthScrollLock";
import { AuthVisualPanel } from "./AuthVisualPanel";
import { authScenicPhoto } from "./authArt";
import "../../styles/auth-interactive.css";

export function AuthRecoveryLayout({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="auth-stage auth-stage--access">
      <AuthScrollLock />
      <div className="auth-stage__frame">
        <div className="auth-card is-login" data-mode="login" data-motion="reduce">
          <div className="auth-form-pane auth-form-pane--login">{children}</div>
          <div className="auth-visual-pane">
            <AuthVisualPanel mode="login" photo={authScenicPhoto} />
            <AuthBackLink variant="icon" className="auth-back--photo" onBack={onBack} />
          </div>
        </div>
      </div>
    </div>
  );
}
