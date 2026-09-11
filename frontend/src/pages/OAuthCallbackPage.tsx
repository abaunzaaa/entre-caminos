import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import { setRememberSession, syncRememberFromLocation } from "../services/api";
import { needsOnboarding } from "../utils/onboarding";

export function OAuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    syncRememberFromLocation();
    setRememberSession(params.get("remember") !== "0");
  }, [params]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { oauthError: "No pudimos iniciar sesión con esa cuenta." },
      });
      return;
    }
    if (user.role === "USER" && (params.get("next") === "onboarding" || needsOnboarding(user))) {
      navigate("/onboarding", { replace: true });
      return;
    }
    navigate(user.role === "USER" ? "/explorar" : "/admin", { replace: true });
  }, [loading, navigate, params, user]);

  return <Spinner />;
}
