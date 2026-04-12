import React from 'react';
import {
  DashboardOutlined,
  HistoryOutlined,
  UserOutlined,
  QrcodeOutlined,
  LineChartOutlined,
  UsergroupDeleteOutlined,
  CalendarOutlined,
  BellOutlined,
  MessageOutlined,
  ScheduleOutlined,
  SwapOutlined,
  AuditOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { AppPageId } from '../config/rolePages';

export const getPageIcon = (pageId: AppPageId): React.ReactNode => {
  const iconByPageId: Record<AppPageId, React.ReactNode> = {
    dashboard: <DashboardOutlined />,
    attendance: <CalendarOutlined />,
    qr_requests: <QrcodeOutlined />,
    qr_scanner: <QrcodeOutlined />,
    my_qr: <QrcodeOutlined />,
    archive: <HistoryOutlined />,
    manage_users: <UsergroupDeleteOutlined />,
    analytics: <LineChartOutlined />,
    work_schedules: <ScheduleOutlined />,
    special_schedules: <ClockCircleOutlined />,
    visit_logs: <HistoryOutlined />,
    transaction_logs: <SwapOutlined />,
    action_logs: <AuditOutlined />,
    chat: <MessageOutlined />,
    alerts: <BellOutlined />,
    photo_requests: <QrcodeOutlined />,
    backup: <HistoryOutlined />,
    csv_upload: <CloudUploadOutlined />,
    profile: <UserOutlined />,
  };

  return iconByPageId[pageId];
};
