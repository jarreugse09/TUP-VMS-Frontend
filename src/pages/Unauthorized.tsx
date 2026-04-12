import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForUser } from '../config/rolePages';

/**
 * Unauthorized page — shown when a user attempts to access a resource
 * outside their role scope. RoleGuard redirects here instead of /dashboard
 * for clearer user feedback.
 */
const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const defaultPath = getDefaultRouteForUser(user);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Result
        status="403"
        title="403 — Access Denied"
        subTitle="You do not have permission to access this page. Contact your administrator if you believe this is an error."
        extra={
          <Button type="primary" onClick={() => navigate(defaultPath, { replace: true })}>
            Return to Dashboard
          </Button>
        }
      />
    </div>
  );
};

export default Unauthorized;
