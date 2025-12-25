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
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useMemo } from "react";
import { getLogs } from "../services/logService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs"; // Recommended for antd DatePicker

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const Logs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Single state to manage all filters simultaneously
  const [filters, setFilters] = useState({
    name: "",
    role: undefined,
    dateRange: null as any,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Performance-optimized filtering
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
      render: (role: string) => (
        <Tag
          color={
            role === "Staff" ? "blue" : role === "Student" ? "cyan" : "purple"
          }
        >
          {role}
        </Tag>
      ),
      sorter: (a, b) => a.userId.role.localeCompare(b.userId.role),
    },
    {
      title: "Date",
      dataIndex: "date",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: "descend",
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
      sorter: (a, b) => {
        const t1 = a.timeIn ? dayjs(a.timeIn).unix() : 0;
        const t2 = b.timeIn ? dayjs(b.timeIn).unix() : 0;
        return t1 - t2;
      },
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
      sorter: (a, b) => {
        const t1 = a.timeOut ? dayjs(a.timeOut).unix() : 0;
        const t2 = b.timeOut ? dayjs(b.timeOut).unix() : 0;
        return t1 - t2;
      },
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
        return (
          <Tag color={config[status] || "default"}>{status?.toUpperCase()}</Tag>
        );
      },
      sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
    },
  ];

  return (
    <Card
      style={{
        height: "100%",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
      title={
        <Space>
          <FilterOutlined style={{ color: "#1677ff" }} />
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
      {/* Search & Filter Bar */}
      <div
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

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        bordered
        // Adds a custom CSS class if a row is 'Late'
        rowClassName={(record) => (record.status === "Late" ? "late-row" : "")}
      />
    </Card>
  );
};

export default Logs;
