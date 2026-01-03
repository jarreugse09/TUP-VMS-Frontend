import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Layout } from 'antd';
import { useState } from 'react'; // Added
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard/AdminDashboard';
import Logs from './pages/Logs';
import Attendance from './pages/Attendance';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import StaffDashboard from '@/pages/Dashboard/StaffDashboard';

const { Content } = Layout;

function App() {
  const { token, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false); // Track state here to sync margin
  const isTUP = user?.role === 'TUP';
  const isSecurity = user?.staffType === 'Security';
  const isStaff = user?.role === 'Staff';
  const isVisitor = user?.role === 'Visitor' || user?.role === 'Student';
  // Dynamic margin based on sidebar state
  // Ant Design default: Expanded = 200px, Collapsed = 80px
  const contentMargin = collapsed ? 80 : 200;

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {token ? (
        <Layout style={{ minHeight: '100vh' }}>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

          <Layout style={{ marginLeft: contentMargin, transition: 'all 0.2s' }}>
            <Content
              style={{
                padding: '24px',
                minHeight: '100vh',
                background: '#f0f2f5',
              }}
            >
              <Routes>
                <Route path="/profile" element={<Profile />} />
                {isTUP && (
                  <>
                    <Route path="/dashboard" element={<AdminDashboard />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/attendance" element={<Attendance />} />
                  </>
                )}
                {isSecurity && (
                  <>
                    <Route
                      path="/security/dashboard"
                      element={<AdminDashboard />}
                    />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/attendance" element={<Attendance />} />
                  </>
                )}
                {isStaff && (
                  <>
                    <Route
                      path="/staff/dashboard"
                      element={<StaffDashboard />}
                    />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/attendance" element={<Attendance />} />
                  </>
                )}
                {isVisitor && (
                  <>
                    <Route path="/user/dashboard" element={<Dashboard />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/attendance" element={<Attendance />} />
                  </>
                )}

                <Route
                  path="/"
                  element={
                    <Navigate to={isTUP ? '/dashboard' : '/profile'} replace />
                  }
                />
                <Route
                  path="*"
                  element={
                    <Navigate to={isTUP ? '/dashboard' : '/profile'} replace />
                  }
                />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
