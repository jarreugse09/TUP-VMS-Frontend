import {
  Table,
  Card,
  Input,
  DatePicker,
  Select,
  Tag,
  Space,
  Typography,
  Button,
  Modal,
  Avatar,
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Grid } from 'antd';
import {
  getLogs,
  getLogsPage,
  getStaffLogs,
  getMyTransactions,
} from '../../services/logService';
import { useAuth } from '../../contexts/AuthContext';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

/* ================= TYPES ================= */

interface Activity {
  reason: string;
  timeIn?: string;
  timeOut?: string;
  status: string;
  wentTo?: { firstName: string; surname: string; role: string } | null;
  scannedTarget?: { firstName: string; surname: string; role: string } | null;
}

interface Attendance {
  timeIn?: string;
  timeOut?: string;
  status: 'In TUP' | 'Checked Out';
}

interface LogItem {
  _id: string;
  date: string;
  userId: {
    _id: string;
    qrString?: string;
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
    birthdate: string;
  };
  dailyStatus: string;
  attendance?: Attendance | null;
  activities: Activity[];
}

const ALL_LOGS_CACHE_KEY = 'all_logs_cache_v1';

const readLogsCache = (): LogItem[] => {
  try {
    const raw = window.localStorage.getItem(ALL_LOGS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Shape returned by GET /me/transactions
interface TransactionLog {
  _id: string;
  date: string;
  timeIn?: string | null;
  timeOut?: string | null;
  status: string;
  reason: string;
  direction: 'outgoing' | 'incoming'; // outgoing = I scanned, incoming = scanned me
  otherParty?: {
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
  } | null;
  scannedQrString?: string | null;
  scannedAt?: string;
}

const normalizeUserLog = (entry: any): LogItem => ({
  ...entry,
  userId: entry.userId || entry.user,
});

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

/* ================= HELPERS ================= */

const getTimeIn = (log: LogItem) => {
  if (log.attendance?.timeIn) return log.attendance.timeIn;
  const times = log.activities?.map(a => a.timeIn).filter(Boolean) as string[];
  return times.length ? times.sort()[0] : null;
};

const getTimeOut = (log: LogItem) => {
  if (log.attendance?.timeOut) return log.attendance.timeOut;
  const times = log.activities?.map(a => a.timeOut).filter(Boolean) as string[];
  return times.length ? times.sort().slice(-1)[0] : null;
};

/* ================= COMPONENT ================= */

const Logs = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useAuth();
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const backgroundFetchingRef = useRef(false);
  const logsRef = useRef<LogItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>(() => readLogsCache());
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
    direction: undefined as string | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isNormalUser = user?.role === 'Student' || user?.role === 'Visitor';

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    if (user?.role !== 'TUP') return;
    try {
      window.localStorage.setItem(ALL_LOGS_CACHE_KEY, JSON.stringify(logs));
    } catch {
      // Ignore storage quota and availability errors.
    }
  }, [logs, user?.role]);

  const loadAllLogsInBackground = async () => {
    if (backgroundFetchingRef.current) return;
    backgroundFetchingRef.current = true;
    try {
      const data = await getLogs();
      const normalized = (data || []).map(normalizeUserLog);
      setLogs(prev => (isEqual(prev, normalized) ? prev : normalized));
    } finally {
      backgroundFetchingRef.current = false;
    }
  };

  const fetchLogs = async (isSilent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (user?.role === 'TUP') {
        const firstPage = await getLogsPage<any>(1, 10);
        const firstPageData = (firstPage.data || []).map(normalizeUserLog);
        const hadExistingData = logsRef.current.length > 0;

        setLogs(prev => {
          if (!isSilent || prev.length === 0) {
            if (isEqual(prev, firstPageData)) return prev;
            return firstPageData;
          }

          const firstPageIds = new Set(firstPageData.map(item => item._id));
          const remaining = prev.filter(item => !firstPageIds.has(item._id));
          const merged = [...firstPageData, ...remaining];
          if (isEqual(prev, merged)) return prev;
          return merged;
        });

        if (firstPage.meta.hasMore && (!isSilent || !hadExistingData)) {
          void loadAllLogsInBackground();
        }
      } else if (user?.role === 'Staff') {
        const data = await getStaffLogs();
        setLogs((data || []).map(normalizeUserLog));
      } else {
        // Student / Visitor — show bidirectional transactions
        const data = await getMyTransactions();
        setTransactions(data || []);
      }
    } catch {
      setLogs([]);
      setTransactions([]);
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLogs(false);
    const intervalId = window.setInterval(
      () => fetchLogs(true),
      pollingIntervalMs,
    );
    const handleFocus = () => fetchLogs(true);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') fetchLogs(true);
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  /* ================= FILTER ================= */

  const filteredGroupedLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const fullName =
        `${log.userId.firstName} ${log.userId.surname}`.toLowerCase();
      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.userId.role === filters.role;
      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        if (start && end) {
          const logDate = dayjs(log.date);
          matchesDate =
            (logDate.isAfter(start.startOf('day')) ||
              logDate.isSame(start.startOf('day'))) &&
            (logDate.isBefore(end.endOf('day')) ||
              logDate.isSame(end.endOf('day')));
        }
      }
      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        if (start && end) {
          matchesDate =
            (dayjs(t.date).isAfter(start.startOf('day')) ||
              dayjs(t.date).isSame(start.startOf('day'))) &&
            (dayjs(t.date).isBefore(end.endOf('day')) ||
              dayjs(t.date).isSame(end.endOf('day')));
        }
      }
      const matchesDirection =
        !filters.direction || t.direction === filters.direction;
      return matchesDate && matchesDirection;
    });
  }, [transactions, filters]);

  /* ================= COLUMNS ================= */

  // Admin / Staff grouped log columns
  const groupedColumns: ColumnsType<LogItem> = [
    {
      title: 'Name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.userId.firstName} {record.userId.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.userId.qrString || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      render: (_, record) => {
        const colorMap: Record<string, string> = {
          Staff: 'blue',
          Student: 'cyan',
          Visitor: 'purple',
        };
        return (
          <Tag color={colorMap[record.userId.role] ?? 'default'}>
            {record.userId.role}
          </Tag>
        );
      },
    },
    {
      title: 'Date',
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      render: (_, record) => dayjs(record.date).format('MMM DD, YYYY'),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Time In',
      render: (_, record) => {
        const t = getTimeIn(record);
        return t ? (
          <Space>
            <ClockCircleOutlined style={{ color: '#52c41a' }} />
            {dayjs(t).format('hh:mm A')}
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Time Out',
      render: (_, record) => {
        const t = getTimeOut(record);
        return t ? (
          <Space>
            <ClockCircleOutlined style={{ color: '#f5222d' }} />
            {dayjs(t).format('hh:mm A')}
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={record.dailyStatus === 'In TUP' ? 'green' : 'volcano'}>
          {record.dailyStatus}
        </Tag>
      ),
    },
  ];

  // Normal user bidirectional transaction columns
  const transactionColumns: ColumnsType<TransactionLog> = [
    {
      title: 'Date & Time',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{dayjs(record.date).format('MMM DD, YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.scannedAt ? dayjs(record.scannedAt).format('hh:mm A') : '—'}
          </Text>
        </Space>
      ),
      defaultSortOrder: 'descend',
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Direction',
      render: (_, record) =>
        record.direction === 'outgoing' ? (
          <Tag icon={<ArrowRightOutlined />} color="blue">
            I Scanned
          </Tag>
        ) : (
          <Tag icon={<ArrowLeftOutlined />} color="orange">
            Scanned Me
          </Tag>
        ),
      filters: [
        { text: 'I Scanned', value: 'outgoing' },
        { text: 'Scanned Me', value: 'incoming' },
      ],
      onFilter: (value, record) => record.direction === value,
    },
    {
      title: 'Other Party',
      render: (_, record) => {
        if (!record.otherParty) return <Text type="secondary">—</Text>;
        return (
          <Space>
            <Avatar size={28} icon={<UserOutlined />} />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 13 }}>
                {record.otherParty.firstName} {record.otherParty.surname}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.otherParty.role}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'QR Code',
      render: (_, record) => (
        <Text code style={{ fontSize: 11 }}>
          {record.scannedQrString || '—'}
        </Text>
      ),
    },
    {
      title: 'Status',
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
  ];

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FilterOutlined
                onClick={() => setDrawerVisible(true)}
                style={{ cursor: 'pointer', color: '#1677ff' }}
              />
              <Title level={4} style={{ margin: 0 }}>
                {isNormalUser ? 'Transaction Logs' : 'Attendance Logs'}
              </Title>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchLogs(false)}
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
          {!isNormalUser && (
            <>
              <Input
                placeholder="Search name..."
                prefix={<SearchOutlined />}
                allowClear
                style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
                onChange={e => setFilters({ ...filters, name: e.target.value })}
                value={filters.name}
                size={isMobile ? 'middle' : 'middle'}
              />

              <Select
                placeholder="Role"
                allowClear
                style={{ width: isMobile ? '100%' : 120 }}
                onChange={value => setFilters({ ...filters, role: value })}
                value={filters.role}
                size={isMobile ? 'middle' : 'middle'}
              >
                <Option value="Staff">Staff</Option>
                <Option value="Student">Student</Option>
                <Option value="Visitor">Visitor</Option>
              </Select>
            </>
          )}
          {isNormalUser && (
            <Select
              placeholder="Direction"
              allowClear
              style={{ width: isMobile ? '100%' : 160 }}
              onChange={value => setFilters({ ...filters, direction: value })}
              value={filters.direction}
              size={isMobile ? 'middle' : 'middle'}
            >
              <Option value="outgoing">I Scanned</Option>
              <Option value="incoming">Scanned Me</Option>
            </Select>
          )}
          <RangePicker
            style={{ width: isMobile ? '100%' : undefined }}
            onChange={dates => setFilters({ ...filters, dateRange: dates })}
            value={filters.dateRange}
            size={isMobile ? 'middle' : 'middle'}
          />
        </div>

        {isNormalUser ? (
          <Table<TransactionLog>
            columns={transactionColumns}
            dataSource={filteredTransactions}
            rowKey="_id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            onRow={record => ({
              onClick: event => {
                const target = event.target as HTMLElement;

                // prevent triggering when clicking buttons, links, etc.
                if (target.closest('button') || target.closest('a')) {
                  return;
                }

                // Convert TransactionLog to LogItem shape for modal
                setSelectedLog({
                  _id: record._id,
                  date: record.date,
                  userId: {
                    _id: '',
                    qrString: record.scannedQrString || '',
                    firstName: record.otherParty?.firstName || '',
                    surname: record.otherParty?.surname || '',
                    role: record.otherParty?.role || '',
                    photoURL: record.otherParty?.photoURL || '',
                    birthdate: '',
                  },
                  dailyStatus: record.status,
                  attendance: {
                    timeIn: record.timeIn || undefined,
                    timeOut: record.timeOut || undefined,
                    status: record.status as any,
                  },
                  activities: [
                    {
                      reason: record.reason,
                      timeIn: record.timeIn || undefined,
                      timeOut: record.timeOut || undefined,
                      status: record.status,
                      wentTo:
                        record.direction === 'outgoing' && record.otherParty
                          ? record.otherParty
                          : undefined,
                      scannedTarget:
                        record.direction === 'incoming' && record.otherParty
                          ? record.otherParty
                          : undefined,
                    },
                  ],
                });
                setModalVisible(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        ) : (
          <Table<LogItem>
            columns={groupedColumns}
            dataSource={filteredGroupedLogs}
            rowKey="_id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            onRow={record => ({
              onClick: event => {
                const target = event.target as HTMLElement;

                // prevent triggering when clicking buttons, links, etc.
                if (target.closest('button') || target.closest('a')) {
                  return;
                }

                setSelectedLog(record);
                setModalVisible(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>

      {/* FILTER DRAWER */}
      <Drawer
        title="Filters"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {!isNormalUser && (
          <>
            <Input
              placeholder="Search name"
              allowClear
              onChange={e => setFilters({ ...filters, name: e.target.value })}
            />
            <Select
              placeholder="Role"
              allowClear
              style={{ width: '100%', marginTop: 16 }}
              onChange={value => setFilters({ ...filters, role: value })}
            >
              <Option value="Staff">Staff</Option>
              <Option value="Student">Student</Option>
              <Option value="Visitor">Visitor</Option>
            </Select>
          </>
        )}
        {isNormalUser && (
          <Select
            placeholder="Direction"
            allowClear
            style={{ width: '100%' }}
            onChange={value => setFilters({ ...filters, direction: value })}
          >
            <Option value="outgoing">I Scanned</Option>
            <Option value="incoming">Scanned Me</Option>
          </Select>
        )}
        <RangePicker
          style={{ width: '100%', marginTop: 16 }}
          onChange={dates => setFilters({ ...filters, dateRange: dates })}
        />
      </Drawer>

      {/* DETAILS MODAL — only for grouped logs (TUP/Staff) */}
      {/* DETAILS MODAL */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={580}
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
        {selectedLog &&
          (() => {
            const timeIn = getTimeIn(selectedLog);
            const timeOut = getTimeOut(selectedLog);
            const isIn = selectedLog.dailyStatus === 'In TUP';

            const ROLE_PILL: Record<
              string,
              { bg: string; color: string; border: string }
            > = {
              Staff: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
              Student: { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
              Visitor: { bg: '#FAF5FF', color: '#6B21A8', border: '#E9D5FF' },
              TUP: { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
              Security: { bg: '#F0F9FF', color: '#075985', border: '#BAE6FD' },
            };
            const pill = ROLE_PILL[selectedLog.userId.role] ?? {
              bg: '#F5F5F5',
              color: '#404040',
              border: '#E5E5E5',
            };

            const REASON_LABEL: Record<string, string> = {
              attendance: 'Attendance',
              checkin: 'Check in',
              checkout: 'Check out',
              break: 'Break',
              'go out': 'Went out',
              transaction: 'Transaction',
              Transaction: 'Transaction',
            };

            return (
              <div>
                {/* ── HEADER ── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '24px 24px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    position: 'relative',
                  }}
                >
                  {/* Avatar with presence dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      size={52}
                      src={selectedLog.userId.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        background: '#f0f0f0',
                        border: '2px solid #fff',
                        outline: '1.5px solid #e8e8e8',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: isIn ? '#22c55e' : '#d1d5db',
                        border: '2px solid #fff',
                      }}
                    />
                  </div>

                  {/* Name + role + date */}
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
                        {selectedLog.userId.firstName}{' '}
                        {selectedLog.userId.surname}
                      </Text>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 7px',
                          borderRadius: 20,
                          letterSpacing: '0.2px',
                          background: pill.bg,
                          color: pill.color,
                          border: `1px solid ${pill.border}`,
                        }}
                      >
                        {selectedLog.userId.role}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(selectedLog.date).format('dddd, MMMM D, YYYY')}
                    </Text>
                  </div>

                  {/* Status badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 11px',
                      borderRadius: 20,
                      background: isIn ? '#f0fdf4' : '#fafafa',
                      border: `1px solid ${isIn ? '#bbf7d0' : '#e5e5e5'}`,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isIn ? '#16a34a' : '#9ca3af',
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: isIn ? '#15803d' : '#6b7280',
                      }}
                    >
                      {selectedLog.dailyStatus}
                    </Text>
                  </div>
                </div>

                {/* ── TIME ROW ── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    background: '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  {[
                    { label: 'Time in', value: timeIn, dot: '#22c55e' },
                    {
                      label: 'Time out',
                      value: timeOut,
                      dot: '#f97316',
                      divided: true,
                    },
                  ].map(({ label, value, dot, divided }) => (
                    <div
                      key={label}
                      style={{
                        padding: '16px 20px',
                        borderLeft: divided ? '1px solid #f0f0f0' : undefined,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: dot,
                          }}
                        />
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.4px',
                            textTransform: 'uppercase' as any,
                          }}
                        >
                          {label}
                        </Text>
                      </div>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color: value ? '#141414' : '#d1d5db',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.5px',
                        }}
                      >
                        {value ? dayjs(value).format('h:mm') : '—'}
                      </Text>
                      {value && (
                        <Text
                          type="secondary"
                          style={{ fontSize: 12, marginLeft: 3 }}
                        >
                          {dayjs(value).format('A')}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── ACTIVITIES ── */}
                <div style={{ padding: '20px 24px' }}>
                  {selectedLog.activities.length > 0 ? (
                    <>
                      <Text
                        type="secondary"
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase' as any,
                          display: 'block',
                          marginBottom: 12,
                        }}
                      >
                        Activity log · {selectedLog.activities.length}{' '}
                        {selectedLog.activities.length === 1
                          ? 'entry'
                          : 'entries'}
                      </Text>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                      >
                        {selectedLog.activities.map((act, i) => {
                          const actIsIn = act.status === 'In TUP';
                          const accentClr = actIsIn ? '#16a34a' : '#dc2626';
                          const bgClr = actIsIn ? '#f0fdf4' : '#fff7f7';
                          const bdClr = actIsIn ? '#bbf7d0' : '#fecaca';

                          const targetPerson = act.wentTo || act.scannedTarget;
                          const displayLabel = targetPerson
                            ? `Went to ${targetPerson.firstName} ${targetPerson.surname}`
                            : (REASON_LABEL[act.reason] ?? act.reason);

                          const subLabel = targetPerson
                            ? targetPerson.role
                            : act.timeIn || act.timeOut
                              ? `${act.timeIn ? dayjs(act.timeIn).format('h:mm A') : '—'}  →  ${act.timeOut ? dayjs(act.timeOut).format('h:mm A') : 'ongoing'}`
                              : null;

                          const isFirst = i === 0;
                          const isLast =
                            i === selectedLog.activities.length - 1;

                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '11px 14px',
                                background: '#fff',
                                border: '1px solid #f0f0f0',
                                borderLeft: `3px solid ${accentClr}`,
                                borderRadius:
                                  isFirst && isLast
                                    ? 8
                                    : isFirst
                                      ? '8px 8px 0 0'
                                      : isLast
                                        ? '0 0 8px 8px'
                                        : 0,
                                borderTop: i > 0 ? 'none' : undefined,
                              }}
                            >
                              {/* Icon circle */}
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: bgClr,
                                  border: `1px solid ${bdClr}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <ClockCircleOutlined
                                  style={{ fontSize: 13, color: accentClr }}
                                />
                              </div>

                              {/* Text */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#141414',
                                  }}
                                >
                                  {displayLabel}
                                </Text>
                                {subLabel && (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    {subLabel}
                                  </Text>
                                )}
                              </div>

                              {/* Status pill */}
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: '2px 9px',
                                  borderRadius: 20,
                                  flexShrink: 0,
                                  background: bgClr,
                                  color: accentClr,
                                  border: `1px solid ${bdClr}`,
                                }}
                              >
                                {act.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 0',
                        border: '1px dashed #e5e5e5',
                        borderRadius: 8,
                      }}
                    >
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        No activity details recorded
                      </Text>
                    </div>
                  )}
                </div>

                {/* ── FOOTER ── */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '14px 24px',
                    borderTop: '1px solid #f0f0f0',
                    background: '#fafafa',
                  }}
                >
                  <Button
                    onClick={() => setModalVisible(false)}
                    style={{
                      background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                      border: 'none',
                      borderRadius: 8,
                      height: 36,
                      padding: '0 22px',
                      fontWeight: 500,
                      fontSize: 13,
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
    </>
  );
};

export default Logs;
