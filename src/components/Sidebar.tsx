import { useEffect, useState } from 'react';
import { Divider, Badge, Tooltip } from 'antd';
import {
  LogoutOutlined,
  BellOutlined,
  MessageOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { useChat } from '../hooks/useChat';
import { getAllowedPagesForUser, getSelectedPageId } from '../config/rolePages';
import { isAlertAudience } from '../utils/rbac';
import { getPageIcon } from '../utils/pageIcons';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const Sidebar = ({
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
}: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen;

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const setMobileOpen = (open: boolean) => {
    if (controlledMobileOpen === undefined) {
      setInternalMobileOpen(open);
    }
    onMobileOpenChange?.(open);
  };

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const selectedPageId = getSelectedPageId(location.pathname) || 'profile';
  const isNotificationAudience = isAlertAudience(user);
  const allowedPages = getAllowedPagesForUser(user);
  const { unreadCount: alertUnreadCount } = useAlerts({
    enabled: isNotificationAudience,
    playCue: isNotificationAudience,
  });
  const { unreadCount: chatUnreadCount } = useChat({
    enabled: isNotificationAudience,
  });

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = allowedPages.map(page => {
    let label = page.label;
    if (page.id === 'analytics') {
      const subRole = user?.subRole;
      if (subRole === 'dean') label = 'College Analytics';
      else if (subRole === 'department_head') label = 'Department Analytics';
      else if (user?.role === 'TUP') label = 'University Analytics';
    }

    const icon =
      page.id === 'alerts' ? (
        <Badge count={alertUnreadCount} size="small" offset={[4, -2]}>
          <BellOutlined />
        </Badge>
      ) : page.id === 'chat' ? (
        <Badge
          count={isNotificationAudience ? chatUnreadCount : 0}
          size="small"
          offset={[4, -2]}
        >
          <MessageOutlined />
        </Badge>
      ) : (
        getPageIcon(page.id)
      );

    return {
      id: page.id,
      label,
      path: page.path,
      icon,
    };
  });

  const renderNavButton = (item: (typeof menuItems)[number]) => {
    const isExactPathMatch = location.pathname === item.path;
    const isActive =
      item.id === 'alerts' || item.id === 'chat'
        ? isExactPathMatch
        : selectedPageId === item.id;
    const buttonClass = isTablet
      ? 'sidebar-tablet-item'
      : 'sidebar-desktop-item';
    const button = (
      <button
        key={item.id}
        type="button"
        className={`${buttonClass} ${isActive ? 'is-active' : ''}`.trim()}
        onClick={() => {
          navigate(item.path);
          if (isMobile) setMobileOpen(false);
        }}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="sidebar-item-icon">{item.icon}</span>
        {!isTablet && <span className="sidebar-item-label">{item.label}</span>}
      </button>
    );

    if (isTablet) {
      return (
        <Tooltip title={item.label} placement="right" key={item.id}>
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <>
      {isMobile && !mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="sidebar-burger-btn"
          aria-label="Toggle menu"
        >
          <MenuOutlined />
        </button>
      )}

      {isMobile && mobileOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar-container ${isMobile ? 'sidebar-mobile' : isTablet ? 'sidebar-tablet' : 'sidebar-desktop'} ${isMobile && mobileOpen ? 'visible' : ''}`.trim()}
      >
        {/* LOGO with integrated close button */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-copy">
            <span>{isTablet ? 'TV' : 'TUP VMS'}</span>
            {!isTablet && <small>Campus monitoring platform</small>}
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="sidebar-close-btn"
              aria-label="Close navigation"
            >
              <CloseOutlined />
            </button>
          )}
        </div>

        {/* MENU */}
        <div className="sidebar-menu-container">
          {menuItems.map(renderNavButton)}
        </div>

        {/* LOGOUT */}
        <div className="sidebar-logout-container">
          <Divider
            style={{
              borderColor: isTablet
                ? 'rgba(140,13,34,0.12)'
                : 'rgba(255,255,255,0.25)',
            }}
          />
          {isTablet ? (
            <Tooltip title="Logout" placement="right">
              <button
                type="button"
                className="sidebar-tablet-item"
                onClick={handleLogout}
              >
                <span className="sidebar-item-icon">
                  <LogoutOutlined />
                </span>
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              className="sidebar-desktop-item"
              onClick={handleLogout}
            >
              <span className="sidebar-item-icon">
                <LogoutOutlined />
              </span>
              <span className="sidebar-item-label">Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
