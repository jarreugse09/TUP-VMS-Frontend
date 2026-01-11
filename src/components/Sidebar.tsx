import { Layout, Menu, Divider } from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  LineChartOutlined,
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

  // Determine active menu item
  const getSelectedKey = () => {
    const path = location.pathname;

    if (
      path === '/dashboard' ||
      path.startsWith('/staff/dashboard') ||
      path.startsWith('/user/dashboard') ||
      path.startsWith('/security/dashboard')
    ) {
      return '1';
    }

    if (
      path.startsWith('/logs') ||
      path.startsWith('/staff/logs') ||
      path.startsWith('/user/logs')
    ) {
      return '2';
    }

    if (path.startsWith('/attendance')) return '3';
    if (path.startsWith('/qr-requests')) return '5';
    if (path.startsWith('/profile')) return '4';

    return '1';
  };

  const role = user?.role;
  const roleItems: any[] = [];

  /* ================= ROLE-BASED MENU ================= */

  if (role === 'TUP') {
    roleItems.push(
      {
        key: '1',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">Admin Dashboard</Link>,
      },
      {
        key: '2',
        icon: <HistoryOutlined />,
        label: <Link to="/logs">Logs</Link>,
      },
      {
        key: '3',
        icon: <UserOutlined />,
        label: <Link to="/attendance">Attendance</Link>,
      },
      {
        key: '5',
        icon: <QrcodeOutlined />,
        label: <Link to="/qr-requests">QR Requests</Link>,
      },
      {
        key: '6',
        icon: <LineChartOutlined />,
        label: <Link to="/admin/analytics">Analytics</Link>,
      }
    );
  } else if (role === 'Staff') {
    roleItems.push(
      {
        key: '1',
        icon: <DashboardOutlined />,
        label: <Link to="/staff/dashboard">Staff Dashboard</Link>,
      },
      {
        key: '2',
        icon: <HistoryOutlined />,
        label: <Link to="/staff/logs">Logs</Link>,
      }
    );
  } else if (role === 'Security') {
    roleItems.push(
      {
        key: '1',
        icon: <DashboardOutlined />,
        label: <Link to="/security/dashboard">Dashboard</Link>,
      },
      {
        key: '2',
        icon: <HistoryOutlined />,
        label: <Link to="/logs">Logs</Link>,
      },
      {
        key: '3',
        icon: <UserOutlined />,
        label: <Link to="/attendance">Attendance</Link>,
      }
    );
  } else {
    // Student / Visitor
    roleItems.push(
      {
        key: '1',
        icon: <DashboardOutlined />,
        label: <Link to="/user/dashboard">Dashboard</Link>,
      },
      {
        key: '2',
        icon: <HistoryOutlined />,
        label: <Link to="/user/logs">Logs</Link>,
      }
    );
  }

  const menuItems = [
    ...roleItems,
    {
      key: '4',
      icon: <UserOutlined />,
      label: <Link to="/profile">Profile</Link>,
    },
  ];

  const logoutItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  /* ================= RENDER ================= */

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={200}
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: '#DC143C',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo */}
        <div
          style={{
            height: 64,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span
            style={{
              color: 'white',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: 1,
            }}
          >
            {collapsed ? 'T' : 'TUP VMS'}
          </span>
        </div>

        {/* Menu */}
        <div style={{ flex: 1, padding: '0 8px' }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{ backgroundColor: 'transparent', borderRight: 'none' }}
          />
        </div>

        {/* Logout */}
        <div style={{ padding: '0 8px 20px' }}>
          <Divider
            style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }}
          />
          <Menu
            mode="inline"
            selectable={false}
            items={logoutItems}
            style={{ backgroundColor: 'transparent', borderRight: 'none' }}
          />
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .ant-menu-item {
          color: rgba(255, 255, 255, 0.85) !important;
          border-radius: 8px !important;
          margin-bottom: 4px !important;
        }

        .ant-menu-item:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }

        .ant-menu-item-selected {
          background-color: #fff !important;
          color: #DC143C !important;
        }

        .ant-menu-item-selected .anticon {
          color: #DC143C !important;
        }

        .ant-layout-sider-trigger {
          background: #b01030 !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
