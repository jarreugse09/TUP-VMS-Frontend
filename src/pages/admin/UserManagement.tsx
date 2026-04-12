import { useEffect, useState, useMemo } from 'react';
import {
  Table, Card, Input, Select, Tag, Space, Typography, Button,
  Modal, Descriptions, Avatar, Popconfirm, message, QRCode,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined,
  StopOutlined, UserOutlined, QrcodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

dayjs.extend(utc);
dayjs.extend(timezone);
const { Title, Text } = Typography;
const { Option } = Select;

interface UserRecord {
  _id: string;
  firstName: string;
  surname: string;
  email: string;
  role: string;
  subRole?: string;
  status: string;
  photoURL?: string;
  qrCode?: string;
  collegeId?: { _id: string; name: string };
  departmentId?: { _id: string; name: string };
  workScheduleId?: { name: string };
}

const roleColor: Record<string, string> = {
  TUP: 'volcano', Staff: 'blue', Student: 'cyan', Visitor: 'purple',
};

const UserManagement = () => {
  const { user } = useAuth();
  const [data, setData] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrUser, setQrUser] = useState<UserRecord | null>(null);

  const isSuperadmin = user?.subRole === 'superadmin';
  const isHrHead = user?.subRole === 'hr_head';
  const isHrStaff = user?.subRole === 'hr_staff';
  const isSecHead = user?.subRole === 'security_head';
  const isSecStaff = user?.subRole === 'security_staff';
  const isDean = user?.subRole === 'dean';
  const isDeptHead = user?.subRole === 'department_head';
  const isTopMgmt = user?.subRole === 'top_management';

  const canEdit = isSuperadmin || isHrHead || isHrStaff || isSecHead;
  const canDeactivate = isSuperadmin || isHrHead || isHrStaff || isSecHead;
  const canCreate = isSuperadmin || isHrHead || isHrStaff || isSecHead || isSecStaff;

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (isDeptHead && user?.departmentId) {
        params.departmentId = user.departmentId;
        params.subRole = 'faculty';
      } else if (isDean && user?.collegeId) {
        params.collegeId = user.collegeId;
        params.subRole = 'department_head';
      } else if (isSecStaff || isSecHead) {
        params.roles = 'Student,Visitor'; // backend expects 'roles' array or string
      }
      
      const res = await api.get('/users', { params });
      const raw = res.data?.data || res.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return data.filter(r => {
      const name = `${r.firstName} ${r.surname} ${r.email}`.toLowerCase();
      const matchName = !search || name.includes(search.toLowerCase());
      const matchRole = !roleFilter || r.role === roleFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchName && matchRole && matchStatus;
    });
  }, [data, search, roleFilter, statusFilter]);

  const handleDeactivate = async (id: string) => {
    try {
      await api.put(`/users/${id}`, { status: 'Inactive' });
      message.success('User deactivated');
      fetchData();
    } catch {
      message.error('Failed to deactivate');
    }
  };

  const handleResetQr = async (id: string) => {
    try {
      await api.post(`/qr-requests`, { reason: 'Admin reset', userId: id });
      message.success('QR reset request submitted');
    } catch {
      message.error('Failed to reset QR');
    }
  };

  const columns: ColumnsType<UserRecord> = [
    {
      title: 'User', key: 'user', width: 220,
      render: (_, r) => (
        <Space>
          <Avatar src={r.photoURL} icon={<UserOutlined />} />
          <div>
            <Text strong style={{ display: 'block' }}>{r.firstName} {r.surname}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Role', dataIndex: 'role', render: (role: string) => <Tag color={roleColor[role] || 'default'}>{role}</Tag> },
    { title: 'Sub-Role', dataIndex: 'subRole', render: (s?: string) => s ? <Tag>{s}</Tag> : '—' },
    { title: 'College', key: 'college', render: (_, r) => r.collegeId?.name || '—' },
    { title: 'Department', key: 'dept', render: (_, r) => r.departmentId?.name || '—' },
    {
      title: 'Status', dataIndex: 'status',
      render: (s: string) => <Tag color={s === 'Active' ? 'green' : 'red'}>{s}</Tag>,
    },
    {
      title: 'QR', key: 'qr',
      render: (_, r) => (
        <Button
          size="small" icon={<QrcodeOutlined />}
          onClick={e => { e.stopPropagation(); setQrUser(r); setQrModalOpen(true); }}
        >QR</Button>
      ),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => (canEdit || canDeactivate) ? (
        <Space size="small" onClick={e => e.stopPropagation()}>
          {canEdit && (
            <Button size="small" icon={<EditOutlined />}>Edit</Button>
          )}
          {canDeactivate && r.status === 'Active' && (
            <Popconfirm title="Deactivate this user?" onConfirm={() => handleDeactivate(r._id)} okType="danger">
              <Button danger size="small" icon={<StopOutlined />}>Deactivate</Button>
            </Popconfirm>
          )}
        </Space>
      ) : null,
    },
  ];

  // Read-only for dean/dept_head/sec_staff/top_mgmt — remove Actions column
  const visibleColumns = (isDean || isDeptHead || isSecStaff || isTopMgmt)
    ? columns.filter(c => c.key !== 'actions')
    : columns;

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Title level={4} style={{ margin: 0 }}><UserOutlined /> User Management</Title>
            <Space>
              {canCreate && <Button type="primary" icon={<PlusOutlined />}>New User</Button>}
              <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            </Space>
          </div>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined />} placeholder="Search name or email"
            allowClear style={{ width: 260 }}
            onChange={e => setSearch(e.target.value)}
          />
          <Select placeholder="Role" allowClear style={{ width: 130 }} onChange={setRoleFilter} value={roleFilter || undefined}>
            <Option value="TUP">TUP</Option>
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
          <Select placeholder="Status" allowClear style={{ width: 130 }} onChange={setStatusFilter} value={statusFilter || undefined}>
            <Option value="Active">Active</Option>
            <Option value="Inactive">Inactive</Option>
          </Select>
        </Space>
        <Table
          columns={visibleColumns} dataSource={filtered} rowKey="_id"
          loading={loading} scroll={{ x: 1100 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          onRow={r => ({
            onClick: () => { setSelected(r); setDetailOpen(true); },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* Detail Modal */}
      <Modal open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640} centered title="User Profile">
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space align="start">
              <Avatar size={80} src={selected.photoURL} icon={<UserOutlined />} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{selected.firstName} {selected.surname}</Title>
                <Text type="secondary">{selected.email}</Text>
              </div>
            </Space>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Role"><Tag color={roleColor[selected.role] || 'default'}>{selected.role}</Tag></Descriptions.Item>
              <Descriptions.Item label="Sub-Role">{selected.subRole ? <Tag>{selected.subRole}</Tag> : '—'}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={selected.status === 'Active' ? 'green' : 'red'}>{selected.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="College">{selected.collegeId?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Department">{selected.departmentId?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Schedule">{selected.workScheduleId?.name || '—'}</Descriptions.Item>
            </Descriptions>
            {(canEdit) && (
              <Space>
                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => handleResetQr(selected._id)}
                >
                  Reset QR
                </Button>
              </Space>
            )}
          </Space>
        )}
      </Modal>

      {/* QR Modal — shows QR image only, never raw value */}
      <Modal open={qrModalOpen} onCancel={() => setQrModalOpen(false)} footer={null} width={360} centered title="User QR Code">
        {qrUser && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {qrUser.firstName} {qrUser.surname}
            </Text>
            {qrUser.qrCode ? (
              <QRCode value={qrUser.qrCode} size={220} style={{ margin: '0 auto' }} />
            ) : (
              <Text type="secondary">No QR code assigned</Text>
            )}
            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 11 }}>
              QR code value is system-managed and cannot be displayed as text.
            </Text>
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserManagement;
