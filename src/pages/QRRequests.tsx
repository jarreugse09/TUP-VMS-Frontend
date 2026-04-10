import { useEffect, useState, useMemo, useRef } from 'react';
import { Grid } from 'antd';
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
  Avatar,
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  getQRRequests,
  approveQRRequest,
  rejectQRRequest,
} from '../services/userService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const QR_REQUESTS_CACHE_KEY = 'qr_requests_cache_v1';
const QR_REQUESTS_CACHE_TS_KEY = 'qr_requests_cache_ts_v1';

interface QRRequestItem {
  _id: string;
  requestType?: 'QR' | 'PROFILE_PHOTO';
  reason?: string;
  oldQR?: string;
  newQR?: string;
  newQRString?: string;
  newQRImage?: string;
  oldPhotoURL?: string;
  newPhotoImage?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  userId?: {
    _id?: string;
    firstName?: string;
    surname?: string;
    role?: string;
    qrString?: string | null;
    photoURL?: string | null;
  };
}

const readQRRequestsCache = (): QRRequestItem[] => {
  try {
    const raw = window.localStorage.getItem(QR_REQUESTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readQRRequestsCacheTs = (): number => {
  const raw = window.localStorage.getItem(QR_REQUESTS_CACHE_TS_KEY);
  const ts = raw ? Number(raw) : 0;
  return Number.isFinite(ts) ? ts : 0;
};

const toAssetUrl = (path?: string) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const base = import.meta.env.VITE_API_URL || '';
  if (!base) return path;

  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const QRRequests = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);
  const refreshCooldownMs = 30000; // 30 seconds
  const lastFetchTimeRef = useRef<number>(readQRRequestsCacheTs());
  const [data, setData] = useState<QRRequestItem[]>(() => readQRRequestsCache());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QRRequestItem | null>(
    null,
  );

  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(QR_REQUESTS_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota and availability errors.
    }
  }, [data]);

  const fetch = async (force = false) => {
    const hasWarmCache = data.length > 0;
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    if (!force && hasWarmCache && timeSinceLastFetch < refreshCooldownMs) {
      return;
    }

    try {
      setLoading(true);
      const res = await getQRRequests();
      const normalized: QRRequestItem[] = Array.isArray(res)
        ? res.map((item: any) => ({
            ...item,
            // Support both backend keys while preserving current API shape.
            newQR: item?.newQR ?? item?.newQRString ?? '',
            newQRString: item?.newQRString ?? item?.newQR ?? '',
            requestType: item?.requestType || 'QR',
            oldPhotoURL: item?.oldPhotoURL || item?.userId?.photoURL || '',
            newPhotoImage: item?.newPhotoImage || '',
            userId: {
              ...item?.userId,
              qrString: item?.userId?.qrString ?? null,
              photoURL: item?.userId?.photoURL ?? null,
            },
          }))
        : [];

      setData(normalized);
      lastFetchTimeRef.current = Date.now();
      window.localStorage.setItem(
        QR_REQUESTS_CACHE_TS_KEY,
        String(lastFetchTimeRef.current),
      );
    } catch {
      message.error('Failed to load QR requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(false);
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
      render: (_: any, record: QRRequestItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.userId?.firstName} {record.userId?.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.userId?.qrString || '-'}
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
      title: 'Type',
      dataIndex: 'requestType',
      render: (value: 'QR' | 'PROFILE_PHOTO') => (
        <Tag color={value === 'PROFILE_PHOTO' ? 'magenta' : 'geekblue'}>
          {value === 'PROFILE_PHOTO' ? 'Profile Photo' : 'QR Change'}
        </Tag>
      ),
    },
    {
      title: 'Old QR',
      dataIndex: 'oldQR',
      render: (_: string, record: QRRequestItem) =>
        record.requestType === 'PROFILE_PHOTO' ? (
          '-'
        ) : (
          <Text code>{record.oldQR || '-'}</Text>
        ),
    },
    {
      title: 'New QR String',
      dataIndex: 'newQRString',
      render: (_: string, record: QRRequestItem) => {
        if (record.requestType === 'PROFILE_PHOTO') return '-';
        const qrValue = record.newQRString || record.newQR;
        return qrValue ? <Text code>{qrValue}</Text> : '-';
      },
    },
    {
      title: 'Uploaded Image',
      dataIndex: 'newQRImage',
      render: (_: string, record: QRRequestItem) => {
        const imagePath =
          record.requestType === 'PROFILE_PHOTO'
            ? record.newPhotoImage
            : record.newQRImage;

        return imagePath ? (
          <a href={toAssetUrl(imagePath)} target="_blank" rel="noreferrer">
            <Image src={toAssetUrl(imagePath)} width={80} />
          </a>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => {
        const colors: Record<string, string> = {
          Pending: 'gold',
          Approved: 'green',
          Rejected: 'red',
        };
        return <Tag color={colors[s]}>{s}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: QRRequestItem) => {
        // ⛔ Hide actions once resolved
        if (record.status !== 'Pending') {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Space>
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
              <Button danger loading={actionLoading === record._id}>
                Reject
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  /* ================= RENDER ================= */

  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
      title={
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 12 : 0,
            width: '100%',
          }}
        >
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Change Requests
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetch(true)}
            loading={loading}
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? null : 'Refresh'}
          </Button>
        </div>
      }
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
      {/* Filters */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Input
          placeholder="Search name..."
          prefix={<SearchOutlined />}
          allowClear
          style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
          onChange={e => setFilters({ ...filters, name: e.target.value })}
          size={isMobile ? 'middle' : 'middle'}
        />

        <Select
          placeholder="Role"
          allowClear
          style={{ width: isMobile ? 'calc(50% - 4px)' : isTablet ? 160 : 120 }}
          onChange={value => setFilters({ ...filters, role: value })}
          value={filters.role}
          size={isMobile ? 'middle' : 'middle'}
        >
          <Option value="Staff">Staff</Option>
          <Option value="Student">Student</Option>
          <Option value="Visitor">Visitor</Option>
        </Select>

        <Select
          placeholder="Status"
          allowClear
          style={{ width: isMobile ? 'calc(50% - 4px)' : isTablet ? 160 : 120 }}
          onChange={value => setFilters({ ...filters, status: value })}
          value={filters.status}
          size={isMobile ? 'middle' : 'middle'}
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
        scroll={{ x: isMobile ? 900 : 1040 }}
        onRow={record => ({
          onClick: event => {
            const target = event.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) {
              return;
            }
            setSelectedRequest(record);
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        open={!!selectedRequest}
        onCancel={() => setSelectedRequest(null)}
        footer={null}
        centered
        width={isMobile ? '96%' : isTablet ? 680 : '90%'}
        style={{ maxWidth: isTablet ? 680 : 580 }}
        styles={{
          content: { padding: 0, overflow: 'hidden', borderRadius: 16 },
          mask: { backdropFilter: 'blur(2px)' },
        }}
        closeIcon={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              color: '#595959',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            ✕
          </span>
        }
      >
        {selectedRequest &&
          (() => {
            const isPhotoReq = selectedRequest.requestType === 'PROFILE_PHOTO';
            const status = selectedRequest.status;

            // Status color mapping
            const statusColors: Record<string, string> = {
              PENDING: '#faad14',
              APPROVED: '#52c41a',
              REJECTED: '#ff4d4f',
            };

            return (
              <div>
                {/* ── HEADER ── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: 16,
                    padding: isMobile ? '18px 18px 16px' : '24px 24px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      size={52}
                      src={selectedRequest.userId?.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        background: '#f0f0f0',
                        border: '2px solid #fff',
                        outline: '1.5px solid #e8e8e8',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        strong
                        style={{
                          fontSize: 15,
                          color: '#141414',
                          lineHeight: 1.3,
                        }}
                      >
                        {selectedRequest.userId?.firstName}{' '}
                        {selectedRequest.userId?.surname}
                      </Text>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 7px',
                          borderRadius: 20,
                          letterSpacing: '0.2px',
                          background: '#f5f5f5',
                          color: '#595959',
                          border: '1px solid #d9d9d9',
                        }}
                      >
                        {selectedRequest.userId?.role || 'User'}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Requested on{' '}
                      {dayjs(selectedRequest.createdAt).format(
                        'MMM DD, YYYY • hh:mm A',
                      )}
                    </Text>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 20,
                      flexShrink: 0,
                      background: '#fff',
                      border: `1px solid ${statusColors[status] || '#e5e5e5'}`,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: statusColors[status] || '#9ca3af',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusColors[status] || '#6b7280',
                      }}
                    >
                      {status}
                    </Text>
                  </div>
                </div>

                {/* ── DETAILS ── */}
                <div style={{ padding: isMobile ? '16px 18px' : '20px 24px' }}>
                  {/* Request Type */}
                  <div style={{ marginBottom: 16 }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase' as any,
                        display: 'block',
                        marginBottom: 6,
                      }}
                    >
                      Request Type
                    </Text>
                    <Tag
                      color={isPhotoReq ? 'magenta' : 'geekblue'}
                      style={{ margin: 0 }}
                    >
                      {isPhotoReq ? 'Profile Photo Change' : 'QR Code Change'}
                    </Tag>
                  </div>

                  {/* Reason */}
                  {selectedRequest.reason && (
                    <div style={{ marginBottom: 16 }}>
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase' as any,
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        Reason
                      </Text>
                      <Text style={{ fontSize: 14 }}>
                        {selectedRequest.reason}
                      </Text>
                    </div>
                  )}

                  {/* QR Code Details */}
                  {!isPhotoReq && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase' as any,
                            display: 'block',
                            marginBottom: 6,
                          }}
                        >
                          Old QR Code
                        </Text>
                        <Text code style={{ fontSize: 13 }}>
                          {selectedRequest.oldQR || '—'}
                        </Text>
                      </div>
                      <div>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase' as any,
                            display: 'block',
                            marginBottom: 6,
                          }}
                        >
                          New QR Code
                        </Text>
                        <Text code style={{ fontSize: 13 }}>
                          {selectedRequest.newQRString ||
                            selectedRequest.newQR ||
                            '—'}
                        </Text>
                      </div>
                    </div>
                  )}

                  {/* Uploaded Image */}
                  {(selectedRequest.newQRImage ||
                    selectedRequest.newPhotoImage) && (
                    <div>
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase' as any,
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        {isPhotoReq ? 'New Photo' : 'New QR Image'}
                      </Text>
                      <Image
                        src={toAssetUrl(
                          isPhotoReq
                            ? selectedRequest.newPhotoImage
                            : selectedRequest.newQRImage,
                        )}
                        style={{
                          maxWidth: '100%',
                          borderRadius: 8,
                          border: '1px solid #e5e5e5',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* ── FOOTER ── */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    padding: '14px 24px',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fafafa',
                  }}
                >
                  {selectedRequest.status === 'Pending' && (
                    <>
                      <Popconfirm
                        title="Reject this request?"
                        onConfirm={() => {
                          onReject(selectedRequest._id);
                          setSelectedRequest(null);
                        }}
                      >
                        <Button
                          danger
                          loading={actionLoading === selectedRequest._id}
                          style={{ borderRadius: 8, height: 36 }}
                        >
                          Reject
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        title="Approve this request?"
                        onConfirm={() => {
                          onApprove(selectedRequest._id);
                          setSelectedRequest(null);
                        }}
                      >
                        <Button
                          type="primary"
                          loading={actionLoading === selectedRequest._id}
                          style={{
                            background:
                              'linear-gradient(135deg, #52c41a, #73d13d)',
                            border: 'none',
                            borderRadius: 8,
                            height: 36,
                          }}
                        >
                          Approve
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                  <Button
                    onClick={() => setSelectedRequest(null)}
                    style={{
                      background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                      border: 'none',
                      borderRadius: 8,
                      height: 36,
                      color: '#fff',
                      boxShadow: '0 2px 6px rgba(255,77,79,0.3)',
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </Card>
  );
};

export default QRRequests;
