import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "../ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { getOnboardingResumePath, needsOnboarding } from "../../utils/onboarding";

export function OnboardingCatalogGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (needsOnboarding(user)) {
    return <Navigate to={getOnboardingResumePath()} replace />;
  }

  return <Outlet />;
}
