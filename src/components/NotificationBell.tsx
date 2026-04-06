import { useState } from 'react';
import { Badge, Dropdown, List, Typography, Button, Empty, Spin } from 'antd';
import {
  BellOutlined,
  WarningOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useAlerts } from '../hooks/useAlerts';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const NotificationBell = () => {
  const { alerts, unreadCount, loading, markAsRead, markAllAsRead } =
    useAlerts();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'medium':
        return '#fadb14';
      case 'low':
        return '#52c41a';
      default:
        return '#1890ff';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return (
          <WarningOutlined style={{ color: getSeverityColor(severity) }} />
        );
      default:
        return <BellOutlined style={{ color: getSeverityColor(severity) }} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const dropdownContent = (
    <div style={{ width: 360, maxHeight: 400, overflow: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : alerts.length === 0 ? (
        <Empty
          description="No notifications"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: 24 }}
        />
      ) : (
        <List
          dataSource={alerts.slice(0, 10)}
          renderItem={(alert: any) => (
            <List.Item
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: alert.isRead ? 'transparent' : '#f6ffed',
                borderLeft: `3px solid ${getSeverityColor(alert.severity)}`,
              }}
              onClick={() => {
                if (!alert.isRead) markAsRead(alert._id);
                navigate('/alerts');
                setOpen(false);
              }}
            >
              <List.Item.Meta
                avatar={getSeverityIcon(alert.severity)}
                title={
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text strong style={{ fontSize: 13 }}>
                      {alert.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(alert.createdAt)}
                    </Text>
                  </div>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {alert.message}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
      {alerts.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Button
            type="link"
            onClick={() => {
              navigate('/alerts');
              setOpen(false);
            }}
          >
            View all alerts
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      popupRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          style={{ height: 40, width: 40 }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
