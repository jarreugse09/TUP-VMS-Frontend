import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RoleGuardProps {
  allowedRoles: string[];
  allowedSubRoles?: string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  allowedSubRoles = [],
  children,
  fallbackPath = "/unauthorized",
}) => {
  const { user, hasAccess } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccessResult = hasAccess(allowedRoles, allowedSubRoles);

  if (!hasAccessResult) {
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default RoleGuard;
