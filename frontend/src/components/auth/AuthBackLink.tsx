import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function AuthBackLink() {
  return (
    <Link to="/" className="auth-back">
      <ArrowLeft size={16} strokeWidth={2.25} aria-hidden="true" />
      Volver al inicio
    </Link>
  );
}
