import { useEffect, useState, useMemo } from 'react';
import {
  Table, Card, Tag, Space, Typography, Button, Modal,
  Descriptions, Popconfirm, message, Input, Select,
} from 'antd';
import {
  ReloadOutlined, CheckOutlined, CloseOutlined,
  QrcodeOutlined, PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

dayjs.extend(utc);
dayjs.extend(timezone);
const MNL = 'Asia/Manila';
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const fmtDt = (d?: string) => d ? dayjs(d).tz(MNL).format('MMM D, YYYY hh:mm A') : '—';

interface RequesterInfo { _id: string; firstName: string; surname: string; role: string; subRole?: string; }
interface ReviewerInfo { firstName: string; surname: string; }

interface QRRequestRecord {
  _id: string;
  requesterId?: RequesterInfo;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: ReviewerInfo;
  reviewedAt?: string;
  createdAt: string;
}

const statusColor = { pending: 'orange', approved: 'green', rejected: 'red' };

const QRRequestLogs = () => {
  const { user } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [data, setData] = useState<QRRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<QRRequestRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [rejecting, setRejecting] = useState<QRRequestRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isApprover = ['superadmin', 'hr_head', 'hr_staff', 'security_head'].includes(user?.subRole || '');
  const canApproveAll = ['superadmin', 'hr_head'].includes(user?.subRole || '');
  const canApproveSecurityScope = user?.subRole === 'security_head';
  const isStudent = user?.role === 'Student';
  const isVisitor = user?.role === 'Visitor';
  const canSubmitOwn = isStudent || isVisitor;
  const isRestrictedRole = isStudent || isVisitor;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/qr-requests');
      const raw = res.data?.data || res.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() =>
    data.filter(r => !statusFilter || r.status === statusFilter),
    [data, statusFilter]
  );

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/users/qr-requests/${id}/approve`);
      message.success('Request approved');
      fetchData();
    } catch {
      message.error('Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      message.error('Rejection reason is required');
      return;
    }

    try {
      await api.patch(`/users/qr-requests/${rejecting._id}/reject`, {
        reason: rejectReason.trim(),
      });
      message.success('Request rejected');
      setRejecting(null);
      setRejectReason('');
      fetchData();
    } catch {
      message.error('Failed to reject request');
    }
  };

  const handleSubmitNew = async () => {
    if (!newReason.trim()) { message.error('Reason is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/users/qr-requests', { reason: newReason });
      message.success('QR request submitted');
      setNewModalOpen(false);
      setNewReason('');
      fetchData();
    } catch {
      message.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const canReviewRecord = (r: QRRequestRecord) => {
    if (!isApprover) return false;
    if (r.status !== 'pending') return false;
    if (canApproveAll) return true;
    if (user?.subRole === 'hr_staff') {
      const role = r.requesterId?.role;
      return role === 'Staff' || role === 'TUP';
    }
    if (canApproveSecurityScope) {
      const role = r.requesterId?.role;
      return role === 'Student' || role === 'Visitor';
    }
    return false;
  };

  const baseColumns: ColumnsType<QRRequestRecord> = [
    {
      title: 'Requester', key: 'requester',
      render: (_, r) => isRestrictedRole ? '—' : (
        r.requesterId
          ? <Text strong>{r.requesterId.firstName} {r.requesterId.surname}</Text>
          : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Role', key: 'role',
      render: (_, r) => isRestrictedRole ? '—' : (
        r.requesterId ? (
          <Tag>{r.requesterId.role}{r.requesterId.subRole ? ` / ${r.requesterId.subRole}` : ''}</Tag>
        ) : '—'
      ),
    },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    {
      title: 'Status', dataIndex: 'status',
      render: (s: 'pending' | 'approved' | 'rejected') => <Tag color={statusColor[s]}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Requested At', dataIndex: 'createdAt',
      render: fmtDt, sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Reviewed By', key: 'reviewer',
      render: (_, r) => isRestrictedRole ? '—' : (
        r.reviewedBy ? `${r.reviewedBy.firstName} ${r.reviewedBy.surname}` : '—'
      ),
    },
    { title: 'Reviewed At', dataIndex: 'reviewedAt', render: (_, r) => isRestrictedRole ? '—' : fmtDt(r.reviewedAt) },
    {
      title: 'Actions', key: 'actions',
      render: (_, r) => canReviewRecord(r) ? (
        <Space size="small">
          <Popconfirm title="Approve this request?" onConfirm={() => handleApprove(r._id)} okText="Approve" okType="primary">
            <Button type="primary" size="small" icon={<CheckOutlined />}>Approve</Button>
          </Popconfirm>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => setRejecting(r)}>Reject</Button>
        </Space>
      ) : null,
    },
  ];

  const columns: ColumnsType<QRRequestRecord> = useMemo(() => {
    if (isRestrictedRole) {
      const hideKeys = new Set(['requester', 'role', 'reviewer', 'reviewedAt']);
      return baseColumns.filter(col => !hideKeys.has(col.key as string));
    }
    return baseColumns;
  }, [isRestrictedRole]);

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Title level={4} className="text-xl sm:text-2xl font-bold text-gray-800 !mb-0"><QrcodeOutlined /> QR Request Logs</Title>
            <Space wrap>
              {canSubmitOwn && (
                <Button type="primary" className="w-full sm:w-auto" icon={<PlusOutlined />} onClick={() => setNewModalOpen(true)}>
                  Submit Request
                </Button>
              )}
              <Button className="w-full sm:w-auto" icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            </Space>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-4">
          <Select placeholder="Status" allowClear className="w-full sm:w-auto" style={{ width: 150 }} onChange={setStatusFilter} value={statusFilter || undefined}>
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="rejected">Rejected</Option>
          </Select>
        </div>
        <div className="overflow-x-auto w-full">
          <Table
            columns={columns} dataSource={filtered} rowKey="_id"
            loading={loading} scroll={{ x: 1000 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            onRow={r => ({
              onClick: (e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;
                setSelected(r); setModalOpen(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </Card>
      </div>

      {/* Detail Modal */}
      <Modal open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={Math.min(600, windowWidth - 32)} centered title="QR Request Detail">
        {selected && (
          <Descriptions bordered size="small" column={1}>
            {!isRestrictedRole && (
              <>
                <Descriptions.Item label="Requester">
                  {selected.requesterId ? `${selected.requesterId.firstName} ${selected.requesterId.surname}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Role">
                  {selected.requesterId?.role}{selected.requesterId?.subRole ? ` / ${selected.requesterId.subRole}` : ''}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="Reason">{selected.reason}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor[selected.status]}>{selected.status.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Requested At">{fmtDt(selected.createdAt)}</Descriptions.Item>
            {!isRestrictedRole && (
              <>
                <Descriptions.Item label="Reviewed By">
                  {selected.reviewedBy ? `${selected.reviewedBy.firstName} ${selected.reviewedBy.surname}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Reviewed At">{fmtDt(selected.reviewedAt)}</Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* New Request Modal */}
      <Modal
        open={newModalOpen} onCancel={() => setNewModalOpen(false)}
        onOk={handleSubmitNew} okText="Submit Request" confirmLoading={submitting}
        title="Submit QR Code Request" centered width={Math.min(600, windowWidth - 32)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text type="secondary">Explain why you need a new QR code generated for your account.</Text>
          <TextArea
            rows={4} placeholder="Reason for QR code request..."
            value={newReason} onChange={e => setNewReason(e.target.value)}
            maxLength={500} showCount
          />
        </Space>
      </Modal>

      <Modal
        open={Boolean(rejecting)}
        onCancel={() => {
          setRejecting(null);
          setRejectReason('');
        }}
        onOk={handleReject}
        okText="Reject Request"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        title="Reject QR Request"
        centered
        width={Math.min(600, windowWidth - 32)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text type="secondary">Provide the reason for rejecting this QR request.</Text>
          <TextArea
            rows={4}
            placeholder="Enter rejection reason"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            maxLength={500}
            showCount
          />
        </Space>
      </Modal>
    </>
  );
};

export default QRRequestLogs;
