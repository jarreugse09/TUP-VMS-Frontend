import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface DpaConsentGateProps {
  children?: React.ReactNode;
}

export const DpaConsentGate: React.FC<DpaConsentGateProps> = ({ children }) => {
  const { token, user, needsConsent } = useAuth();
  const location = useLocation();
  const isAuthenticated = Boolean(token && user);

  // If not authenticated, let the regular auth guards handle it
  if (!isAuthenticated) {
    return children ? <>{children}</> : <Outlet />;
  }

  // If authenticated but needs consent, redirect unless already on the consent page
  if (needsConsent && location.pathname !== '/consent-required') {
    return <Navigate to="/consent-required" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default DpaConsentGate;
