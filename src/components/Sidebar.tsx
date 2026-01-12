import { Layout, Menu, Divider } from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  LineChartOutlined,
  UsergroupDeleteOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar = ({ collapsed, setCollapsed }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSelectedKey = () => {
    const path = location.pathname;

    if (
      path === '/dashboard' ||
      path.startsWith('/staff/dashboard') ||
      path.startsWith('/user/dashboard') ||
      path.startsWith('/security/dashboard')
    )
      return '1';

    if (
      path.startsWith('/logs') ||
      path.startsWith('/staff/logs') ||
      path.startsWith('/user/logs')
    )
      return '2';

    if (path.startsWith('/attendance')) return '3';
    if (path.startsWith('/qr-requests')) return '5';
    if (path.startsWith('/profile')) return '4';
    if (path.startsWith('/admin/manage-users')) return '6';
    if (path.startsWith('/admin/analytics')) return '7';

    return '1';
  };

  const role = user?.role;
  const roleItems: any[] = [];

  /* ================= ROLE-BASED MENU ================= */

  if (role === 'TUP') {
    roleItems.push(
      { key: '1', icon: <DashboardOutlined />, label: <Link to="/dashboard">Dashboard</Link> },
      { key: '2', icon: <HistoryOutlined />, label: <Link to="/logs">Logs</Link> },
      { key: '3', icon: <UserOutlined />, label: <Link to="/attendance">Attendance</Link> },
      { key: '5', icon: <QrcodeOutlined />, label: <Link to="/qr-requests">QR Requests</Link> },
      { key: '6', icon: <UsergroupDeleteOutlined />, label: <Link to="/admin/manage-users">Manage Users</Link> },
      { key: '7', icon: <LineChartOutlined />, label: <Link to="/admin/analytics">Analytics</Link> }
    );
  } else if (role === 'Staff') {
    roleItems.push(
      { key: '1', icon: <DashboardOutlined />, label: <Link to="/staff/dashboard">Dashboard</Link> },
      { key: '2', icon: <HistoryOutlined />, label: <Link to="/staff/logs">Logs</Link> }
    );
  } else if (role === 'Security') {
    roleItems.push(
      { key: '1', icon: <DashboardOutlined />, label: <Link to="/security/dashboard">Dashboard</Link> },
      { key: '2', icon: <HistoryOutlined />, label: <Link to="/logs">Logs</Link> },
      { key: '3', icon: <UserOutlined />, label: <Link to="/attendance">Attendance</Link> }
    );
  } else {
    roleItems.push(
      { key: '1', icon: <DashboardOutlined />, label: <Link to="/user/dashboard">Dashboard</Link> },
      { key: '2', icon: <HistoryOutlined />, label: <Link to="/user/logs">Logs</Link> }
    );
  }

  const menuItems = [
    ...roleItems,
    { key: '4', icon: <UserOutlined />, label: <Link to="/profile">Profile</Link> },
  ];

  const logoutItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout },
  ];

  /* ================= RENDER ================= */

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={220}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, #b1122b 0%, #8c0d22 100%)',
        boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* LOGO */}
        <div
          style={{
            height: 64,
            margin: 16,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: collapsed ? 20 : 18,
            color: '#fff',
            letterSpacing: 1,
          }}
        >
          {collapsed ? 'T' : 'TUP VMS'}
        </div>

        {/* MENU */}
        <div style={{ flex: 1, padding: '0 8px' }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{
              background: 'transparent',
              borderRight: 'none',
              fontWeight: 500,
            }}
          />
        </div>

        {/* LOGOUT */}
        <div style={{ padding: '0 8px 20px' }}>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
          <Menu
            mode="inline"
            selectable={false}
            items={logoutItems}
            style={{ background: 'transparent', borderRight: 'none' }}
          />
        </div>
      </div>

      {/* MENU STYLES */}
      <style>{`
        .ant-menu-item {
          color: rgba(255,255,255,0.85) !important;
          border-radius: 10px !important;
          margin: 6px 0 !important;
        }

        .ant-menu-item:hover {
          background: rgba(255,255,255,0.18) !important;
          color: #fff !important;
        }

        .ant-menu-item-selected {
          background: #fff !important;
          color: #8c0d22 !important;
          font-weight: 600;
        }

        .ant-menu-item-selected .anticon {
          color: #8c0d22 !important;
        }

        .ant-layout-sider-trigger {
          background: rgba(0,0,0,0.25) !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
