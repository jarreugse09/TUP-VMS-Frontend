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
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Grid } from 'antd';
import { getStaffLogs } from '../../services/logService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
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

const StaffLogs = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
  const [drawerVisible, setDrawerVisible] = useState(false);

  const fetchLogs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const data = await getStaffLogs();
      setLogs(data);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLogs();

    const intervalId = window.setInterval(fetchLogs, pollingIntervalMs);

    const handleFocus = () => fetchLogs();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLogs();
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

  const columns: ColumnsType<LogItem> = [
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
                Attendance Logs
              </Title>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLogs}
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
            placeholder="Search name"
            prefix={<SearchOutlined />}
            allowClear
            style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
            onChange={e => setFilters({ ...filters, name: e.target.value })}
            size={isMobile ? 'middle' : 'middle'}
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
            onChange={value => setFilters({ ...filters, role: value })}
            value={filters.role}
            size={isMobile ? 'middle' : 'middle'}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
          <RangePicker
            style={{ width: isMobile ? 'calc(50% - 4px)' : undefined }}
            onChange={dates => setFilters({ ...filters, dateRange: dates })}
            size={isMobile ? 'middle' : 'middle'}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
          scroll={{ x: isMobile ? 800 : 1100 }}
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
      </Card>

      {/* FILTER DRAWER */}
      <Drawer
        title="Filters"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
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
        <RangePicker
          style={{ width: '100%', marginTop: 16 }}
          onChange={dates => setFilters({ ...filters, dateRange: dates })}
        />
      </Drawer>

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
            const pill = ROLE_PILL[selectedLog.user.role] ?? {
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
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      size={52}
                      src={selectedLog.user.photoURL}
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
                        {selectedLog.user.firstName} {selectedLog.user.surname}
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
                        {selectedLog.user.role}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(selectedLog.date).format('dddd, MMMM D, YYYY')}
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
                      background: isIn ? '#f0fdf4' : '#fafafa',
                      border: `1px solid ${isIn ? '#bbf7d0' : '#e5e5e5'}`,
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 3,
                        }}
                      >
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
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(value).format('A')}
                          </Text>
                        )}
                      </div>
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

                          const targetPerson =
                            (act as any).wentTo || (act as any).scannedTarget;
                          const displayLabel = targetPerson
                            ? `Went to ${targetPerson.firstName} ${targetPerson.surname}`
                            : (REASON_LABEL[act.reason] ?? act.reason);

                          const subLabel = targetPerson
                            ? targetPerson.role
                            : act.timeIn || act.timeOut
                              ? `${act.timeIn ? dayjs(act.timeIn).format('h:mm A') : '—'}  →  ${act.timeOut ? dayjs(act.timeOut).format('h:mm A') : 'ongoing'}`
                              : null;

                          const total = selectedLog.activities.length;
                          const isFirst = i === 0;
                          const isLast = i === total - 1;
                          const radius =
                            isFirst && isLast
                              ? '8px'
                              : isFirst
                                ? '8px 8px 0 0'
                                : isLast
                                  ? '0 0 8px 8px'
                                  : '0';

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
                                borderRadius: radius,
                                borderTop: i > 0 ? 'none' : undefined,
                              }}
                            >
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

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 13,
                                    display: 'block',
                                    color: '#141414',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
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
                        No activities recorded
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

export default StaffLogs;
