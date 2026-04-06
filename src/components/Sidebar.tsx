import { useState, useEffect } from 'react';
import { Menu, Divider, Badge, Grid } from 'antd';
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
import { useAlerts } from '../hooks/useAlerts';
import { useChat } from '../hooks/useChat';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCompactNav = !screens.xl;
  const isMobile = !screens.md;
  const burgerLabel = isMobile ? 'Toggle menu' : 'Toggle navigation';

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isCompactNav) {
      setMobileOpen(false);
    }
  }, [location.pathname, isCompactNav]);

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

  const role =
    user?.role === 'Staff' && user?.staffType === 'Security'
      ? 'Security'
      : user?.role;
  const isNotificationAudience = role === 'TUP' || role === 'Security';
  const { unreadCount: alertUnreadCount } = useAlerts({
    enabled: isNotificationAudience,
    playCue: isNotificationAudience,
  });
  const { unreadCount: chatUnreadCount } = useChat();
  const roleItems: any[] = [];
  const alertIcon = (
    <Badge count={alertUnreadCount} size="small" offset={[4, -2]}>
      <BellOutlined />
    </Badge>
  );
  const chatIcon = (
    <Badge count={isNotificationAudience ? chatUnreadCount : 0} size="small" offset={[4, -2]}>
      <MessageOutlined />
    </Badge>
  );

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
        icon: alertIcon,
        label: <Link to="/alerts">Alerts</Link>,
      },
      {
        key: '9',
        icon: chatIcon,
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
        icon: alertIcon,
        label: <Link to="/alerts">Alerts</Link>,
      },
      {
        key: '9',
        icon: chatIcon,
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
      {isCompactNav && !mobileOpen && (
        <button
          onClick={toggleMobileSidebar}
          className="sidebar-burger-btn"
          aria-label={burgerLabel}
        >
          <MenuOutlined />
        </button>
      )}

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isCompactNav && mobileOpen ? 'visible' : ''}`}
        onClick={closeMobileSidebar}
      />

      {/* Sidebar */}
      <div
        className={`sidebar-container ${isCompactNav ? 'is-compact' : 'is-desktop'} ${isCompactNav && !mobileOpen ? 'hidden' : 'visible'}`}
      >
        {/* LOGO with integrated close button */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-copy">
            <span>TUP VMS</span>
            <small>Campus monitoring platform</small>
          </div>
          {isCompactNav && (
            <button
              onClick={closeMobileSidebar}
              className="sidebar-close-btn"
              aria-label="Close navigation"
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
            onClick={isCompactNav ? closeMobileSidebar : undefined}
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
