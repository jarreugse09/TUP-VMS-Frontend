import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Typography,
} from 'antd';
// import { useState, useEffect, useMemo } from 'react';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getAllUsers } from '../services/userService';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

interface IUser {
  _id: string;
  firstName: string;
  surname: string;
  birthdate: string;
  role: 'TUP' | 'Staff' | 'Student' | 'Visitor';
  status: 'Active' | 'In TUP' | 'Inactive';
  photoURL: string;
  createdAt: string;
}

const ManageUsers = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    name?: string;
    role?: string;
    dateRange?: any;
  }>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.name) params.name = filters.name;
      if (filters.role) params.role = filters.role;
      if (filters.dateRange?.length === 2) {
        params.startDate = filters.dateRange[0].startOf('day').toISOString();
        params.endDate = filters.dateRange[1].endOf('day').toISOString();
      }

      const data = await getAllUsers(params);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const columns = [
    {
      title: 'Photo',
      dataIndex: 'photoURL',
      render: (val: string) =>
        val ? <img src={val} alt="avatar" style={{ width: 75 }} /> : '-',
    },
    {
      title: 'Name',
      render: (_: any, record: IUser) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.firstName} {record.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record._id.slice(-6)}
          </Text>
        </Space>
      ),
      sorter: (a: IUser, b: IUser) => a.firstName.localeCompare(b.firstName),
    },
    {
      title: 'Role',
      render: (_: any, record: IUser) => <Tag color="blue">{record.role}</Tag>,
    },
    {
      title: 'Status',
      render: (_: any, record: IUser) => (
        <Tag color={record.status === 'Active' ? 'green' : 'volcano'}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('MMM DD, YYYY'),
      sorter: (a: IUser, b: IUser) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  ];

  return (
    <Card
      title={<Title level={4}>Users</Title>}
      extra={
        <Space>
          <Input
            placeholder="Search name"
            allowClear
            onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: 120 }}
            onChange={role => setFilters(f => ({ ...f, role }))}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
            <Option value="TUP">TUP</Option>
          </Select>
          <RangePicker
            onChange={range => setFilters(f => ({ ...f, dateRange: range }))}
          />
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={loading}
      />
    </Card>
  );
};

export default ManageUsers;
