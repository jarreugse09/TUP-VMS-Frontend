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
  EllipsisOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { getLogs } from './../services/logService';
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

  const times = log.activities
    ?.map(a => a.timeIn)
    .filter(Boolean) as string[];

  return times.length ? times.sort()[0] : null;
};

const getTimeOut = (log: LogItem) => {
  if (log.attendance?.timeOut) return log.attendance.timeOut;

  const times = log.activities
    ?.map(a => a.timeOut)
    .filter(Boolean) as string[];

  return times.length ? times.sort().slice(-1)[0] : null;
};

/* ================= COMPONENT ================= */

const Logs = () => {
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
    setLoading(true);
    try {
      const data = await getLogs();

      // Only staff logs
      setLogs(data.filter((l: any) => l.user?.role === 'Staff'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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
            ID: {record.user._id.slice(-6)}
          </Text>
        </Space>
      ),
      sorter: (a, b) =>
        a.user.firstName.localeCompare(b.user.firstName),
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
          <Tag color={colorMap[record.dailyStatus]}>
            {record.dailyStatus}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Button
          type="primary"
          shape="circle"
          icon={<EllipsisOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setModalVisible(true);
          }}
        />
      ),
    },
  ];

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        title={
          <Space>
            <FilterOutlined onClick={() => setDrawerVisible(true)} />
            <Title level={4} style={{ margin: 0 }}>
              Attendance Logs
            </Title>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
            Refresh
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search name"
            prefix={<SearchOutlined />}
            allowClear
            onChange={e =>
              setFilters({ ...filters, name: e.target.value })
            }
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: 150 }}
            onChange={value =>
              setFilters({ ...filters, role: value })
            }
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
          <RangePicker
            onChange={dates =>
              setFilters({ ...filters, dateRange: dates })
            }
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
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
          onChange={e =>
            setFilters({ ...filters, name: e.target.value })
          }
        />
        <Select
          placeholder="Role"
          allowClear
          style={{ width: '100%', marginTop: 16 }}
          onChange={value =>
            setFilters({ ...filters, role: value })
          }
        >
          <Option value="Staff">Staff</Option>
          <Option value="Student">Student</Option>
          <Option value="Visitor">Visitor</Option>
        </Select>
        <RangePicker
          style={{ width: '100%', marginTop: 16 }}
          onChange={dates =>
            setFilters({ ...filters, dateRange: dates })
          }
        />
      </Drawer>

      {/* DETAILS MODAL */}
      <Modal
  open={modalVisible}
  onCancel={() => setModalVisible(false)}
  footer={null}
  centered
  width={560}
  title={null}
>
  {selectedLog && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Avatar
          size={72}
          src={selectedLog.user.photoURL}
          icon={<UserOutlined />}
          style={{
            border: '3px solid #DC143C',
            boxShadow: '0 4px 12px rgba(220,20,60,0.3)',
          }}
        />

        <div>
          <Title level={4} style={{ margin: 0 }}>
            {selectedLog.user.firstName} {selectedLog.user.surname}
          </Title>

          <Space size="small">
            <Tag color="red">{selectedLog.user.role}</Tag>
            <Text type="secondary">
              {dayjs(selectedLog.user.birthdate).format('MMM DD, YYYY')}
            </Text>
          </Space>
        </div>
      </div>

      {/* SUMMARY */}
      <Card
        size="small"
        variant="borderless"
        style={{
          background: '#fff4f4',
          borderRadius: 12,
        }}
      >
        <Space
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <div>
            <Text type="secondary">Time In</Text>
            <Title level={5} style={{ margin: 0 }}>
              {getTimeIn(selectedLog)
                ? dayjs(getTimeIn(selectedLog)!).format('hh:mm A')
                : '-'}
            </Title>
          </div>

          <div>
            <Text type="secondary">Time Out</Text>
            <Title level={5} style={{ margin: 0 }}>
              {getTimeOut(selectedLog)
                ? dayjs(getTimeOut(selectedLog)!).format('hh:mm A')
                : '-'}
            </Title>
          </div>
        </Space>
      </Card>

      {/* ACTIVITIES */}
      <div>
        <Title level={5} style={{ marginBottom: 8 }}>
          Activities
        </Title>

        {selectedLog.activities.length ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {selectedLog.activities.map((act, i) => (
              <Card
                key={i}
                size="small"
                variant="borderless"
                style={{
                  borderRadius: 12,
                  borderLeft: `4px solid ${
                    act.status === 'In TUP' ? '#52c41a' : '#f5222d'
                  }`,
                  background: '#fafafa',
                }}
              >
                <Space
                  direction="vertical"
                  size={4}
                  style={{ width: '100%' }}
                >
                  <Space
                    style={{
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Text strong>{act.reason.toUpperCase()}</Text>
                    <Tag
                      color={act.status === 'In TUP' ? 'green' : 'volcano'}
                    >
                      {act.status}
                    </Tag>
                  </Space>

                  <Text type="secondary">
                    In:{' '}
                    {act.timeIn
                      ? dayjs(act.timeIn).format('hh:mm A')
                      : '-'}
                  </Text>

                  <Text type="secondary">
                    Out:{' '}
                    {act.timeOut
                      ? dayjs(act.timeOut).format('hh:mm A')
                      : '-'}
                  </Text>
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No activities recorded</Text>
        )}
      </div>

      {/* ACTION */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Button
          type="primary"
          onClick={() => setModalVisible(false)}
          style={{
            background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
            border: 'none',
            borderRadius: 12,
            height: 44,
            width: 140,
            fontWeight: 600,
            boxShadow: '0 8px 16px rgba(255,77,79,0.4)',
          }}
        >
          Close
        </Button>
      </div>
    </div>
  )}
</Modal>

    </>
  );
};

export default Logs;
