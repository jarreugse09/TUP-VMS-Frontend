import { useState, useEffect } from 'react';
import { Layout, Menu, Divider } from 'antd';
import {
  DashboardOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  LineChartOutlined,
  UsergroupDeleteOutlined,
  CalendarOutlined,
  BellOutlined,
  MessageOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider } = Layout;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
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

    // ── Attendance — covers all role-based paths ──
    if (
      path.startsWith('/attendance') ||
      path.startsWith('/staff/attendance') ||
      path.startsWith('/user/attendance') ||
      path.startsWith('/security/attendance')
    )
      return '3';

    if (path.startsWith('/qr-requests')) return '5';
    if (path.startsWith('/profile')) return '4';
    if (path.startsWith('/admin/manage-users')) return '6';
    if (path.startsWith('/admin/analytics')) return '7';
    if (path.startsWith('/alerts')) return '8';
    if (path.startsWith('/chat')) return '9';

    return '1';
  };

  const role = user?.role;
  const roleItems: any[] = [];

  /* ================= ROLE-BASED MENU ================= */

  if (role === 'TUP') {
    // Admin sees the shared /attendance (all users), not UserAttendance
    roleItems.push(
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
        icon: <CalendarOutlined />,
        label: <Link to="/attendance">Attendance</Link>,
      },
      {
        key: '5',
        icon: <QrcodeOutlined />,
        label: <Link to="/qr-requests">QR Requests</Link>,
      },
      {
        key: '6',
        icon: <UsergroupDeleteOutlined />,
        label: <Link to="/admin/manage-users">Manage Users</Link>,
      },
      {
        key: '7',
        icon: <LineChartOutlined />,
        label: <Link to="/admin/analytics">Analytics</Link>,
      },
      {
        key: '8',
        icon: <BellOutlined />,
        label: <Link to="/alerts">Alerts</Link>,
      },
      {
        key: '9',
        icon: <MessageOutlined />,
        label: <Link to="/chat">Chat</Link>,
      },
    );
  } else if (role === 'Staff') {
    roleItems.push(
      {
        key: '1',
        icon: <DashboardOutlined />,
        label: <Link to="/staff/dashboard">Dashboard</Link>,
      },
      {
        key: '2',
        icon: <HistoryOutlined />,
        label: <Link to="/staff/logs">Logs</Link>,
      },
      {
        key: '3',
        icon: <CalendarOutlined />,
        label: <Link to="/staff/attendance">Attendance</Link>,
      },
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
        icon: <CalendarOutlined />,
        label: <Link to="/security/attendance">Attendance</Link>,
      },
      {
        key: '8',
        icon: <BellOutlined />,
        label: <Link to="/alerts">Alerts</Link>,
      },
      {
        key: '9',
        icon: <MessageOutlined />,
        label: <Link to="/chat">Chat</Link>,
      },
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
      },
      {
        key: '3',
        icon: <CalendarOutlined />,
        label: <Link to="/user/attendance">Attendance</Link>,
      },
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
    <>
      {/* Mobile Burger Menu Button */}
      {isMobile && !mobileOpen && (
        <button
          onClick={toggleMobileSidebar}
          className="sidebar-burger-btn"
          aria-label="Toggle menu"
        >
          <MenuOutlined />
        </button>
      )}

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isMobile && mobileOpen ? 'visible' : ''}`}
        onClick={closeMobileSidebar}
      />

      {/* Sidebar */}
      <div
        className={`sidebar-container ${isMobile && !mobileOpen ? 'hidden' : 'visible'}`}
      >
        {/* LOGO with integrated close button */}
        <div className="sidebar-logo">
          <span>TUP VMS</span>
          {isMobile && (
            <button
              onClick={closeMobileSidebar}
              className="sidebar-close-btn"
              aria-label="Close menu"
            >
              <CloseOutlined />
            </button>
          )}
        </div>

        {/* MENU */}
        <div className="sidebar-menu-container">
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            onClick={isMobile ? closeMobileSidebar : undefined}
            style={{
              background: 'transparent',
              borderRight: 'none',
              fontWeight: 500,
            }}
          />
        </div>

        {/* LOGOUT */}
        <div className="sidebar-logout-container">
          <Divider style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
          <Menu
            mode="inline"
            selectable={false}
            items={logoutItems}
            style={{ background: 'transparent', borderRight: 'none' }}
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
