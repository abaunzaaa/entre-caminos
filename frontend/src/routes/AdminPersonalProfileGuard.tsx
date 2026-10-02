import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** ADMIN usa solo perfil de empresa; SUPER_ADMIN conserva el perfil personal. */
export function AdminPersonalProfileGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading && !user) {
    return null;
  }
  if (user?.role === "ADMIN") {
    return <Navigate to="/admin/empresa" replace />;
  }
  return <>{children}</>;
}
