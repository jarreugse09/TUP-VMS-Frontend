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
  message,
  Empty,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  EllipsisOutlined,
  UserOutlined,
  InfoCircleOutlined,
  LockOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useMemo, useRef } from "react";
import { getLogs } from "./../services/logService";
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
  status: "In TUP" | "Checked Out";
}

interface Attendance {
  timeIn?: string;
  timeOut?: string;
  status: "In TUP" | "Checked Out";
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
  dailyStatus: "In TUP" | "Checked Out";
  attendance?: Attendance | null;
  activities: Activity[];
}

/* ================= HELPERS ================= */

const getTimeIn = (log: LogItem) => {
  if (log.attendance?.timeIn) return log.attendance.timeIn;

  const times = log.activities
    ?.map((a) => a.timeIn)
    .filter(Boolean) as string[];

  return times.length ? times.sort()[0] : null;
};

const getTimeOut = (log: LogItem) => {
  if (log.attendance?.timeOut) return log.attendance.timeOut;

  const times = log.activities
    ?.map((a) => a.timeOut)
    .filter(Boolean) as string[];

  return times.length ? times.sort().slice(-1)[0] : null;
};

/* ================= COMPONENT ================= */

const Logs = () => {
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    role: undefined as string | undefined,
    dateRange: null as any,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"month" | "range">("month");
  const [exportMonth, setExportMonth] = useState<any>(null);
  const [exportRange, setExportRange] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [exportPassword, setExportPassword] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportRole, setExportRole] = useState<string | undefined>(undefined);

  const fetchLogs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleExport = async () => {
    if (!exportPassword) {
      message.error("Please enter your password to confirm");
      return;
    }

    let payload: any = {
      format: exportFormat,
      password: exportPassword,
      ...(exportRole ? { role: exportRole } : {}),
    };
    if (exportMode === "month") {
      if (!exportMonth) return message.error("Please select a month");
      payload.month = exportMonth.format("YYYY-MM");
    } else {
      if (!exportRange || exportRange.length !== 2)
        return message.error("Please select a date range");
      payload.startDate = exportRange[0].startOf("day").toISOString();
      payload.endDate = exportRange[1].endOf("day").toISOString();
    }

    setExporting(true);
    try {
      const res = await (
        await import("../services/attendanceService")
      ).exportAttendance(payload);
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = res.headers["content-disposition"];
      let filename = "attendance_export";
      if (disposition) {
        const match = disposition.match(/filename="?(.*)"?/);
        if (match && match[1]) filename = match[1];
      }
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("Export started");
      setExportModalOpen(false);
      setExportPassword("");
      setExportRole(undefined);
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        message.error("Incorrect password");
      } else {
        message.error("Export failed");
      }
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const intervalId = window.setInterval(fetchLogs, pollingIntervalMs);

    const handleFocus = () => fetchLogs();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLogs();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  /* ================= FILTER ================= */

  const filteredData = useMemo(() => {
    return logs.filter((log) => {
      const fullName =
        `${log.user.firstName} ${log.user.surname}`.toLowerCase();

      const matchesName = fullName.includes(filters.name.toLowerCase());
      const matchesRole = !filters.role || log.user.role === filters.role;

      let matchesDate = true;
      if (filters.dateRange?.length === 2) {
        const [start, end] = filters.dateRange;
        const logDate = dayjs(log.date);
        matchesDate =
          logDate.isAfter(start.startOf("day")) &&
          logDate.isBefore(end.endOf("day"));
      }

      return matchesName && matchesRole && matchesDate;
    });
  }, [logs, filters]);

  /* ================= TABLE ================= */

  const columns: ColumnsType<LogItem> = [
    {
      title: "Name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.user.firstName} {record.user.surname}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user.qrString || "-"}
          </Text>
        </Space>
      ),
      sorter: (a, b) => a.user.firstName.localeCompare(b.user.firstName),
    },
    {
      title: "Role",
      render: (_, record) => (
        <Tag color={record.user.role === "Staff" ? "blue" : "cyan"}>
          {record.user.role}
        </Tag>
      ),
    },
    {
      title: "Date",
      render: (_, record) => dayjs(record.date).format("MMM DD, YYYY"),
      defaultSortOrder: "descend",
    },
    {
      title: "Time In",
      render: (_, record) => {
        const timeIn = getTimeIn(record);
        return timeIn ? dayjs(timeIn).format("hh:mm A") : "-";
      },
    },
    {
      title: "Time Out",
      render: (_, record) => {
        const timeOut = getTimeOut(record);
        return timeOut ? dayjs(timeOut).format("hh:mm A") : "-";
      },
    },
    {
      title: "Status",
      render: (_, record) => {
        const colorMap: Record<string, string> = {
          "In TUP": "green",
          "Checked Out": "volcano",
        };
        return (
          <Tag color={colorMap[record.dailyStatus]}>{record.dailyStatus}</Tag>
        );
      },
    },
    {
      title: "Actions",
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
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
              Refresh
            </Button>
            <Button onClick={() => setExportModalOpen(true)}>Download</Button>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search name"
            prefix={<SearchOutlined />}
            allowClear
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, role: value })}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      {/* EXPORT MODAL */}
      <Modal
  title={<span style={{ fontWeight: 700, fontSize: 18 }}>Export Attendance</span>}
  open={exportModalOpen}
  onCancel={() => {
    setExportModalOpen(false);
    setExportPassword("");
    setExportRole(undefined);
  }}
  onOk={handleExport}
  okText="Export"
  confirmLoading={exporting}
  centered
  okButtonProps={{
    style: {
      background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
      border: "none",
      borderRadius: 8,
      height: 38,
      padding: "0 24px",
      fontWeight: 600,
      boxShadow: "0 4px 10px rgba(255,77,79,0.3)",
    },
  }}
  cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
>
  <div style={{ padding: "8px 0" }}>
    <div style={{ 
      background: "#fff7e6", 
      padding: "12px 16px", 
      borderRadius: 12, 
      border: "1px solid #ffd591",
      marginBottom: 20 
    }}>
      <Text style={{ color: "#874d00", fontSize: 13 }}>
        <InfoCircleOutlined style={{ marginRight: 8 }} />
        For security, please confirm your password to download attendance data.
      </Text>
    </div>

    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Date Selection Row */}
      <div style={{ display: "flex", gap: 12 }}>
        <Select
          value={exportMode}
          onChange={(v) => setExportMode(v as any)}
          style={{ width: 140 }}
          size="large"
        >
          <Option value="month">By Month</Option>
          <Option value="range">Date Range</Option>
        </Select>

        {exportMode === "month" ? (
          <DatePicker picker="month" size="large" style={{ flex: 1 }} onChange={(d) => setExportMonth(d)} />
        ) : (
          <RangePicker size="large" style={{ flex: 1 }} onChange={(d) => setExportRange(d)} />
        )}
      </div>

      {/* Role & Format Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Role Filter</Text>
          <Select
            placeholder="All Roles"
            allowClear
            size="large"
            value={exportRole}
            onChange={(value) => setExportRole(value)}
            style={{ width: "100%" }}
          >
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>File Format</Text>
          <Select
            value={exportFormat}
            size="large"
            onChange={(v) => setExportFormat(v as any)}
            style={{ width: "100%" }}
          >
            <Option value="csv">CSV</Option>
            <Option value="xlsx">Excel (.xlsx)</Option>
          </Select>
        </div>
      </div>

      {/* Password Field */}
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Confirm Identity</Text>
        <Input.Password
          prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
          placeholder="Enter your account password"
          size="large"
          value={exportPassword}
          onChange={(e) => setExportPassword(e.target.value)}
          style={{ borderRadius: 8 }}
        />
      </div>
    </Space>
  </div>
</Modal>

      {/* FILTER DRAWER */}
      <Drawer
  title={<Text strong style={{ fontSize: 18 }}>Filters</Text>}
  open={drawerVisible}
  onClose={() => setDrawerVisible(false)}
  width={340}
  extra={
    <Button type="link" onClick={() => setFilters({ name: "", role: undefined, dateRange: null })}>
      Reset
    </Button>
  }
>
  <Space direction="vertical" size={20} style={{ width: "100%" }}>
    <section>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, display: "block" }}>
        Search Identification
      </Text>
      <Input
        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
        placeholder="Search by name..."
        size="large"
        allowClear
        style={{ borderRadius: 8 }}
        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
      />
    </section>

    <section>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, display: "block" }}>
        Classification
      </Text>
      <Select
        placeholder="Select Role"
        allowClear
        size="large"
        style={{ width: "100%" }}
        onChange={(value) => setFilters({ ...filters, role: value })}
      >
        <Option value="Staff">Staff Members</Option>
        <Option value="Student">Student Body</Option>
        <Option value="Visitor">Campus Visitors</Option>
      </Select>
    </section>

    <section>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 8, display: "block" }}>
        Activity Period
      </Text>
      <RangePicker
        size="large"
        style={{ width: "100%" }}
        onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
      />
    </section>
  </Space>

  {/* Footer Action for Mobile/Small screens */}
  <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", padding: "16px 24px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
    <Button 
      type="primary" 
      block 
      size="large" 
      onClick={() => setDrawerVisible(false)}
      style={{ background: "#141414", borderRadius: 8, height: 45 }}
    >
      Apply Filters
    </Button>
  </div>
</Drawer>

      {/* DETAILS MODAL */}
 <Modal
  open={modalVisible}
  onCancel={() => setModalVisible(false)}
  footer={null}
  centered
  width={580}
  styles={{
    content: { padding: 0, overflow: "hidden", borderRadius: 16 },
    mask: { backdropFilter: "blur(2px)" },
  }}
  closeIcon={
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: "50%",
      background: "rgba(0,0,0,0.06)", color: "#595959",
      fontSize: 13, fontWeight: 500, lineHeight: 1,
    }}>✕</span>
  }
>
  {selectedLog && (() => {
    const timeIn = getTimeIn(selectedLog);
    const timeOut = getTimeOut(selectedLog);
    const isIn = selectedLog.dailyStatus === "In TUP";

    const ROLE_PILL: Record<string, { bg: string; color: string; border: string }> = {
      Staff:    { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
      Student:  { bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
      Visitor:  { bg: "#FAF5FF", color: "#6B21A8", border: "#E9D5FF" },
      TUP:      { bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
      Security: { bg: "#F0F9FF", color: "#075985", border: "#BAE6FD" },
    };
    const pill = ROLE_PILL[selectedLog.user.role] ?? { bg: "#F5F5F5", color: "#404040", border: "#E5E5E5" };

    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        
        {/* ── HEADER / HERO SECTION ── */}
        <div style={{
          padding: "24px 24px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          borderBottom: "1px solid #f0f0f0",
        }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              size={72}
              src={selectedLog.user.photoURL}
              icon={<UserOutlined />}
              style={{
                background: "#f0f0f0",
                border: "2px solid #fff",
                outline: "1.5px solid #e8e8e8",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            />
            <span style={{
              position: "absolute", bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: "50%",
              background: isIn ? "#22c55e" : "#d1d5db",
              border: "2px solid #fff",
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <Text strong style={{ fontSize: 18, color: "#141414", lineHeight: 1.2, letterSpacing: "-0.2px" }}>
                {selectedLog.user.firstName} {selectedLog.user.surname}
              </Text>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "1px 8px",
                borderRadius: 20, letterSpacing: "0.2px", textTransform: "uppercase",
                background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`,
              }}>
                {selectedLog.user.role}
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              <CalendarOutlined style={{ fontSize: 12 }} />
              {dayjs(selectedLog.date).format("dddd, MMMM D, YYYY")}
            </Text>
          </div>
        </div>

        <div style={{ padding: "24px", background: "#fcfcfc" }}>
          
          {/* ── SUMMARY STATS ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: "Time in", value: timeIn, dot: "#22c55e" },
              { label: "Time out", value: timeOut, dot: "#f97316" },
              { label: "Daily Status", value: selectedLog.dailyStatus, isStatus: true }
            ].map((item, idx) => (
              <div key={idx} style={{
                background: "#fff", padding: "14px", borderRadius: 12,
                border: "1px solid #f0f0f0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  {!item.isStatus && <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.dot }} />}
                  <Text type="secondary" style={{ fontSize: 10, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                    {item.label}
                  </Text>
                </div>
                {item.isStatus ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ 
                      width: 7, height: 7, borderRadius: "50%", 
                      background: isIn ? "#16a34a" : "#9ca3af" 
                    }} />
                    <Text strong style={{ fontSize: 14, color: isIn ? "#15803d" : "#6b7280" }}>
                      {item.value}
                    </Text>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                    <Text style={{ 
                      fontSize: 18, fontWeight: 600, color: item.value ? "#141414" : "#d1d5db",
                      fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px"
                    }}>
                      {item.value ? dayjs(item.value).format("h:mm") : "—"}
                    </Text>
                    {item.value && <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.value).format("A")}</Text>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── ACTIVITY LOG ── */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{
              fontSize: 11, letterSpacing: "0.5px", textTransform: "uppercase",
              display: "block", marginBottom: 12,
            }}>
              Activity Details · {selectedLog.activities.length} logs
            </Text>

            <div style={{ 
              maxHeight: "280px", overflowY: "auto", 
              display: "flex", flexDirection: "column", gap: 8 
            }}>
              {selectedLog.activities.length ? (
                selectedLog.activities.map((act, i) => {
                  const actIsIn = act.status === "In TUP";
                  const accentClr = actIsIn ? "#16a34a" : "#dc2626";
                  
                  return (
                    <div key={i} style={{
                      background: "#fff", borderRadius: 10, padding: "12px 14px",
                      border: "1px solid #f0f0f0",
                      borderLeft: `3px solid ${accentClr}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <Text strong style={{ fontSize: 13, display: "block", color: "#141414" }}>
                          {act.reason.charAt(0).toUpperCase() + act.reason.slice(1)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                          {act.timeIn ? dayjs(act.timeIn).format("h:mm A") : "—"} 
                          <span style={{ margin: "0 4px" }}>→</span>
                          {act.timeOut ? dayjs(act.timeOut).format("h:mm A") : "Ongoing"}
                        </Text>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 20, background: actIsIn ? "#f0fdf4" : "#fff7f7", 
                        color: accentClr, border: `1px solid ${actIsIn ? "#bbf7d0" : "#fecaca"}`,
                      }}>
                        {act.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  textAlign: "center", padding: "32px 0",
                  border: "1px dashed #e5e5e5", borderRadius: 12, background: "#fff"
                }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>No activities recorded</Text>
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Button
              onClick={() => setModalVisible(false)}
              style={{
                background: "#141414", color: "#fff",
                border: "none", borderRadius: 8, height: 40, width: "100%",
                fontWeight: 500, fontSize: 14,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  })()}
</Modal>
    </>
  );
};

export default Logs;
