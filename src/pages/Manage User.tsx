import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Typography,
  Form,
  Button,
  Row,
  Col,
  Divider,
  message,
  Modal,
  Avatar,
  Grid,
} from 'antd';
import { useState, useEffect } from 'react';
import {
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminRegisterUser, getAllUsers } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const QR_PATTERN = /^(TUPM|TUPS|TUPV)-\d{2}-\d{4}$/;

interface IUser {
  _id: string;
  qrString?: string;
  firstName: string;
  surname: string;
  birthdate: string;
  role: 'TUP' | 'Staff' | 'Student' | 'Visitor';
  staffType?: string;
  status: 'Active' | 'In TUP' | 'Inactive';
  photoURL: string;
  email: string;
  createdAt: string;
}

const ManageUsers = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);
  const { user } = useAuth();
  const canRegister = ['superadmin', 'hr_head', 'hr_staff'].includes(
    user?.subRole || '',
  );

  const [registerForm] = Form.useForm();
  const selectedRole = Form.useWatch('role', registerForm);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
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

  const handleAdminRegister = async (values: any) => {
    setRegistering(true);
    try {
      await adminRegisterUser({
        firstName: values.firstName.trim(),
        surname: values.surname.trim(),
        birthdate: values.birthdate.toISOString(),
        role: values.role,
        staffType: values.role === 'Staff' ? values.staffType : undefined,
        email: values.email.trim().toLowerCase(),
        password: values.password,
        customQR: values.customQR.trim(),
      });

      message.success('Account created successfully');
      registerForm.resetFields();
      setShowRegisterForm(false);
      fetchUsers();
    } catch (error: any) {
      const apiErrors = error?.response?.data?.errors;
      const apiMessage = error?.response?.data?.message;

      if (apiMessage === 'Invalid QR format. Use TUPM/TUPS/TUPV-YY-XXXX.') {
        message.error('Invalid QR format. Use TUPM/TUPS/TUPV-YY-XXXX.');
        return;
      }

      if (
        apiMessage === 'QR string already exists. Please use a unique value.'
      ) {
        message.error('QR string already exists. Please use a unique value.');
        return;
      }

      if (apiErrors?.length) {
        message.error(apiErrors.map((e: any) => e.msg).join(' | '));
        return;
      }

      message.error(apiMessage || 'Failed to create account');
    } finally {
      setRegistering(false);
    }
  };

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
            {record.qrString || '-'}
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
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {showRegisterForm ? (
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
                Register New Student/Staff
              </Title>
              <Button
                onClick={() => {
                  setShowRegisterForm(false);
                  registerForm.resetFields();
                }}
                size={isMobile ? 'small' : 'middle'}
              >
                Back to Users
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
          <Form
            form={registerForm}
            layout="vertical"
            onFinish={handleAdminRegister}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="First Name"
                  name="firstName"
                  rules={[
                    { required: true, message: 'First name is required' },
                  ]}
                >
                  <Input placeholder="First Name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Surname"
                  name="surname"
                  rules={[{ required: true, message: 'Surname is required' }]}
                >
                  <Input placeholder="Surname" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Birthdate"
                  name="birthdate"
                  rules={[{ required: true, message: 'Birthdate is required' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="MM/DD/YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Email Address"
                  name="email"
                  rules={[
                    {
                      required: true,
                      message: 'Valid email is required',
                      type: 'email',
                    },
                  ]}
                >
                  <Input placeholder="you@example.com" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Role"
                  name="role"
                  rules={[{ required: true, message: 'Role is required' }]}
                >
                  <Select placeholder="Select role">
                    <Option value="Student">Student</Option>
                    <Option value="Staff">Staff</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Staff Type"
                  name="staffType"
                  rules={
                    selectedRole === 'Staff'
                      ? [{ required: true, message: 'Staff type is required' }]
                      : []
                  }
                >
                  <Select
                    placeholder="Staff type"
                    disabled={selectedRole !== 'Staff'}
                  >
                    <Option value="Registrar">Registrar</Option>
                    <Option value="Faculty">Faculty</Option>
                    <Option value="Admin">Admin</Option>
                    <Option value="Security">Security</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  label="Temporary Password"
                  name="password"
                  rules={[
                    {
                      required: true,
                      min: 6,
                      message: 'At least 6 characters',
                    },
                  ]}
                >
                  <Input.Password placeholder="Temporary password" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Custom QR String"
                  name="customQR"
                  extra="Format: TUPM/TUPS/TUPV-YY-XXXX"
                  rules={[
                    { required: true, message: 'Custom QR is required' },
                    {
                      validator: async (_, value) => {
                        if (!value || QR_PATTERN.test(String(value).trim())) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(
                            'Invalid QR format. Use TUPM/TUPS/TUPV-YY-XXXX.',
                          ),
                        );
                      },
                    },
                  ]}
                >
                  <Input placeholder="TUP-24-1023" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0 16px' }} />

            <Button type="primary" htmlType="submit" loading={registering}>
              Register New Student/Staff
            </Button>
          </Form>
        </Card>
      ) : (
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
                Users
              </Title>
              <Space size={isMobile ? 8 : 'middle'}>
                {canRegister && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setShowRegisterForm(true)}
                    size={isMobile ? 'small' : 'middle'}
                  >
                    {isMobile
                      ? null
                      : isTablet
                        ? 'Register User'
                        : 'Register New User'}
                  </Button>
                )}
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchUsers}
                  size={isMobile ? 'small' : 'middle'}
                >
                  {isMobile ? null : 'Refresh'}
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
              prefix={<UserOutlined />}
              allowClear
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}
              onChange={e => setFilters({ ...filters, name: e.target.value })}
              value={filters.name}
              size={isMobile ? 'middle' : 'middle'}
            />

            <Select
              placeholder="Role"
              allowClear
              style={{
                width: isMobile ? 'calc(50% - 4px)' : isTablet ? 160 : 120,
              }}
              onChange={value => setFilters({ ...filters, role: value })}
              value={filters.role}
              size={isMobile ? 'middle' : 'middle'}
            >
              <Option value="Staff">Staff</Option>
              <Option value="Student">Student</Option>
              <Option value="Visitor">Visitor</Option>
              <Option value="TUP">TUP</Option>
            </Select>

            <RangePicker
              style={{ width: isMobile ? '100%' : isTablet ? 260 : undefined }}
              onChange={dates => setFilters({ ...filters, dateRange: dates })}
              value={filters.dateRange}
              size={isMobile ? 'middle' : 'middle'}
            />
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: isMobile ? 800 : 960 }}
            onRow={record => ({
              onClick: event => {
                const target = event.target as HTMLElement;

                // prevent triggering when clicking buttons, links, etc.
                if (target.closest('button') || target.closest('a')) {
                  return;
                }

                setSelectedUser(record);
              },
              style: { cursor: 'pointer' },
            })}
          />

          <Modal
            open={!!selectedUser}
            onCancel={() => setSelectedUser(null)}
            footer={null}
            centered
            width={isMobile ? '96%' : isTablet ? 620 : 540}
            styles={{
              content: {
                padding: 0,
                overflow: 'hidden',
                borderRadius: 16,
              },
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
                }}
              >
                ✕
              </span>
            }
          >
            {selectedUser && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: isMobile
                    ? 'calc(95vh - 100px)'
                    : 'calc(100vh - 200px)',
                  overflowY: 'auto',
                }}
              >
                {/* HEADER SECTION */}
                <div
                  style={{
                    padding: isMobile ? '16px 16px 12px' : '24px 24px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 12 : 20,
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar
                      size={isMobile ? 60 : 80}
                      src={selectedUser.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        background: '#f5f5f5',
                        border: '2px solid #fff',
                        outline: '1.5px solid #e8e8e8',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background:
                          selectedUser.status === 'In TUP'
                            ? '#22c55e'
                            : '#d1d5db',
                        border: '2px solid #fff',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Text
                        strong
                        style={{
                          fontSize: isMobile ? 16 : 20,
                          color: '#141414',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        {selectedUser.firstName} {selectedUser.surname}
                      </Text>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 8px',
                          borderRadius: 20,
                          background: '#e6f7ff',
                          color: '#1890ff',
                          border: '1px solid #91d5ff',
                          textTransform: 'uppercase',
                        }}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      ID:{' '}
                      <Text strong style={{ color: '#595959' }}>
                        {selectedUser.qrString || 'No QR Assigned'}
                      </Text>
                    </Text>
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div
                  style={{
                    padding: isMobile ? '16px' : '24px',
                    background: '#fcfcfc',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    {[
                      {
                        icon: <MailOutlined />,
                        label: 'Email Address',
                        value: selectedUser.email,
                      },
                      {
                        icon: <CalendarOutlined />,
                        label: 'Birthdate',
                        value: dayjs(selectedUser.birthdate).format(
                          'MMMM DD, YYYY',
                        ),
                      },
                      {
                        icon: <IdcardOutlined />,
                        label: 'Staff Type',
                        value: selectedUser.staffType || 'N/A',
                      },
                      {
                        icon: <InfoCircleOutlined />,
                        label: 'Account Status',
                        value: selectedUser.status,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fff',
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        <Space size={6} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {item.icon}
                          </span>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.2px',
                            }}
                          >
                            {item.label}
                          </Text>
                        </Space>
                        <Text
                          strong
                          style={{
                            display: 'block',
                            fontSize: 13,
                            color: '#262626',
                          }}
                        >
                          {item.value}
                        </Text>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      background: '#f0f2f5',
                      padding: '12px 16px',
                      borderRadius: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Member Since
                    </Text>
                    <Text strong style={{ fontSize: 12 }}>
                      {dayjs(selectedUser.createdAt).format('MMM DD, YYYY')}
                    </Text>
                  </div>

                  <Button
                    type="primary"
                    block
                    onClick={() => setSelectedUser(null)}
                    style={{
                      marginTop: 24,
                      height: 40,
                      borderRadius: 8,
                      background: '#141414',
                      border: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Close Profile
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </Card>
      )}
    </Space>
  );
};

export default ManageUsers;
