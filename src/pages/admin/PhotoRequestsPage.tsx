import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Image,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface RequesterInfo {
  _id: string;
  firstName: string;
  surname: string;
  email: string;
  photoURL?: string;
}

interface PhotoRequest {
  _id: string;
  requesterId: RequesterInfo;
  newPhotoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));

const statusColor: Record<PhotoRequest['status'], string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

const PhotoRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState<PhotoRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isSuperadmin = user?.subRole === 'superadmin';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: PhotoRequest[] }>('/photo-requests', {
        params: { status: 'all' },
      });
      setRequests(response.data.data ?? []);
    } catch (error: unknown) {
      message.error('Failed to load photo requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/photo-requests/${id}/approve`);
      message.success('Photo request approved');
      await fetchRequests();
    } catch {
      message.error('Failed to approve photo request');
    }
  };

  const handleReject = async () => {
    if (!rejecting || !rejectReason.trim()) {
      message.error('Rejection reason is required');
      return;
    }

    try {
      await api.patch(`/photo-requests/${rejecting._id}/reject`, {
        reason: rejectReason.trim(),
      });
      message.success('Photo request rejected');
      setRejecting(null);
      setRejectReason('');
      await fetchRequests();
    } catch {
      message.error('Failed to reject photo request');
    }
  };

  const handleResubmit = async (id: string) => {
    try {
      await api.patch(`/photo-requests/${id}/resubmit`);
      message.success('Photo request moved back to pending');
      await fetchRequests();
    } catch {
      message.error('Failed to move request back to pending');
    }
  };

  const columns = useMemo<ColumnsType<PhotoRequest>>(
    () => [
      {
        title: 'Requester',
        key: 'requester',
        render: (_, record) => (
          <div>
            <Text strong>{record.requesterId.firstName} {record.requesterId.surname}</Text>
            <br />
            <Text type="secondary">{record.requesterId.email}</Text>
          </div>
        ),
      },
      {
        title: 'Current Photo',
        key: 'currentPhoto',
        render: (_, record) =>
          record.requesterId.photoURL ? (
            <Image src={record.requesterId.photoURL} width={64} height={64} className="rounded object-cover" />
          ) : (
            <Text type="secondary">None</Text>
          ),
      },
      {
        title: 'Requested Photo',
        key: 'requestedPhoto',
        render: (_, record) => (
          <img
            src={record.newPhotoUrl}
            alt="Requested profile update"
            className="max-w-xs h-16 w-16 object-cover rounded border border-slate-200"
          />
        ),
      },
      {
        title: 'Date Submitted',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => formatDate(value),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: PhotoRequest['status']) => (
          <Tag color={statusColor[value]}>{value.toUpperCase()}</Tag>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => {
          if (record.status === 'pending') {
            return (
              <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                <Button className="w-full sm:w-auto" type="primary" icon={<CheckOutlined />} onClick={() => void handleApprove(record._id)}>
                  Approve
                </Button>
                <Button className="w-full sm:w-auto" danger icon={<CloseOutlined />} onClick={() => setRejecting(record)}>
                  Reject
                </Button>
              </div>
            );
          }

          if (record.status === 'rejected' && isSuperadmin) {
            return (
              <Button className="w-full sm:w-auto" icon={<UndoOutlined />} onClick={() => void handleResubmit(record._id)}>
                Re-submit
              </Button>
            );
          }

          return <Text type="secondary">{record.status === 'approved' ? 'Read only' : 'No actions'}</Text>;
        },
      },
    ],
    [isSuperadmin],
  );

  const pendingRequests = requests.filter(request => request.status === 'pending');
  const approvedRequests = requests.filter(request => request.status === 'approved');
  const rejectedRequests = requests.filter(request => request.status === 'rejected');

  const renderTable = (dataSource: PhotoRequest[]) => (
    <div className="overflow-x-auto w-full">
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
      />
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div>
            <Title level={3} className="!text-xl sm:!text-2xl !font-bold !text-gray-800 !mb-4">
              Profile Photo Requests
            </Title>
            <Text type="secondary">
              Review pending requests and manage previously decided items.
            </Text>
          </div>
          <Button className="w-full sm:w-auto" icon={<ReloadOutlined />} onClick={() => void fetchRequests()}>
            Refresh
          </Button>
        </div>

        <Tabs
          items={[
            { key: 'pending', label: `Pending (${pendingRequests.length})`, children: renderTable(pendingRequests) },
            { key: 'approved', label: `Approved (${approvedRequests.length})`, children: renderTable(approvedRequests) },
            { key: 'rejected', label: `Rejected (${rejectedRequests.length})`, children: renderTable(rejectedRequests) },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(rejecting)}
        onCancel={() => {
          setRejecting(null);
          setRejectReason('');
        }}
        onOk={() => void handleReject()}
        okText="Reject Request"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        title="Reject Photo Request"
        centered
        width={Math.min(600, windowWidth - 32)}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text type="secondary">Provide the reason for rejecting this photo update request.</Text>
          <TextArea
            rows={4}
            value={rejectReason}
            onChange={event => setRejectReason(event.target.value)}
            placeholder="Enter rejection reason"
            maxLength={500}
            showCount
          />
        </Space>
      </Modal>
    </div>
  );
};

export default PhotoRequestsPage;
