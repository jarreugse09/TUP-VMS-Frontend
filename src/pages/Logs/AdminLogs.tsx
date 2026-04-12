import {
  Table,
  Card,
  Tag,
  Space,
  Typography,
  Button,
  message,
} from 'antd';
import {
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Grid } from 'antd';
import { getLogs, exportLogs } from '../../services/logService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import LogFilterDrawer from '../../components/LogFilterDrawer';
import ExportModal from '../../components/ExportModal';
import LogDetailsModal from '../../components/LogDetailsModal';

const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const { Title, Text } = Typography;

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
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    role: undefined as string | undefined,
    dateRange: null as any,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'month' | 'range'>('month');
  const [exportMonth, setExportMonth] = useState<any>(null);
  const [exportRange, setExportRange] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportPassword, setExportPassword] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async (isSilent = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!isSilent) setLoading(true);

    try {
      const data = await getLogs();

      setLogs(prev => {
        if (isEqual(prev, data)) return prev; // ✅ no re-render
        return data;
      });
    } finally {
      if (!isSilent) setLoading(false); // ✅ prevents flicker
      setIsInitialLoad(false);
      fetchingRef.current = false;
    }
  };

  const handleExport = async () => {
    if (!exportPassword) {
      message.error('Please enter your password to confirm');
      return;
    }

    let payload: any = { format: exportFormat, password: exportPassword };
    if (exportMode === 'month') {
      if (!exportMonth) return message.error('Please select a month');
      payload.month = exportMonth.format('YYYY-MM');
    } else {
      if (!exportRange || exportRange.length !== 2)
        return message.error('Please select a date range');
      payload.startDate = exportRange[0].startOf('day').toISOString();
      payload.endDate = exportRange[1].endOf('day').toISOString();
    }

    setExporting(true);
    try {
      const res = await exportLogs(payload);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      // try to extract filename from headers
      const disposition = res.headers['content-disposition'];
      let filename = 'logs_export';
      if (disposition) {
        const match = disposition.match(/filename="?(.*)"?/);
        if (match && match[1]) filename = match[1];
      }
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Export started');
      setExportModalOpen(false);
      setExportPassword('');
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        message.error('Incorrect password');
      } else {
        message.error('Export failed');
      }
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    // Initial load (WITH spinner)
    fetchLogs(false);

    // Background refresh (NO spinner)
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
      },
      {
        title: 'Role',
        render: (_, record) => (
          <Tag
            color={
              record.user.role === 'Staff'
                ? 'blue'
                : record.user.role === 'Student'
                  ? 'cyan'
                  : 'purple'
            }
          >
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
          const t = getTimeIn(record);
          return t ? dayjs(t).format('hh:mm A') : '-';
        },
      },
      {
        title: 'Time Out',
        render: (_, record) => {
          const t = getTimeOut(record);
          return t ? dayjs(t).format('hh:mm A') : '-';
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
                onClick={() => setExportModalOpen(true)}
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
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Button
            icon={<FilterOutlined />}
            onClick={() => setDrawerVisible(true)}
            type={
              filters.name || filters.role || filters.dateRange
                ? 'primary'
                : 'default'
            }
            size={isMobile ? 'small' : 'middle'}
          >
            {isMobile ? null : 'Filters'}
            {(filters.name || filters.role || filters.dateRange) && (
              <span style={{ marginLeft: 4 }}>
                (
                {[
                  filters.name && 'name',
                  filters.role && 'role',
                  filters.dateRange && 'date',
                ]
                  .filter(Boolean)
                  .join(', ')}
                )
              </span>
            )}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading && isInitialLoad} // ✅ only first load shows spinner
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 800 }}
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

      {/* FILTER DRAWER */}
      <LogFilterDrawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={() =>
          setFilters({ name: '', role: undefined, dateRange: null })
        }
      />

      {/* EXPORT MODAL */}
      <ExportModal
        open={exportModalOpen}
        onCancel={() => {
          setExportModalOpen(false);
          setExportPassword('');
        }}
        onExport={handleExport}
        exporting={exporting}
        exportMode={exportMode}
        onExportModeChange={setExportMode}
        exportMonth={exportMonth}
        onExportMonthChange={setExportMonth}
        exportRange={exportRange}
        onExportRangeChange={setExportRange}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
        exportPassword={exportPassword}
        onExportPasswordChange={setExportPassword}
      />

      {/* DETAILS MODAL */}
      <LogDetailsModal
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        record={selectedLog}
      />
    </>
  );
};

export default Logs;
