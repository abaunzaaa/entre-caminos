import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function AuthBackLink({ onBack }: { onBack?: () => void }) {
  if (onBack) {
    return (
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
        Volver al inicio
      </button>
    );
  }

  return (
    <Link to="/" className="auth-back">
      <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
      Volver al inicio
    </Link>
  );
}
