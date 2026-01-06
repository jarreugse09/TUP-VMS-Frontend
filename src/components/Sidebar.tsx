import { Layout, Menu, Divider } from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
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
  const location = useLocation(); // Used to highlight the current route
  const isTUP = user?.role === 'TUP';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to find the active key based on the current URL
  const getSelectedKey = () => {
    if (location.pathname === '/dashboard') return '1';
    if (location.pathname === '/logs') return '2';
    if (location.pathname === '/attendance') return '3';
    if (location.pathname === '/profile') return '4';
    return '1';
  };

  const menuItems = [
    ...(isTUP
      ? [
          {
            key: '1',
            icon: <DashboardOutlined />,
            label: <Link to="/dashboard">Dashboard</Link>,
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
        ]
      : []),
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

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={value => setCollapsed(value)}
      width={200} // Slightly wider for a premium feel
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: '#DC143C', // Primary Crimson
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo Section */}
        <div
          style={{
            height: 64,
            margin: '16px',
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
              fontWeight: '800',
              fontSize: 20,
              letterSpacing: 1,
            }}
          >
            {collapsed ? 'T' : 'TUP VMS'}
          </span>
        </div>

        {/* Navigation Section */}
        <div style={{ flex: 1, padding: '0 8px' }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{
              backgroundColor: 'transparent',
              borderRight: 'none',
            }}
            // Apply custom crimson theme styles to the menu components via CSS-in-JS logic
            className="custom-crimson-menu"
          />
        </div>

        {/* Footer / Logout Section */}
        <div style={{ padding: '0 8px 20px 8px' }}>
          <Divider
            style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }}
          />
          <Menu
            mode="inline"
            selectable={false}
            items={logoutItems}
            style={{ backgroundColor: 'transparent', borderRight: 'none' }}
            className="logout-menu"
          />
        </div>
      </div>

      {/* Internal CSS for Hover/Active states */}
      <style>{`
        /* Text and Icon colors for all items */
        .ant-menu-item {
          color: rgba(255, 255, 255, 0.85) !important;
          border-radius: 8px !important;
          margin-bottom: 4px !important;
        }

        /* Hover effect */
        .ant-menu-item:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
        }

        /* Active/Selected item */
        .ant-menu-item-selected {
          background-color: #fff !important;
          color: #DC143C !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Selected Icon color */
        .ant-menu-item-selected .anticon {
          color: #DC143C !important;
        }

        /* Logout Item (Danger logic) */
        .logout-menu .ant-menu-item:hover {
          background-color: #ff4d4f !important;
          color: white !important;
        }

        /* Sider trigger (bottom collapse button) */
        .ant-layout-sider-trigger {
          background: #b01030 !important; /* Darker crimson for trigger */
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
