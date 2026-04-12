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
import { getLogs } from './../services/logService';
import api from '../services/api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ClickableRowModal, TimelineEvent } from '../components/ClickableRowModal';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  
  // Non-academic, maintenance, faculty, security_staff only see their own records, so hide name/role filters
  const isOwnOnly = user?.subRole === 'non_academic' || user?.subRole === 'maintenance' || user?.subRole === 'faculty' || user?.subRole === 'security_staff';

  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    dateRange: null as any,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchLogs = async (isSilent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!isSilent) setLoading(true);

    try {
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      if (!isSilent) setLoading(false); // ✅ prevents flicker
      setIsInitialLoad(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // initial load (with spinner)
    fetchLogs(false);

    // silent background refresh
    const intervalId = window.setInterval(
      () => fetchLogs(true),
      pollingIntervalMs,
    );

    const handleFocus = () => fetchLogs(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLogs(true);
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
        const logDate = dayjs(log.date);
        matchesDate =
          logDate.isAfter(start.startOf('day')) &&
          logDate.isBefore(end.endOf('day'));
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
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await api.get('/attendance/my-dtr');
                    const logs = res.data.data;
                    if (!logs || logs.length === 0) {
                      message.warning('No DTR logs found for your account.');
                      return;
                    }
                    
                    const headers = 'Date,Time In,Time Out,Total Hours,Status\n';
                    const csvContent = logs.map((l: any) => 
                      `${l.date},${l.timeIn},${l.timeOut},${l.totalHours},${l.status}`
                    ).join('\n');
                    
                    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `DTR_${dayjs().format('YYYY-MM-DD')}.csv`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    message.success('DTR downloaded successfully');
                  } catch (err) {
                    message.error('Failed to generate DTR');
                  } finally {
                    setLoading(false);
                  }
                }}
                size={isMobile ? 'small' : 'middle'}
                loading={loading}
              >
                {isMobile ? null : 'Download My DTR'}
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
          {!isOwnOnly && (
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
                style={{ width: isMobile ? '100%' : isTablet ? 160 : 120 }}
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
          loading={loading && isInitialLoad}
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
      <ClickableRowModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={selectedLog ? `Timeline for ${selectedLog.user.firstName} ${selectedLog.user.surname}` : "Timeline"}
        subtitle={selectedLog ? dayjs(selectedLog.date).format('MMMM DD, YYYY') : ""}
        primaryColor="#1890ff"
        events={selectedLog ? [
          ...(selectedLog.attendance?.timeIn ? [{ time: selectedLog.attendance.timeIn, label: "Time In", color: "green" }] : []),
          ...(selectedLog.activities || []).map(a => ({
            time: a.timeIn || a.timeOut,
            label: a.reason.charAt(0).toUpperCase() + a.reason.slice(1),
            status: a.status,
            color: a.timeOut ? "volcano" : "blue"
          })),
          ...(selectedLog.attendance?.timeOut ? [{ time: selectedLog.attendance.timeOut, label: "Time Out", color: "red" }] : [])
        ] as Array<TimelineEvent> : []}
      />
    </>
  );
};

export default Logs;
