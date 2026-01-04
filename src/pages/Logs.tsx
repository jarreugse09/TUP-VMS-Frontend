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
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useMemo } from "react";
import { getLogs } from "../services/logService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    role: undefined as string | undefined,
    dateRange: null as any,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false); // mobile filter drawer

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data); // Include all roles
    } catch (error) {
      console.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredData = useMemo(() => {
    return logs.filter((log) => {
      const fullName =
        `${log.userId.firstName} ${log.userId.surname}`.toLowerCase();
      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.userId.role === filters.role;

      let matchesDate = true;
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        const start = filters.dateRange[0].startOf("day");
        const end = filters.dateRange[1].endOf("day");
        const logDate = dayjs(log.date);
        matchesDate = logDate.isAfter(start) && logDate.isBefore(end);
      }

      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  const handleViewMore = (record: any) => {
    setSelectedUser(record);
    setModalVisible(true);
  };

  const columns: ColumnsType<any> = [
    {
      title: "Name",
      key: "name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.userId.firstName} {record.userId.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            ID: {record.userId._id?.slice(-6)}
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.userId.firstName.localeCompare(b.userId.firstName),
    },
    {
      title: "Role",
      dataIndex: ["userId", "role"],
      render: (role: string) => {
        const color = role === "Staff" ? "blue" : role === "Student" ? "cyan" : "purple";
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: "descend",
      key: "date",
    },
    {
      title: "Time-In",
      dataIndex: "timeIn",
      render: (time: string) =>
        time ? (
          <Space>
            <ClockCircleOutlined style={{ color: "#52c41a" }} />
            {dayjs(time).format("hh:mm A")}
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Time-Out",
      dataIndex: "timeOut",
      render: (time: string) =>
        time ? (
          <Space>
            <ClockCircleOutlined style={{ color: "#f5222d" }} />
            {dayjs(time).format("hh:mm A")}
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const config: Record<string, string> = {
          Present: "green",
          Late: "orange",
          Absent: "volcano",
        };
        return <Tag color={config[status] || "default"}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<EllipsisOutlined style={{ fontSize: 24, color: "#fff" }} />}
            onClick={() => handleViewMore(record)}
            style={{
              minWidth: 50,
              minHeight: 50,
              background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 24px rgba(255,77,79,0.45)",
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        style={{
          height: "100%",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
        title={
          <Space>
            <FilterOutlined
              style={{ color: "#1677ff", cursor: "pointer" }}
              onClick={() => setDrawerVisible(true)}
            />
            <Title level={4} style={{ margin: 0 }}>
              Attendance Logs
            </Title>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
            Refresh
          </Button>
        }
      >
        {/* Desktop Filter Bar */}
        <div
          className="desktop-filters"
          style={{
            marginBottom: 20,
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Input
            placeholder="Search name..."
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            style={{ width: 250 }}
            allowClear
          />

          <Select
            placeholder="Filter by Role"
            allowClear
            onChange={(value) => setFilters({ ...filters, role: value })}
            style={{ width: 160 }}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>

          <RangePicker
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            style={{ flexGrow: 1, maxWidth: 400 }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            bordered
            rowClassName={(record) => (record.status === "Late" ? "late-row" : "")}
          />
        </div>
      </Card>

      {/* Drawer for mobile filters */}
      <Drawer
        title="Filters"
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        <Input
          placeholder="Search name..."
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          style={{ marginBottom: 16 }}
          allowClear
        />
        <Select
          placeholder="Filter by Role"
          allowClear
          onChange={(value) => setFilters({ ...filters, role: value })}
          style={{ width: "100%", marginBottom: 16 }}
        >
          <Option value="Staff">Staff</Option>
          <Option value="Student">Student</Option>
          <Option value="Visitor">Visitor</Option>
        </Select>
        <RangePicker
          onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          style={{ width: "100%" }}
        />
      </Drawer>

      {/* Modal for detailed user info */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        title={
          selectedUser ? (
            <span style={{ color: "#ff4d4f" }}>
              {selectedUser.userId.firstName} {selectedUser.userId.surname}
            </span>
          ) : (
            "User Details"
          )
        }
        width={520}
        bodyStyle={{
          background: "#fff4f4",
          borderRadius: "16px",
          padding: "24px",
        }}
        style={{ borderRadius: "16px" }}
        centered
      >
        {selectedUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Avatar
                size={100}
                src={selectedUser.userId.photoURL}
                icon={<UserOutlined />}
                style={{
                  border: "4px solid #ff4d4f",
                  boxShadow: "0 4px 12px rgba(255,77,79,0.3)",
                }}
              />
            </div>

            <Descriptions
              column={1}
              bordered
              size="middle"
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
              labelStyle={{ fontWeight: 600, color: "#8c8c8c" }}
              contentStyle={{ fontWeight: 500, color: "#333" }}
            >
              <Descriptions.Item label="Full Name">
                {selectedUser.userId.firstName} {selectedUser.userId.surname}
              </Descriptions.Item>

              <Descriptions.Item label="Role">
                <Tag color={
                  selectedUser.userId.role === "Staff"
                    ? "blue"
                    : selectedUser.userId.role === "Student"
                    ? "cyan"
                    : "purple"
                }>
                  {selectedUser.userId.role}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Birthdate">
                {dayjs(selectedUser.userId.birthdate).format("MMM DD, YYYY")}
              </Descriptions.Item>

              <Descriptions.Item label="Activity">
                {selectedUser.activity || "No recorded activity"}
              </Descriptions.Item>

              <Descriptions.Item label="Time-In">
                {selectedUser.timeIn
                  ? dayjs(selectedUser.timeIn).format("hh:mm A")
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Time-Out">
                {selectedUser.timeOut
                  ? dayjs(selectedUser.timeOut).format("hh:mm A")
                  : "-"}
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}
            >
              <Button
                type="primary"
                onClick={() => setModalVisible(false)}
                style={{
                  background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
                  border: "none",
                  borderRadius: "12px",
                  height: "48px",
                  width: "140px",
                  fontWeight: 600,
                  boxShadow: "0 8px 16px rgba(255,77,79,0.4)",
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
