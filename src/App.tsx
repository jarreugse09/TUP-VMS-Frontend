import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import StaffDashboard from './pages/Dashboard/StaffDashboard';
import Logs from './pages/Logs';
import Attendance from './pages/Attendance';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';

const { Content } = Layout;

function App() {
  const { token, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!token) {
    // Public routes
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // Define role-based dashboards and extra routes
  const roleRoutes: Record<
    string,
    { dashboardPath: string; dashboardElement: JSX.Element; extraRoutes?: JSX.Element[] }
  > = {
    TUP: {
      dashboardPath: '/dashboard',
      dashboardElement: <AdminDashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<Logs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Staff: {
      dashboardPath: '/staff/dashboard',
      dashboardElement: <StaffDashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<Logs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Security: {
      dashboardPath: '/security/dashboard',
      dashboardElement: <AdminDashboard />, // or a custom security dashboard
      extraRoutes: [
        <Route key="logs" path="/logs" element={<Logs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Visitor: {
      dashboardPath: '/user/dashboard',
      dashboardElement: <Dashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<Logs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Student: {
      dashboardPath: '/user/dashboard',
      dashboardElement: <Dashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<Logs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
  };

  const currentRole = user?.role || user?.staffType || 'Visitor';
  const roleConfig = roleRoutes[currentRole] || roleRoutes['Visitor'];
  const contentMargin = collapsed ? 80 : 200;

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <Layout style={{ marginLeft: contentMargin, transition: 'all 0.2s' }}>
          <Content style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <Routes>
              {/* Profile always available */}
              <Route path="/profile" element={<Profile />} />

              {/* Role-based dashboard and extra routes */}
              <Route path={roleConfig.dashboardPath} element={roleConfig.dashboardElement} />
              {roleConfig.extraRoutes?.map((r) => r)}

              {/* Redirect root & unknown paths */}
              <Route path="/" element={<Navigate to={roleConfig.dashboardPath} replace />} />
              <Route path="*" element={<Navigate to={roleConfig.dashboardPath} replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
