import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Typography,
  Button,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Grid } from 'antd';
import { getLogs, getLogsPage } from './../services/logService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import LogDetailsModal from '../components/LogDetailsModal';
import type { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

/* ================= TYPES ================= */

interface Activity {
  reason: string;
  timeIn?: string;
  timeOut?: string;
  status: 'In TUP' | 'Checked Out';
}

interface Attendance {
  timeIn?: string;
  timeOut?: string;
  status: 'In TUP' | 'Checked Out';
}

interface LogItem {
  _id: string;
  date: string;
  user: {
    _id: string;
    qrString?: string;
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
    birthdate: string;
  };
  dailyStatus: 'In TUP' | 'Checked Out';
  attendance?: Attendance | null;
  activities: Activity[];
}

const ATTENDANCE_LOGS_CACHE_KEY = 'attendance_logs_cache_v1';

const readLogsCache = (): LogItem[] => {
  try {
    const raw = window.localStorage.getItem(ATTENDANCE_LOGS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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
  const isTablet = Boolean(screens.md && !screens.xl);
  const pollingIntervalMs = 12000;
  const refreshCooldownMs = 30000; // 30 seconds
  const fetchingRef = useRef(false);
  const backgroundFetchingRef = useRef(false);
  const logsRef = useRef<LogItem[]>([]);
  const lastSilentFetchTimeRef = useRef<number>(Date.now());
  const isInitializedRef = useRef(false);
  const [logs, setLogs] = useState<LogItem[]>(() => readLogsCache());
  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    dateRange: null as [Dayjs | null, Dayjs | null] | null,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ATTENDANCE_LOGS_CACHE_KEY, JSON.stringify(logs));
    } catch {
      // Ignore storage quota and availability errors.
    }
  }, [logs]);

  const loadAllLogsInBackground = async () => {
    if (backgroundFetchingRef.current) return;

    backgroundFetchingRef.current = true;

    try {
      const allLogs = await getLogs();
      setLogs(allLogs);
    } finally {
      backgroundFetchingRef.current = false;
    }
  };

  const fetchLogs = async (isSilent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const firstPage = await getLogsPage<LogItem>(1, 10);
      const hadExistingData = logsRef.current.length > 0;

      setLogs(prev => {
        if (!isSilent || prev.length === 0) {
          return firstPage.data;
        }

        const firstPageIds = new Set(firstPage.data.map(item => item._id));
        const remaining = prev.filter(item => !firstPageIds.has(item._id));
        return [...firstPage.data, ...remaining];
      });

      if (firstPage.meta.hasMore && (!isSilent || !hadExistingData)) {
        void loadAllLogsInBackground();
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isSilent) {
        lastSilentFetchTimeRef.current = Date.now();
      }
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (isInitializedRef.current) return; // Only run once on mount
    isInitializedRef.current = true;

    // If we have cached data, just do silent background refresh
    // Otherwise, do initial fetch with loading
    const hasCache = logs.length > 0;
    fetchLogs(!hasCache); // false = silent, true = with initial load

    // silent background refresh
    const intervalId = window.setInterval(
      () => fetchLogs(true),
      pollingIntervalMs,
    );

    const handleFocus = () => {
      const timeSinceLastFetch = Date.now() - lastSilentFetchTimeRef.current;
      if (timeSinceLastFetch >= refreshCooldownMs) {
        fetchLogs(true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastSilentFetchTimeRef.current;
        if (timeSinceLastFetch >= refreshCooldownMs) {
          fetchLogs(true);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  /* ================= FILTER ================= */

  const filteredData = useMemo(() => {
    return logs.filter(log => {
      const fullName =
        `${log.user.firstName} ${log.user.surname}`.toLowerCase();

      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.user.role === filters.role;

      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        if (start && end) {
          const logDate = dayjs(log.date);
          matchesDate =
            (logDate.isAfter(start.startOf('day')) || logDate.isSame(start.startOf('day'))) &&
            (logDate.isBefore(end.endOf('day')) || logDate.isSame(end.endOf('day')));
        }
      }

      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  /* ================= TABLE ================= */

  const columns = useMemo<ColumnsType<LogItem>>(
    () => [
      {
        title: 'Name',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text strong>
              {record.user.firstName} {record.user.surname}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.user.qrString || '-'}
            </Text>
          </Space>
        ),
        sorter: (a, b) => a.user.firstName.localeCompare(b.user.firstName),
      },
      {
        title: 'Role',
        render: (_, record) => (
          <Tag color={record.user.role === 'Staff' ? 'blue' : 'cyan'}>
            {record.user.role}
          </Tag>
        ),
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
          const timeIn = getTimeIn(record);
          return timeIn ? dayjs(timeIn).format('hh:mm A') : '-';
        },
      },
      {
        title: 'Time Out',
        render: (_, record) => {
          const timeOut = getTimeOut(record);
          return timeOut ? dayjs(timeOut).format('hh:mm A') : '-';
        },
      },
      {
        title: 'Status',
        render: (_, record) => {
          const colorMap: Record<string, string> = {
            'In TUP': 'green',
            'Checked Out': 'volcano',
          };
          return (
            <Tag color={colorMap[record.dailyStatus]}>{record.dailyStatus}</Tag>
          );
        },
      },
    ],
    [],
  );

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        style={{
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
            <Title level={4} style={{ margin: 0 }}>
              Attendance Logs
            </Title>
            <Space size={isMobile ? 8 : 'middle'}>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchLogs(false)}
                size={isMobile ? 'small' : 'middle'}
              >
                {isMobile ? null : 'Refresh'}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  // TODO: Implement download functionality
                  message.info('Download feature coming soon');
                }}
                size={isMobile ? 'small' : 'middle'}
              >
                {isMobile ? null : 'Download'}
              </Button>
            </Space>
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
            value={filters.name}
            size={isMobile ? 'middle' : 'middle'}
          />

          <Select
            placeholder="Role"
            allowClear
            style={{ width: isMobile ? '100%' : isTablet ? 160 : 120 }}
            onChange={value => setFilters({ ...filters, role: value })}
            value={filters.role}
            size={isMobile ? 'middle' : 'middle'}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>

          <DatePicker.RangePicker
            style={{ width: isMobile ? '100%' : isTablet ? 260 : undefined }}
            onChange={dates => setFilters({ ...filters, dateRange: dates })}
            value={filters.dateRange}
            size={isMobile ? 'middle' : 'middle'}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: isMobile ? 800 : 960 }}
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
      </Card>

      {/* DETAILS MODAL */}
      <LogDetailsModal
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        log={selectedLog}
        getTimeIn={getTimeIn}
        getTimeOut={getTimeOut}
      />
    </>
  );
};

export default Logs;
