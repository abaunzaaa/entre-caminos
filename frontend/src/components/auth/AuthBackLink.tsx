import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function AuthBackLink({
  onBack,
  variant = "text",
}: {
  onBack?: () => void;
  variant?: "text" | "icon";
}) {
  const iconOnly = variant === "icon";
  const className = iconOnly ? "auth-back auth-back--icon" : "auth-back";
  const label = "Volver al inicio";
  const content = (
    <>
      <ArrowLeft size={iconOnly ? 18 : 16} strokeWidth={2.25} aria-hidden="true" />
      {iconOnly ? null : "Volver al inicio"}
    </>
  );

  if (onBack) {
    return (
      <button type="button" className={className} onClick={onBack} aria-label={label}>
        {content}
      </button>
    );
  }

  return (
    <Link to="/" className={className} aria-label={label}>
      {content}
    </Link>
  );
}
