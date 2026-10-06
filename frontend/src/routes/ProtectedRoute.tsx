import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/ui/Spinner";
import { peekSessionExpired } from "../services/api";

export function ProtectedRoute({ admin = false }: { admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    if (peekSessionExpired()) {
      return null;
    }
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace state={{ email: user.email }} />;
  }

  if (admin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
