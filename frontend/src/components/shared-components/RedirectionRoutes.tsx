import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { onboarded } = useUser();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (!onboarded && location.pathname !== "/onboarding") {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/onboarding" replace state={{ from }} />;
  }

  return <>{element}</>;
}

export function NavigateIfAuthenticatedRoute({
  element,
}: {
  element: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const { onboarded } = useUser();

  if (!isAuthenticated) return <>{element}</>;

  return <Navigate to={onboarded ? "/dashboard" : "/onboarding"} replace />;

  return <>{element}</>;
}

export function OnboardingRoute({ element }: { element: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { onboarded } = useUser();

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (onboarded) return <Navigate to="/dashboard" replace />;

  return <>{element}</>;
}
