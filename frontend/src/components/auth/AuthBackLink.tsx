import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../utils/cn";

export function AuthBackLink({
  onBack,
  variant = "text",
  className,
}: {
  onBack?: () => void;
  variant?: "text" | "icon";
  className?: string;
}) {
  const iconOnly = variant === "icon";
  const classes = cn("auth-back", iconOnly && "auth-back--icon", className);
  const label = "Volver al inicio";
  const content = (
    <>
      <ArrowLeft size={iconOnly ? 18 : 16} strokeWidth={1.6} aria-hidden="true" />
      {iconOnly ? null : "Volver al inicio"}
    </>
  );

  if (onBack) {
    return (
      <button type="button" className={classes} onClick={onBack} aria-label={label}>
        {content}
      </button>
    );
  }

  return (
    <Link to="/" className={classes} aria-label={label}>
      {content}
    </Link>
  );
}
