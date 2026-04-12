import { useEffect, useState } from 'react';
import {
  Table, Tabs, Card, Button, Modal, Input, Typography, Space, Badge, message, Avatar, Tag, Form
} from 'antd';
import {
  HistoryOutlined, UserOutlined, QrcodeOutlined, ReloadOutlined, 
  RollbackOutlined, AuditOutlined, FileImageOutlined, UsergroupDeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ArchiveUserRef {
  _id?: string;
  firstName?: string;
  surname?: string;
  email?: string;
  photoURL?: string;
}

interface ApiErrorResponse {
  message?: string;
}

interface ArchiveRecord {
  _id: string;
  firstName?: string;
  surname?: string;
  email?: string;
  photoURL?: string;
  status: string;
  updatedAt: string;
  // Specific to requests
  userId?: ArchiveUserRef;
  requesterId?: ArchiveUserRef;
  reviewedBy?: ArchiveUserRef;
  rejectionReason?: string;
  newPhotoUrl?: string;
}

const Archive = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [restoreForm] = Form.useForm();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/archive', { params: { type: activeTab } });
      setData(res.data);
    } catch {
      message.error('Failed to fetch archived data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenRestore = (record: ArchiveRecord) => {
    setSelectedRecord(record);
    setRestoreModalOpen(true);
    restoreForm.resetFields();
  };

  const handleRestore = async (values: { reason: string }) => {
    if (!selectedRecord) return;
    try {
      await api.patch(`/admin/archive/restore/${activeTab}/${selectedRecord._id}`, {
        reason: values.reason
      });
      message.success('Record restored successfully');
      setRestoreModalOpen(false);
      fetchData();
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      message.error(error.response?.data?.message || 'Restoration failed');
    }
  };

  const userColumns: ColumnsType<ArchiveRecord> = [
    {
      title: 'User',
      key: 'user',
      render: (_, r) => (
        <Space>
          <Avatar src={r.photoURL as string} icon={<UserOutlined />} />
          <div>
            <Text strong>{r.firstName} {r.surname}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Current Status',
      dataIndex: 'status',
      render: (s) => <Tag color="gray">{s}</Tag>
    },
    {
      title: 'Archived On',
      dataIndex: 'updatedAt',
      render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => (
        <Button 
          type="primary" 
          icon={<RollbackOutlined />} 
          onClick={() => handleOpenRestore(r)}
        >
          Restore
        </Button>
      )
    }
  ];

  const qrColumns: ColumnsType<ArchiveRecord> = [
    {
      title: 'User',
      key: 'user',
      render: (_, r) => {
        const u = r.userId;
        return (
          <Space>
            <Avatar src={u?.photoURL} icon={<UserOutlined />} />
            <div>
              <Text strong>{u?.firstName} {u?.surname}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{u?.email}</Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectionReason',
      render: (text) => text || '—'
    },
    {
      title: 'Reviewed By',
      dataIndex: 'reviewedBy',
      render: (rb) => rb ? `${rb.firstName} ${rb.surname}` : '—'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => (
        <Button 
          type="primary" 
          icon={<RollbackOutlined />} 
          onClick={() => handleOpenRestore(r)}
        >
          Approve
        </Button>
      )
    }
  ];

  const photoColumns: ColumnsType<ArchiveRecord> = [
    {
      title: 'User',
      key: 'user',
      render: (_, r) => {
        const u = r.requesterId;
        return (
          <Space>
            <Avatar src={u?.photoURL} icon={<UserOutlined />} />
            <div>
              <Text strong>{u?.firstName} {u?.surname}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{u?.email}</Text>
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Requested Photo',
      dataIndex: 'newPhotoUrl',
      render: (url) => <Avatar shape="square" size={64} src={url} icon={<FileImageOutlined />} />
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectionReason',
      render: (text) => text || '—'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => (
        <Button 
          type="primary" 
          icon={<RollbackOutlined />} 
          onClick={() => handleOpenRestore(r)}
        >
          Approve
        </Button>
      )
    }
  ];

  const renderTable = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="overflow-x-auto w-full">
            <Table columns={userColumns} dataSource={data} rowKey="_id" loading={loading} />
          </div>
        );
      case 'qr_requests':
        return (
          <div className="overflow-x-auto w-full">
            <Table columns={qrColumns} dataSource={data} rowKey="_id" loading={loading} />
          </div>
        );
      case 'photo_requests':
        return (
          <div className="overflow-x-auto w-full">
            <Table columns={photoColumns} dataSource={data} rowKey="_id" loading={loading} />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <Card
        title={
          <Space wrap>
            <HistoryOutlined />
            <Title level={4} className="!m-0 !text-xl sm:!text-2xl !font-bold !text-gray-800">
              Archive &amp; Recovery Center
            </Title>
            <Badge status="processing" text="Superadmin Only" />
          </Space>
        }
        extra={
          <Button className="w-full sm:w-auto" icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Review and restore records that were soft-deleted or rejected. Every restoration is audited for DPA 2012 compliance.
        </Text>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'users', label: 'Archived Users', icon: <UsergroupDeleteOutlined /> },
            { key: 'qr_requests', label: 'Rejected QR Requests', icon: <QrcodeOutlined /> },
            { key: 'photo_requests', label: 'Rejected Photo Requests', icon: <FileImageOutlined /> },
            { key: 'logs', label: 'System Logs', icon: <AuditOutlined />, disabled: true }
          ]}
        />

        {renderTable()}
      </Card>

      <Modal
        title={activeTab === 'users' ? "Restore User Account" : "Approve Rejected Request"}
        open={restoreModalOpen}
        onCancel={() => setRestoreModalOpen(false)}
        footer={null}
        destroyOnClose
        width={Math.min(600, windowWidth - 32)}
      >
        <Form form={restoreForm} layout="vertical" onFinish={handleRestore}>
          <Form.Item
            name="reason"
            label="Reason for Restoration/Approval"
            rules={[{ required: true, message: 'Please provide a forensic reason for this action' }]}
          >
            <TextArea rows={4} placeholder="Log the administrative justification for restoring this data..." />
          </Form.Item>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:justify-end">
            <Button className="w-full sm:w-auto" onClick={() => setRestoreModalOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" type="primary" htmlType="submit">
              Execute Restoration
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Archive;
