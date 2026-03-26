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
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useMemo, useRef } from "react";
import { getLogs, getStaffLogs, getMyTransactions } from "../../services/logService";
import { useAuth } from "../../contexts/AuthContext";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

/* ================= TYPES ================= */

interface Activity {
  reason: string;
  timeIn?: string;
  timeOut?: string;
  status: string;
  wentTo?: { firstName: string; surname: string; role: string } | null;
  scannedTarget?: { firstName: string; surname: string; role: string } | null;
}

interface Attendance {
  timeIn?: string;
  timeOut?: string;
  status: "In TUP" | "Checked Out";
}

interface LogItem {
  _id: string;
  date: string;
  userId: {
    _id: string;
    qrString?: string;
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
    birthdate: string;
  };
  dailyStatus: string;
  attendance?: Attendance | null;
  activities: Activity[];
}

// Shape returned by GET /me/transactions
interface TransactionLog {
  _id: string;
  date: string;
  timeIn?: string | null;
  timeOut?: string | null;
  status: string;
  reason: string;
  direction: "outgoing" | "incoming"; // outgoing = I scanned, incoming = scanned me
  otherParty?: {
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
  } | null;
  scannedQrString?: string | null;
  scannedAt?: string;
}

const normalizeUserLog = (entry: any): LogItem => ({
  ...entry,
  userId: entry.userId || entry.user,
});

/* ================= HELPERS ================= */

const getTimeIn = (log: LogItem) => {
  if (log.attendance?.timeIn) return log.attendance.timeIn;
  const times = log.activities?.map((a) => a.timeIn).filter(Boolean) as string[];
  return times.length ? times.sort()[0] : null;
};

const getTimeOut = (log: LogItem) => {
  if (log.attendance?.timeOut) return log.attendance.timeOut;
  const times = log.activities?.map((a) => a.timeOut).filter(Boolean) as string[];
  return times.length ? times.sort().slice(-1)[0] : null;
};

/* ================= COMPONENT ================= */

const Logs = () => {
  const { user } = useAuth();
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    role: undefined as string | undefined,
    dateRange: null as any,
    direction: undefined as string | undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const isNormalUser = user?.role === "Student" || user?.role === "Visitor";

  const fetchLogs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      if (user?.role === "TUP") {
        const data = await getLogs();
        setLogs((data || []).map(normalizeUserLog));
      } else if (user?.role === "Staff") {
        const data = await getStaffLogs();
        setLogs((data || []).map(normalizeUserLog));
      } else {
        // Student / Visitor — show bidirectional transactions
        const data = await getMyTransactions();
        setTransactions(data || []);
      }
    } catch {
      setLogs([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchLogs();
    const intervalId    = window.setInterval(fetchLogs, pollingIntervalMs);
    const handleFocus   = () => fetchLogs();
    const handleVisible = () => { if (document.visibilityState === "visible") fetchLogs(); };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  /* ================= FILTER ================= */

  const filteredGroupedLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const fullName = `${log.userId.firstName} ${log.userId.surname}`.toLowerCase();
      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.userId.role === filters.role;
      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        const logDate = dayjs(log.date);
        matchesDate = logDate.isAfter(start.startOf("day")) && logDate.isBefore(end.endOf("day"));
      }
      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        matchesDate = dayjs(t.date).isAfter(start.startOf("day")) && dayjs(t.date).isBefore(end.endOf("day"));
      }
      const matchesDirection = !filters.direction || t.direction === filters.direction;
      return matchesDate && matchesDirection;
    });
  }, [transactions, filters]);

  /* ================= COLUMNS ================= */

  // Admin / Staff grouped log columns
  const groupedColumns: ColumnsType<LogItem> = [
    {
      title: "Name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.userId.firstName} {record.userId.surname}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.userId.qrString || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Role",
      render: (_, record) => {
        const colorMap: Record<string, string> = { Staff: "blue", Student: "cyan", Visitor: "purple" };
        return <Tag color={colorMap[record.userId.role] ?? "default"}>{record.userId.role}</Tag>;
      },
    },
    {
      title: "Date",
      render: (_, record) => dayjs(record.date).format("MMM DD, YYYY"),
      defaultSortOrder: "descend",
    },
    {
      title: "Time In",
      render: (_, record) => {
        const t = getTimeIn(record);
        return t ? <Space><ClockCircleOutlined style={{ color: "#52c41a" }} />{dayjs(t).format("hh:mm A")}</Space> : "-";
      },
    },
    {
      title: "Time Out",
      render: (_, record) => {
        const t = getTimeOut(record);
        return t ? <Space><ClockCircleOutlined style={{ color: "#f5222d" }} />{dayjs(t).format("hh:mm A")}</Space> : "-";
      },
    },
    {
      title: "Status",
      render: (_, record) => (
        <Tag color={record.dailyStatus === "In TUP" ? "green" : "volcano"}>{record.dailyStatus}</Tag>
      ),
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Button type="primary" shape="circle" icon={<EllipsisOutlined />}
          onClick={() => { setSelectedLog(record); setModalVisible(true); }} />
      ),
    },
  ];

  // Normal user bidirectional transaction columns
  const transactionColumns: ColumnsType<TransactionLog> = [
    {
      title: "Date & Time",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{dayjs(record.date).format("MMM DD, YYYY")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.scannedAt ? dayjs(record.scannedAt).format("hh:mm A") : "—"}
          </Text>
        </Space>
      ),
      defaultSortOrder: "descend",
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: "Direction",
      render: (_, record) => (
        record.direction === "outgoing" ? (
          <Tag icon={<ArrowRightOutlined />} color="blue">I Scanned</Tag>
        ) : (
          <Tag icon={<ArrowLeftOutlined />} color="orange">Scanned Me</Tag>
        )
      ),
      filters: [
        { text: "I Scanned", value: "outgoing" },
        { text: "Scanned Me", value: "incoming" },
      ],
      onFilter: (value, record) => record.direction === value,
    },
    {
      title: "Other Party",
      render: (_, record) => {
        if (!record.otherParty) return <Text type="secondary">—</Text>;
        return (
          <Space>
            <Avatar size={28} icon={<UserOutlined />} />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 13 }}>
                {record.otherParty.firstName} {record.otherParty.surname}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.otherParty.role}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "QR Code",
      render: (_, record) => (
        <Text code style={{ fontSize: 11 }}>{record.scannedQrString || "—"}</Text>
      ),
    },
    {
      title: "Status",
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
  ];

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        title={
          <Space>
            <FilterOutlined onClick={() => setDrawerVisible(true)} style={{ cursor: "pointer" }} />
            <Title level={4} style={{ margin: 0 }}>
              {isNormalUser ? "Transaction Logs" : "Attendance Logs"}
            </Title>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Refresh</Button>
        }
      >
        {/* Filters */}
        <Space wrap style={{ marginBottom: 16 }}>
          {!isNormalUser && (
            <>
              <Input
                placeholder="Search name"
                prefix={<SearchOutlined />}
                allowClear
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              />
              <Select
                placeholder="Role"
                allowClear
                style={{ width: 160 }}
                onChange={(value) => setFilters({ ...filters, role: value })}
              >
                <Option value="Staff">Staff</Option>
                <Option value="Student">Student</Option>
                <Option value="Visitor">Visitor</Option>
              </Select>
            </>
          )}
          {isNormalUser && (
            <Select
              placeholder="Direction"
              allowClear
              style={{ width: 160 }}
              onChange={(value) => setFilters({ ...filters, direction: value })}
            >
              <Option value="outgoing">I Scanned</Option>
              <Option value="incoming">Scanned Me</Option>
            </Select>
          )}
          <RangePicker onChange={(dates) => setFilters({ ...filters, dateRange: dates })} />
        </Space>

        {isNormalUser ? (
          <Table<TransactionLog>
            columns={transactionColumns}
            dataSource={filteredTransactions}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        ) : (
          <Table<LogItem>
            columns={groupedColumns}
            dataSource={filteredGroupedLogs}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        )}
      </Card>

      {/* FILTER DRAWER */}
      <Drawer title="Filters" open={drawerVisible} onClose={() => setDrawerVisible(false)}>
        {!isNormalUser && (
          <>
            <Input placeholder="Search name" allowClear
              onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Select placeholder="Role" allowClear style={{ width: "100%", marginTop: 16 }}
              onChange={(value) => setFilters({ ...filters, role: value })}>
              <Option value="Staff">Staff</Option>
              <Option value="Student">Student</Option>
              <Option value="Visitor">Visitor</Option>
            </Select>
          </>
        )}
        {isNormalUser && (
          <Select placeholder="Direction" allowClear style={{ width: "100%" }}
            onChange={(value) => setFilters({ ...filters, direction: value })}>
            <Option value="outgoing">I Scanned</Option>
            <Option value="incoming">Scanned Me</Option>
          </Select>
        )}
        <RangePicker style={{ width: "100%", marginTop: 16 }}
          onChange={(dates) => setFilters({ ...filters, dateRange: dates })} />
      </Drawer>

      {/* DETAILS MODAL — only for grouped logs (TUP/Staff) */}
      <Modal open={modalVisible} onCancel={() => setModalVisible(false)}
        footer={null} centered width={620}
        closeIcon={<span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>✕</span>}>
        {selectedLog && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16,
              borderRadius: 16, background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
              color: "#fff", position: "relative" }}>
              <Avatar size={72} src={selectedLog.userId.photoURL} icon={<UserOutlined />}
                style={{ border: "3px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }} />
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, color: "#fff" }}>
                  {selectedLog.userId.firstName} {selectedLog.userId.surname}
                </Title>
                <Space size="small">
                  <Tag color="white" style={{ color: "#ff4d4f" }}>{selectedLog.userId.role}</Tag>
                  <Text style={{ color: "rgba(255,255,255,0.85)" }}>
                    {dayjs(selectedLog.date).format("MMM DD, YYYY")}
                  </Text>
                </Space>
              </div>
            </div>

            <Card size="small" variant="borderless"
              style={{ borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.08)" }}>
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <div>
                  <Text type="secondary">First Time In</Text>
                  <Title level={5} style={{ margin: 0 }}>
                    {getTimeIn(selectedLog) ? dayjs(getTimeIn(selectedLog)!).format("hh:mm A") : "-"}
                  </Title>
                </div>
                <div>
                  <Text type="secondary">Last Time Out</Text>
                  <Title level={5} style={{ margin: 0 }}>
                    {getTimeOut(selectedLog) ? dayjs(getTimeOut(selectedLog)!).format("hh:mm A") : "-"}
                  </Title>
                </div>
                <div>
                  <Text type="secondary">Status</Text>
                  <Tag color={selectedLog.dailyStatus === "In TUP" ? "green" : "volcano"}
                    style={{ fontSize: 14, padding: "4px 12px" }}>
                    {selectedLog.dailyStatus}
                  </Tag>
                </div>
              </Space>
            </Card>

            <div>
              <Title level={5} style={{ marginBottom: 8 }}>Activity Details</Title>
              {selectedLog.activities.length ? (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {selectedLog.activities.map((act, i) => (
                    <Card key={i} size="small" variant="borderless"
                      style={{ borderRadius: 14, background: "#fafafa",
                        borderLeft: `5px solid ${act.status === "In TUP" ? "#52c41a" : "#f5222d"}` }}>
                      <Space direction="vertical" size={4} style={{ width: "100%" }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }}>
                          <Text strong>
                            {act.reason === "transaction" && (act.wentTo || act.scannedTarget)
                              ? `Went to: ${(act.wentTo || act.scannedTarget)!.firstName} ${(act.wentTo || act.scannedTarget)!.surname}`
                              : act.reason.toUpperCase()}
                          </Text>
                          <Tag color={act.status === "In TUP" ? "green" : "volcano"}>{act.status}</Tag>
                        </Space>
                        <Space size="large">
                          <Text type="secondary">In: {act.timeIn ? dayjs(act.timeIn).format("hh:mm A") : "-"}</Text>
                          <Text type="secondary">Out: {act.timeOut ? dayjs(act.timeOut).format("hh:mm A") : "-"}</Text>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No activities recorded</Text>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: 8 }}>
              <Button type="primary" onClick={() => setModalVisible(false)}
                style={{ background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
                  border: "none", borderRadius: 14, height: 46, width: 160,
                  fontWeight: 600, boxShadow: "0 8px 16px rgba(255,77,79,0.45)" }}>
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