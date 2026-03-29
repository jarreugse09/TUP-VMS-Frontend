import { useState } from 'react';
import { Grid } from 'antd';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Typography,
  Modal,
  Image,
  message,
  Popconfirm,
  Empty,
  Row,
  Col,
} from 'antd';
import {
  WarningOutlined,
  BellOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAlerts } from '../hooks/useAlerts';
import { deleteAlert } from '../services/alertService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Alerts = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { alerts, loading, markAsRead, refresh } = useAlerts();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'gold';
      case 'low':
        return 'green';
      default:
        return 'blue';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weapon':
        return 'red';
      case 'suspicious':
        return 'orange';
      case 'system':
        return 'blue';
      default:
        return 'default';
    }
  };

  const filteredAlerts = alerts.filter((alert: any) => {
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity)
      return false;
    if (filterRead === 'read' && !alert.isRead) return false;
    if (filterRead === 'unread' && alert.isRead) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.message.toLowerCase().includes(search) ||
        alert.cameraSource.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleViewDetail = (alert: any) => {
    setSelectedAlert(alert);
    setDetailModalOpen(true);
    if (!alert.isRead) {
      markAsRead(alert._id);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await deleteAlert(alertId);
      message.success('Alert deleted successfully');
      refresh();
    } catch (error) {
      message.error('Failed to delete alert');
    }
  };

  const columns = [
    {
      title: 'Status',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 80,
      render: (isRead: boolean) => (
        <Tag color={isRead ? 'default' : 'green'}>
          {isRead ? 'Read' : 'New'}
        </Tag>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <Space>
          {record.severity === 'critical' || record.severity === 'high' ? (
            <WarningOutlined
              style={{ color: getSeverityColor(record.severity) }}
            />
          ) : (
            <BellOutlined />
          )}
          <Text strong={!record.isRead}>{title}</Text>
        </Space>
      ),
    },
    {
      title: 'Camera',
      dataIndex: 'cameraSource',
      key: 'cameraSource',
      width: 150,
      responsive: ['md'] as any,
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence: number) => `${(confidence * 100).toFixed(1)}%`,
      responsive: ['lg'] as any,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
      responsive: ['md'] as any,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          <Popconfirm
            title="Delete this alert?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <Card
        styles={{
          header: {
            padding: isMobile ? '12px 16px' : '16px 24px',
            borderBottom: '1px solid #f0f0f0',
          },
          body: {
            padding: isMobile ? '16px' : '24px',
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            marginBottom: 16,
            gap: isMobile ? 12 : 0,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            <BellOutlined /> Alerts
          </Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={refresh}
            loading={loading}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? null : 'Refresh'}
          </Button>
        </div>

        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Input.Search
            placeholder="Search alerts..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            allowClear
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
          >
            <Option value="all">All Types</Option>
            <Option value="weapon">Weapon</Option>
            <Option value="suspicious">Suspicious</Option>
            <Option value="system">System</Option>
          </Select>
          <Select
            value={filterSeverity}
            onChange={setFilterSeverity}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
          >
            <Option value="all">All Severity</Option>
            <Option value="critical">Critical</Option>
            <Option value="high">High</Option>
            <Option value="medium">Medium</Option>
            <Option value="low">Low</Option>
          </Select>
          <Select
            value={filterRead}
            onChange={setFilterRead}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
          >
            <Option value="all">All Status</Option>
            <Option value="read">Read</Option>
            <Option value="unread">Unread</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAlerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, responsive: true }}
          rowClassName={record => (record.isRead ? '' : 'unread-alert')}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                description="No alerts found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title="Alert Details"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={window.innerWidth < 768 ? '95%' : 600}
      >
        {selectedAlert && (
          <div>
            <p>
              <strong>Title:</strong> {selectedAlert.title}
            </p>
            <p>
              <strong>Message:</strong> {selectedAlert.message}
            </p>
            <p>
              <strong>Type:</strong>{' '}
              <Tag color={getTypeColor(selectedAlert.type)}>
                {selectedAlert.type.toUpperCase()}
              </Tag>
            </p>
            <p>
              <strong>Severity:</strong>{' '}
              <Tag color={getSeverityColor(selectedAlert.severity)}>
                {selectedAlert.severity.toUpperCase()}
              </Tag>
            </p>
            <p>
              <strong>Camera:</strong> {selectedAlert.cameraSource}
            </p>
            <p>
              <strong>Detection:</strong> {selectedAlert.detectionLabel}
            </p>
            <p>
              <strong>Confidence:</strong>{' '}
              {(selectedAlert.confidence * 100).toFixed(1)}%
            </p>
            <p>
              <strong>Time:</strong>{' '}
              {dayjs(selectedAlert.createdAt).format('MMMM DD, YYYY HH:mm:ss')}
            </p>
            {selectedAlert.imageUrl && (
              <p>
                <strong>Image:</strong>
                <br />
                <Image
                  src={selectedAlert.imageUrl}
                  alt="Alert"
                  style={{ maxWidth: '100%', marginTop: 8 }}
                />
              </p>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .unread-alert {
          background-color: #f6ffed;
        }
        @media (max-width: 768px) {
          .ant-table-cell {
            padding: 8px 4px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Alerts;
