import { useMemo, useState } from 'react';
import { DatePicker, Grid } from 'antd';
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
  CameraOutlined,
  ClockCircleOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAlerts } from '../hooks/useAlerts';
import { deleteAlert } from '../services/alertService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Alerts = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { alerts, loading, markAsRead, updateIncidentStatus, refresh } =
    useAlerts();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [filterIncidentStatus, setFilterIncidentStatus] = useState<string>('all');
  const [filterCameraSource, setFilterCameraSource] = useState<string>('all');
  const [filterDetectionLabel, setFilterDetectionLabel] = useState<string>('all');
  const [filterDetectedObject, setFilterDetectedObject] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

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

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return 'gold';
      case 'in_progress':
        return 'processing';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const cameraOptions = useMemo(
    () => Array.from(new Set(alerts.map((alert: any) => alert.cameraSource))).sort(),
    [alerts],
  );
  const detectionOptions = useMemo(
    () => Array.from(new Set(alerts.map((alert: any) => alert.detectionLabel))).sort(),
    [alerts],
  );
  const detectedObjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          alerts.flatMap((alert: any) =>
            Array.isArray(alert.detectedObjects) ? alert.detectedObjects : [],
          ),
        ),
      ).sort(),
    [alerts],
  );

  const filteredAlerts = alerts.filter((alert: any) => {
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity)
      return false;
    if (filterRead === 'read' && !alert.isRead) return false;
    if (filterRead === 'unread' && alert.isRead) return false;
    if (
      filterIncidentStatus !== 'all' &&
      alert.incidentStatus !== filterIncidentStatus
    )
      return false;
    if (filterCameraSource !== 'all' && alert.cameraSource !== filterCameraSource)
      return false;
    if (
      filterDetectionLabel !== 'all' &&
      alert.detectionLabel !== filterDetectionLabel
    )
      return false;
    if (
      filterDetectedObject !== 'all' &&
      !(alert.detectedObjects || []).includes(filterDetectedObject)
    )
      return false;
    if (filterDateRange?.length === 2) {
      const createdAt = dayjs(alert.createdAt);
      const [start, end] = filterDateRange;
      if (
        createdAt.isBefore(start.startOf('day')) ||
        createdAt.isAfter(end.endOf('day'))
      ) {
        return false;
      }
    }
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.message.toLowerCase().includes(search) ||
        alert.cameraSource.toLowerCase().includes(search) ||
        alert.detectionLabel.toLowerCase().includes(search) ||
        (alert.detectedObjects || []).some((item: string) =>
          item.toLowerCase().includes(search),
        )
      );
    }
    return true;
  });

  const handleIncidentStatusUpdate = async (incidentStatus: string) => {
    if (!selectedAlert?._id) return;
    try {
      setStatusUpdating(incidentStatus);
      const updated = await updateIncidentStatus(
        selectedAlert._id,
        incidentStatus as any,
      );
      setSelectedAlert(updated);
      message.success(`Alert marked as ${incidentStatus.replace('_', ' ')}`);
    } catch {
      message.error('Failed to update incident status');
    } finally {
      setStatusUpdating(null);
    }
  };

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
      title: 'Incident',
      dataIndex: 'incidentStatus',
      key: 'incidentStatus',
      width: 140,
      render: (incidentStatus: string) => (
        <Tag color={getIncidentStatusColor(incidentStatus)}>
          {incidentStatus.replace('_', ' ').toUpperCase()}
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
            onClick={e => {
              e.stopPropagation();
              handleViewDetail(record);
            }}
          />
          <Popconfirm
            title="Delete this alert?"
            onConfirm={e => {
              e?.stopPropagation?.();
              handleDelete(record._id);
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={e => e.stopPropagation()}
            />
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
          <Select
            value={filterIncidentStatus}
            onChange={setFilterIncidentStatus}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 160 }}
          >
            <Option value="all">All Incidents</Option>
            <Option value="new">New</Option>
            <Option value="acknowledged">Acknowledged</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="resolved">Resolved</Option>
          </Select>
          <Select
            value={filterCameraSource}
            onChange={setFilterCameraSource}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 170 }}
            showSearch
          >
            <Option value="all">All Cameras</Option>
            {cameraOptions.map(source => (
              <Option key={source} value={source}>
                {source}
              </Option>
            ))}
          </Select>
          <Select
            value={filterDetectionLabel}
            onChange={setFilterDetectionLabel}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 170 }}
            showSearch
          >
            <Option value="all">All Labels</Option>
            {detectionOptions.map(label => (
              <Option key={label} value={label}>
                {label}
              </Option>
            ))}
          </Select>
          <Select
            value={filterDetectedObject}
            onChange={setFilterDetectedObject}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 190 }}
            showSearch
          >
            <Option value="all">All Objects</Option>
            {detectedObjectOptions.map(objectName => (
              <Option key={objectName} value={objectName}>
                {objectName}
              </Option>
            ))}
          </Select>
          <RangePicker
            value={filterDateRange}
            onChange={setFilterDateRange}
            style={{ width: isMobile ? '100%' : 280 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredAlerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, responsive: true }}
          rowClassName={record => (record.isRead ? '' : 'unread-alert')}
          onRow={record => ({
            onClick: () => handleViewDetail(record),
            style: { cursor: 'pointer' },
          })}
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
          <Button
            key="ack"
            icon={<AuditOutlined />}
            loading={statusUpdating === 'acknowledged'}
            onClick={() => handleIncidentStatusUpdate('acknowledged')}
          >
            Acknowledge
          </Button>,
          <Button
            key="progress"
            icon={<SyncOutlined />}
            loading={statusUpdating === 'in_progress'}
            onClick={() => handleIncidentStatusUpdate('in_progress')}
          >
            In Progress
          </Button>,
          <Button
            key="resolve"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={statusUpdating === 'resolved'}
            onClick={() => handleIncidentStatusUpdate('resolved')}
          >
            Resolve
          </Button>,
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={isMobile ? '96%' : !screens.xl ? 680 : 720}
      >
        {selectedAlert && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                padding: isMobile ? 16 : 20,
                borderRadius: 16,
                background:
                  selectedAlert.severity === 'critical'
                    ? 'linear-gradient(135deg, #fff1f0 0%, #fff7e6 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
                border: `1px solid ${
                  selectedAlert.severity === 'critical' ? '#ffccc7' : '#d6e4ff'
                }`,
              }}
            >
              <Space
                direction="vertical"
                size={10}
                style={{ width: '100%' }}
              >
                <Space wrap>
                  <Tag
                    color={getSeverityColor(selectedAlert.severity)}
                    style={{ paddingInline: 10, borderRadius: 999 }}
                  >
                    {selectedAlert.severity.toUpperCase()}
                  </Tag>
                  <Tag
                    color={getTypeColor(selectedAlert.type)}
                    style={{ paddingInline: 10, borderRadius: 999 }}
                  >
                    {selectedAlert.type.toUpperCase()}
                  </Tag>
                  <Tag
                    color={selectedAlert.isRead ? 'default' : 'green'}
                    style={{ paddingInline: 10, borderRadius: 999 }}
                  >
                    {selectedAlert.isRead ? 'READ' : 'NEW'}
                  </Tag>
                  <Tag
                    color={getIncidentStatusColor(selectedAlert.incidentStatus)}
                    style={{ paddingInline: 10, borderRadius: 999 }}
                  >
                    {selectedAlert.incidentStatus.replace('_', ' ').toUpperCase()}
                  </Tag>
                </Space>

                <div>
                  <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                    {selectedAlert.title}
                  </Title>
                  <Text
                    type="secondary"
                    style={{
                      display: 'block',
                      marginTop: 8,
                      fontSize: isMobile ? 13 : 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedAlert.message}
                  </Text>
                </div>
              </Space>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <div className="alert-detail-stat">
                  <CameraOutlined className="alert-detail-icon" />
                  <Text type="secondary">Camera Source</Text>
                  <Text strong>{selectedAlert.cameraSource}</Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="alert-detail-stat">
                  <ScanOutlined className="alert-detail-icon" />
                  <Text type="secondary">Detection Label</Text>
                  <Text strong>{selectedAlert.detectionLabel}</Text>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="alert-detail-stat">
                  <WarningOutlined className="alert-detail-icon" />
                  <Text type="secondary">Confidence</Text>
                  <Text strong>
                    {(selectedAlert.confidence * 100).toFixed(1)}%
                  </Text>
                </div>
              </Col>
            </Row>

            <div className="alert-detail-section">
              <Space
                align="center"
                style={{ marginBottom: 10, color: '#475569' }}
              >
                <ClockCircleOutlined />
                <Text strong>Incident Timeline</Text>
              </Space>
              <div className="alert-detail-meta-row">
                <Text type="secondary">Triggered</Text>
                <Text strong>
                  {dayjs(selectedAlert.createdAt).format(
                    'MMMM DD, YYYY HH:mm:ss',
                  )}
                </Text>
              </div>
              {selectedAlert.acknowledgedAt && (
                <div className="alert-detail-meta-row">
                  <Text type="secondary">Acknowledged</Text>
                  <Text strong>
                    {dayjs(selectedAlert.acknowledgedAt).format(
                      'MMMM DD, YYYY HH:mm:ss',
                    )}
                  </Text>
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div className="alert-detail-meta-row">
                  <Text type="secondary">Resolved</Text>
                  <Text strong>
                    {dayjs(selectedAlert.resolvedAt).format(
                      'MMMM DD, YYYY HH:mm:ss',
                    )}
                  </Text>
                </div>
              )}
            </div>

            {!!selectedAlert.detectedObjects?.length && (
              <div className="alert-detail-section">
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  Detected Objects From Hawkeye
                </Text>
                <Space size={[8, 8]} wrap>
                  {selectedAlert.detectedObjects.map((item: string) => (
                    <Tag
                      key={item}
                      color={getTypeColor(selectedAlert.type)}
                      style={{
                        paddingInline: 10,
                        paddingBlock: 4,
                        borderRadius: 999,
                        fontSize: 13,
                      }}
                    >
                      {item}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {selectedAlert.imageUrl && (
              <div className="alert-detail-section">
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  Evidence Snapshot
                </Text>
                <Image
                  src={selectedAlert.imageUrl}
                  alt="Alert"
                  style={{
                    width: '100%',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .unread-alert {
          background-color: #f6ffed;
        }
        .unread-alert:hover > td {
          background: #eefbe8 !important;
        }
        .alert-detail-stat {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 108px;
          padding: 16px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        .alert-detail-icon {
          font-size: 18px;
          color: #b1122b;
        }
        .alert-detail-section {
          padding: 16px 18px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
        }
        .alert-detail-meta-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        @media (max-width: 768px) {
          .ant-table-cell {
            padding: 8px 4px !important;
          }
          .alert-detail-meta-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Alerts;
