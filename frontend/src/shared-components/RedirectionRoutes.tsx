import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <>{element}</>;
}

export function NavigateIfAuthenticatedRoute({
  element,
}: {
  element: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{element}</>;
}
