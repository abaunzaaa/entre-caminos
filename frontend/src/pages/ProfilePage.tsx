import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SummaryStep } from "../components/onboarding/SummaryStep";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { profileToForm } from "../utils/onboarding";
import { formatPersonName } from "../utils/person-name";
import "../styles/onboarding.css";
import "../styles/profile-view.css";

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const form = profileToForm(user?.profile);
  const displayName = formatPersonName(user?.name ?? "") || user?.name?.trim() || "Tu perfil";

  return (
    <div className="profile-view">
      <section className="profile-view__shell" aria-labelledby="profile-view-title">
        <header className="profile-view__top">
          <Button
            type="button"
            variant="secondary"
            className="profile-view__back"
            onClick={() => navigate("/explorar")}
          >
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            Volver
          </Button>
          <Button type="button" onClick={() => navigate("/perfil/editar")}>
            Editar perfil
          </Button>
        </header>

        <div className="profile-view__heading">
          <h1 id="profile-view-title" className="profile-view__title">
            Tu perfil
          </h1>
          <p className="profile-view__lead">Consulta tu información y preferencias guardadas.</p>
        </div>

        <div className="profile-view__body">
          <SummaryStep form={form} userName={displayName} readOnly />
        </div>
      </section>
    </div>
  );
}
