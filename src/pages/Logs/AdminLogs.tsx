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
  Descriptions,
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
import { getLogs } from '../../services/logService';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

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

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

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
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredData = useMemo(() => {
    return logs.filter(log => {
      const fullName =
        `${log.user.firstName} ${log.user.surname}`.toLowerCase();

      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.user.role === filters.role;
      const logDate = dayjs(log.date);
      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        matchesDate =
          logDate.isAfter(start.startOf('day')) &&
          logDate.isBefore(end.endOf('day'));
      }

      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  const columns: ColumnsType<any> = [
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
      render: (_, record) =>
        record.attendance?.timeIn
          ? dayjs(record.attendance.timeIn).format('hh:mm A')
          : '-',
    },
    {
      title: 'Time Out',
      render: (_, record) =>
        record.attendance?.timeOut
          ? dayjs(record.attendance.timeOut).format('hh:mm A')
          : '-',
    },
    {
      title: 'Status',
      render: (_, record) => {
        const status = record.dailyStatus;

        const colorMap: Record<string, string> = {
          'In TUP': 'green',
          'Checked Out': 'volcano',
        };

        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
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
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="Search name"
            prefix={<SearchOutlined />}
            allowClear
            onChange={e => setFilters({ ...filters, name: e.target.value })}
          />
          <Select
            placeholder="Role"
            allowClear
            onChange={value => setFilters({ ...filters, role: value })}
            style={{ width: 150 }}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
          <RangePicker
            onChange={dates => setFilters({ ...filters, dateRange: dates })}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Drawer
        title="Filters"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {/* same filters as above */}
      </Drawer>

      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        title={
          selectedLog
            ? `${selectedLog.user.firstName} ${selectedLog.user.surname}`
            : ''
        }
      >
        {selectedLog && (
          <>
            <Avatar
              size={100}
              src={selectedLog.user.photoURL}
              icon={<UserOutlined />}
            />

            <Descriptions column={1} bordered>
              <Descriptions.Item label="Role">
                {selectedLog.user.role}
              </Descriptions.Item>
              <Descriptions.Item label="Birthdate">
                {dayjs(selectedLog.user.birthdate).format('MMM DD, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Time In">
                {selectedLog.attendance?.timeIn
                  ? dayjs(selectedLog.attendance.timeIn).format('hh:mm A')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Time Out">
                {selectedLog.attendance?.timeOut
                  ? dayjs(selectedLog.attendance.timeOut).format('hh:mm A')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Attendance Status">
                <Tag
                  color={
                    selectedLog.attendance?.status === 'In TUP'
                      ? 'green'
                      : 'volcano'
                  }
                >
                  {selectedLog.attendance?.status ?? '—'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="Activities" size="small">
              {selectedLog.activities?.length ? (
                selectedLog.activities.map((act: Activity, i: number) => (
                  <Card key={i} size="small" style={{ marginBottom: 8 }}>
                    <Space direction="vertical">
                      <Text strong>{act.reason.toUpperCase()}</Text>

                      <Tag
                        color={act.status === 'In TUP' ? 'green' : 'volcano'}
                      >
                        {act.status}
                      </Tag>

                      <Text>
                        In:{' '}
                        {act.timeIn ? dayjs(act.timeIn).format('hh:mm A') : '-'}
                      </Text>
                      <Text>
                        Out:{' '}
                        {act.timeOut
                          ? dayjs(act.timeOut).format('hh:mm A')
                          : '-'}
                      </Text>
                    </Space>
                  </Card>
                ))
              ) : (
                <Text type="secondary">No activities</Text>
              )}
            </Card>
          </>
        )}
      </Modal>
    </>
  );
};

export default Logs;
