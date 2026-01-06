import { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Popconfirm,
  Image,
  message,
  Card,
  Input,
  Select,
  Typography,
  Modal,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  FilterOutlined,
  SearchOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import {
  getQRRequests,
  approveQRRequest,
  rejectQRRequest,
} from '../services/userService';

const { Title, Text } = Typography;
const { Option } = Select;

const QRRequests = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetch = async () => {
    try {
      setLoading(true);
      const res = await getQRRequests();
      setData(res);
    } catch {
      message.error('Failed to load QR requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const onApprove = async (id: string) => {
    try {
      setActionLoading(id);
      await approveQRRequest(id);
      message.success('Request approved');
      fetch();
    } catch {
      message.error('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const onReject = async (id: string) => {
    try {
      setActionLoading(id);
      await rejectQRRequest(id);
      message.success('Request rejected');
      fetch();
    } catch {
      message.error('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= FILTER ================= */

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const fullName =
        `${r.userId?.firstName} ${r.userId?.surname}`.toLowerCase();

      const matchName = fullName.includes(filters.name.toLowerCase());
      const matchRole = !filters.role || r.userId?.role === filters.role;
      const matchStatus = !filters.status || r.status === filters.status;

      return matchName && matchRole && matchStatus;
    });
  }, [data, filters]);

  /* ================= TABLE COLUMNS ================= */

  const columns: any[] = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.userId?.firstName} {record.userId?.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.userId?._id?.slice(-6)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: ['userId', 'role'],
      render: (role: string) => {
        const color =
          role === 'Staff' ? 'blue' : role === 'Student' ? 'cyan' : 'purple';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: 'Old QR',
      dataIndex: 'oldQR',
      render: (t: string) => <Text code>{t}</Text>,
    },
    {
      title: 'New QR String',
      dataIndex: 'newQR',
      render: (t: string) => (t ? <Text code>{t}</Text> : '-'),
    },
    {
      title: 'New QR Image',
      dataIndex: 'newQRImage',
      render: (p: string) =>
        p ? (
          <a href={p} target="_blank" rel="noreferrer">
            <Image src={p} width={80} />
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => {
        const colors: any = {
          Pending: 'gold',
          Approved: 'green',
          Rejected: 'red',
        };
        return <Tag color={colors[s]}>{s}</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            shape="circle"
            icon={<EllipsisOutlined />}
            onClick={() => {
              setSelectedRequest(record);
              setModalVisible(true);
            }}
          />

          <Popconfirm
            title="Approve this request?"
            onConfirm={() => onApprove(record._id)}
          >
            <Button
              type="primary"
              loading={actionLoading === record._id}
              style={{
                background: 'linear-gradient(135deg, #52c41a, #73d13d)',
                border: 'none',
              }}
            >
              Approve
            </Button>
          </Popconfirm>

          <Popconfirm
            title="Reject this request?"
            onConfirm={() => onReject(record._id)}
          >
            <Button
              danger
              loading={actionLoading === record._id}
            >
              Reject
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        style={{
          height: '100%',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
        title={
          <Space>
            <FilterOutlined style={{ color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              QR Change Requests
            </Title>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetch}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        {/* Filters */}
        <div
          style={{
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Input
            placeholder="Search name..."
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 250 }}
            onChange={e =>
              setFilters({ ...filters, name: e.target.value })
            }
          />

          <Select
            placeholder="Filter by Role"
            allowClear
            style={{ width: 160 }}
            onChange={value =>
              setFilters({ ...filters, role: value })
            }
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>

          <Select
            placeholder="Status"
            allowClear
            style={{ width: 160 }}
            onChange={value =>
              setFilters({ ...filters, status: value })
            }
          >
            <Option value="Pending">Pending</Option>
            <Option value="Approved">Approved</Option>
            <Option value="Rejected">Rejected</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
        />
      </Card>

      {/* DETAILS MODAL */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={520}
        title="QR Request Details"
      >
        {selectedRequest && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="User">
              {selectedRequest.userId.firstName}{' '}
              {selectedRequest.userId.surname}
            </Descriptions.Item>

            <Descriptions.Item label="Role">
              <Tag>{selectedRequest.userId.role}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Reason">
              {selectedRequest.reason}
            </Descriptions.Item>

            <Descriptions.Item label="Old QR">
              <Text code>{selectedRequest.oldQR}</Text>
            </Descriptions.Item>

            {selectedRequest.newQR && (
              <Descriptions.Item label="New QR">
                <Text code>{selectedRequest.newQR}</Text>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Status">
              <Tag>{selectedRequest.status}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default QRRequests;
