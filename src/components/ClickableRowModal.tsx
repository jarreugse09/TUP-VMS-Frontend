import React from 'react';
import { Modal, Timeline, Typography, Tag, Space, Divider } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export interface TimelineEvent {
  time: string | Date | null;
  label: string;
  status?: string;
  notes?: string;
  color?: string;
}

interface ClickableRowModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  events: TimelineEvent[];
  primaryColor?: string;
}

export const ClickableRowModal: React.FC<ClickableRowModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  events,
  primaryColor = 'blue',
}) => {
  const validEvents = events
    .filter(e => e.time)
    .sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());

  return (
    <Modal
      title={
        <Space direction="vertical" size={2}>
          <Title level={5} style={{ margin: 0 }}>{title}</Title>
          {subtitle && <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width="min(480px, calc(100vw - 24px))"
    >
      <Divider style={{ margin: '12px 0' }} />
      
      {validEvents.length > 0 ? (
        <Timeline
          style={{ marginTop: 24, paddingRight: 24 }}
          mode="left"
          items={validEvents.map((event, index) => {
            const isLast = index === validEvents.length - 1;
            return {
              color: event.color || (isLast ? primaryColor : 'gray'),
              dot: isLast ? <ClockCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
              children: (
                <div style={{ marginLeft: 8 }}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{event.label}</Text>
                    <Text type="secondary">{dayjs(event.time).format('hh:mm A')}</Text>
                    {event.status && (
                      <Tag color="cyan" style={{ marginTop: 4 }}>
                        {event.status}
                      </Tag>
                    )}
                    {event.notes && (
                      <Text type="secondary" italic style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                        "{event.notes}"
                      </Text>
                    )}
                  </Space>
                </div>
              ),
            };
          })}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Text type="secondary">No timeline events recorded.</Text>
        </div>
      )}
    </Modal>
  );
};
