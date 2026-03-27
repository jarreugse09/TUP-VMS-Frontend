import {
  Card,
  Tag,
  Space,
  Typography,
  Avatar,
  Spin,
  Empty,
  Divider,
  Modal,
  Badge,
} from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyAttendance as fetchMyAttendance } from "../services/logService";
import dayjs from "dayjs";

const { Title, Text } = Typography;

/* ================= TYPES ================= */

interface Activity {
  reason:     string;
  wentTo?:    { firstName: string; surname: string; role: string } | null;
  timeIn?:    string | null;
  timeOut?:   string | null;
  status:     string;
  scannedAt?: string;
}

interface Attendance {
  timeIn?:  string | null;
  timeOut?: string | null;
  status:   "In TUP" | "Checked Out";
}

interface LogItem {
  _id:         string;
  date:        string;
  user: {
    _id:       string;
    qrString?: string;
    firstName: string;
    surname:   string;
    role:      string;
    photoURL?: string;
  };
  dailyStatus: string;
  attendance?: Attendance | null;
  activities:  Activity[];
}

/* ================= HELPERS ================= */

const getTimeIn = (log: LogItem): string | null => {
  if (log.attendance?.timeIn) return log.attendance.timeIn;
  const times = log.activities.map((a) => a.timeIn).filter(Boolean) as string[];
  return times.length ? times.sort()[0] : null;
};

const getTimeOut = (log: LogItem): string | null => {
  if (log.attendance?.timeOut) return log.attendance.timeOut;
  const times = log.activities.map((a) => a.timeOut).filter(Boolean) as string[];
  return times.length ? times.sort().slice(-1)[0] : null;
};

const isToday = (dateStr: string) =>
  dayjs(dateStr).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");

const reasonLabel: Record<string, string> = {
  attendance: "Attendance",
  checkin:    "Check In",
  checkout:   "Check Out",
  break:      "Break",
  "go out":   "Went Out",
};

/* ================= COMPONENT ================= */

const UserAttendance = () => {
  const { user } = useAuth();
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs,         setLogs]         = useState<LogItem[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLog,  setSelectedLog]  = useState<LogItem | null>(null);

  const fetchLogs = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const data = await fetchMyAttendance();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch attendance logs", err);
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

  const todayLog    = logs.find((l) => isToday(l.date)) ?? null;
  const isInTUP     = todayLog?.dailyStatus === "In TUP";
  const historyLogs = logs
    .filter((l) => !isToday(l.date))
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

  /* ================= RENDER ================= */

  return (
    <>
      <Card
        style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        title={<Title level={4} style={{ margin: 0 }}>My Attendance</Title>}
      >

        {/* ── PROFILE HERO — same gradient as Logs.tsx modal hero ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: 20,
          borderRadius: 16, marginBottom: 24, position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #ff4d4f, #ff7875)", color: "#fff",
        }}>
          <div style={{ position:"absolute", right:-40, top:-40, width:160, height:160,
            borderRadius:"50%", background:"rgba(255,255,255,0.08)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", right:60, bottom:-50, width:120, height:120,
            borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />

          <Avatar size={72} src={user?.photoURL} icon={<UserOutlined />}
            style={{ border:"3px solid #fff", boxShadow:"0 4px 12px rgba(0,0,0,0.25)", flexShrink:0 }} />

          <div style={{ flex:1, zIndex:1 }}>
            <Title level={4} style={{ margin:0, color:"#fff" }}>
              {user?.firstName} {user?.surname}
            </Title>
            <Space size={8} style={{ marginTop:4 }}>
              <Tag color="white" style={{ color:"#ff4d4f", fontWeight:600 }}>
                {user?.role}
              </Tag>
              {todayLog?.user?.qrString && (
                <Text style={{ color:"rgba(255,255,255,0.85)", fontSize:12 }}>
                  {todayLog.user.qrString}
                </Text>
              )}
            </Space>
          </div>

          <div style={{ zIndex:1, background:"rgba(255,255,255,0.18)", borderRadius:12,
            padding:"10px 18px", textAlign:"center", minWidth:120 }}>
            <Badge
              status={isInTUP ? "success" : "default"}
              text={
                <Text style={{ color:"#fff", fontWeight:700, fontSize:13 }}>
                  {todayLog ? (isInTUP ? "In TUP" : "Checked Out") : "Not yet in"}
                </Text>
              }
            />
            <div style={{ color:"rgba(255,255,255,0.75)", fontSize:11, marginTop:2 }}>
              Today's Status
            </div>
          </div>
        </div>

        {/* ── TODAY SUMMARY — same card style as Logs.tsx modal summary ── */}
        {todayLog && (
          <Card
            size="small"
            variant="borderless"
            style={{ borderRadius:16, background:"#fff",
              boxShadow:"0 6px 16px rgba(0,0,0,0.08)", marginBottom:24 }}
          >
            <Space style={{ width:"100%", justifyContent:"space-between",
              alignItems:"center", flexWrap:"wrap" as any }}>
              <div>
                <Text type="secondary">First Time In</Text>
                <Title level={5} style={{ margin:0 }}>
                  {getTimeIn(todayLog) ? dayjs(getTimeIn(todayLog)!).format("hh:mm A") : "—"}
                </Title>
              </div>
              <div>
                <Text type="secondary">Last Time Out</Text>
                <Title level={5} style={{ margin:0 }}>
                  {getTimeOut(todayLog) ? dayjs(getTimeOut(todayLog)!).format("hh:mm A") : "—"}
                </Title>
              </div>
              <div>
                <Text type="secondary">Status</Text>
                <Tag
                  color={todayLog.dailyStatus === "In TUP" ? "green" : "volcano"}
                  style={{ fontSize:14, padding:"4px 12px", display:"block", marginTop:4 }}
                >
                  {todayLog.dailyStatus}
                </Tag>
              </div>
            </Space>
          </Card>
        )}

        {/* ── HISTORY LIST ── */}
        <Title level={5} style={{ marginBottom:12, color:"#595959" }}>
          Attendance History
        </Title>

        {loading && logs.length === 0 ? (
          <div style={{ textAlign:"center", padding:48 }}><Spin size="large" /></div>
        ) : logs.length === 0 ? (
          <Empty description="No attendance records yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" style={{ width:"100%" }} size={8}>
            {[...(todayLog ? [todayLog] : []), ...historyLogs].map((log) => {
              const timeIn  = getTimeIn(log);
              const timeOut = getTimeOut(log);
              const today   = isToday(log.date);

              return (
                <div
                  key={log._id}
                  onClick={() => { setSelectedLog(log); setModalVisible(true); }}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", flexWrap: "wrap" as any,
                    gap: 12, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                    background: today ? "#fff5f5" : "#fafafa",
                    border: `1px solid ${today ? "#ffccc7" : "#f0f0f0"}`,
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  {/* Date */}
                  <div style={{ minWidth:120 }}>
                    <Text strong style={{ fontSize:13 }}>
                      {today ? "Today" : dayjs(log.date).format("MMM DD, YYYY")}
                    </Text>
                    {today && (
                      <div>
                        <Text type="secondary" style={{ fontSize:11 }}>
                          {dayjs(log.date).format("MMM DD, YYYY")}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Time in / out */}
                  <Space size={20}>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color:"#52c41a", fontSize:12 }} />
                      <Text style={{ fontSize:12 }}>
                        {timeIn ? dayjs(timeIn).format("hh:mm A") : "—"}
                      </Text>
                    </Space>
                    <Space size={4}>
                      <LogoutOutlined style={{ color:"#f5222d", fontSize:12 }} />
                      <Text style={{ fontSize:12 }}>
                        {timeOut ? dayjs(timeOut).format("hh:mm A") : "—"}
                      </Text>
                    </Space>
                  </Space>

                  {/* Status */}
                  <Tag color={log.dailyStatus === "In TUP" ? "green" : "volcano"}
                    style={{ marginRight:0 }}>
                    {log.dailyStatus}
                  </Tag>
                </div>
              );
            })}
          </Space>
        )}
      </Card>

      {/* ── DETAILS MODAL — mirrors Logs.tsx modal exactly ── */}
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

          return (
            <div>
              {/* ── HEADER ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "24px 24px 20px",
                borderBottom: "1px solid #f0f0f0",
              }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar
                    size={52}
                    src={selectedLog.user.photoURL}
                    icon={<UserOutlined />}
                    style={{
                      background: "#f0f0f0",
                      border: "2px solid #fff",
                      outline: "1.5px solid #e8e8e8",
                    }}
                  />
                  <span style={{
                    position: "absolute", bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: "50%",
                    background: isIn ? "#22c55e" : "#d1d5db",
                    border: "2px solid #fff",
                  }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 15, color: "#141414", lineHeight: 1.3 }}>
                      {selectedLog.user.firstName} {selectedLog.user.surname}
                    </Text>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: "1px 7px",
                      borderRadius: 20, letterSpacing: "0.2px",
                      background: "#ffefef", color: "#ff4d4f",
                      border: "1px solid #ffccc7",
                    }}>
                      {selectedLog.user.role}
                    </span>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(selectedLog.date).format("dddd, MMMM D, YYYY")}
                  </Text>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 11px", borderRadius: 20, flexShrink: 0,
                  background: isIn ? "#f0fdf4" : "#fafafa",
                  border: `1px solid ${isIn ? "#bbf7d0" : "#e5e5e5"}`,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: isIn ? "#16a34a" : "#9ca3af",
                  }} />
                  <Text style={{
                    fontSize: 12, fontWeight: 500,
                    color: isIn ? "#15803d" : "#6b7280",
                  }}>
                    {selectedLog.dailyStatus}
                  </Text>
                </div>
              </div>

              {/* ── TIME ROW (Grid Layout) ── */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                background: "#fafafa",
                borderBottom: "1px solid #f0f0f0",
              }}>
                {[
                  { label: "Time in", value: timeIn, dot: "#22c55e" },
                  { label: "Time out", value: timeOut, dot: "#f97316", divided: true },
                ].map(({ label, value, dot, divided }) => (
                  <div key={label} style={{
                    padding: "16px 20px",
                    borderLeft: divided ? "1px solid #f0f0f0" : undefined,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
                      <Text type="secondary" style={{ fontSize: 11, letterSpacing: "0.4px", textTransform: "uppercase" }}>
                        {label}
                      </Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <Text style={{
                        fontSize: 22, fontWeight: 600,
                        color: value ? "#141414" : "#d1d5db",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.5px",
                      }}>
                        {value ? dayjs(value).format("h:mm") : "—"}
                      </Text>
                      {value && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(value).format("A")}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── ACTIVITIES (Timeline Style) ── */}
              <div style={{ padding: "20px 24px" }}>
                {selectedLog.activities.length > 0 ? (
                  <>
                    <Text type="secondary" style={{
                      fontSize: 11, letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      display: "block", marginBottom: 12,
                    }}>
                      Activity log · {selectedLog.activities.length} entries
                    </Text>

                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {selectedLog.activities.map((act, i) => {
                        const actIsIn = act.status === "In TUP";
                        const accentClr = actIsIn ? "#16a34a" : "#dc2626";
                        const bgClr = actIsIn ? "#f0fdf4" : "#fff7f7";
                        const bdClr = actIsIn ? "#bbf7d0" : "#fecaca";

                        const total = selectedLog.activities.length;
                        const radius = i === 0 && i === total - 1 ? "8px" 
                                     : i === 0 ? "8px 8px 0 0" 
                                     : i === total - 1 ? "0 0 8px 8px" : "0";

                        return (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "11px 14px",
                            background: "#fff",
                            border: "1px solid #f0f0f0",
                            borderLeft: `3px solid ${accentClr}`,
                            borderRadius: radius,
                            borderTop: i > 0 ? "none" : undefined,
                          }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                              background: bgClr, border: `1px solid ${bdClr}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <ClockCircleOutlined style={{ fontSize: 13, color: accentClr }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Text strong style={{ fontSize: 13, display: "block", color: "#141414" }}>
                                {reasonLabel[act.reason] ?? act.reason}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {act.timeIn ? dayjs(act.timeIn).format("h:mm A") : "—"} → {act.timeOut ? dayjs(act.timeOut).format("h:mm A") : "ongoing"}
                              </Text>
                            </div>

                            <span style={{
                              fontSize: 11, fontWeight: 500, padding: "2px 9px",
                              borderRadius: 20, background: bgClr, color: accentClr, border: `1px solid ${bdClr}`,
                            }}>
                              {act.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 0", border: "1px dashed #e5e5e5", borderRadius: 8 }}>
                    <Text type="secondary">No activities recorded</Text>
                  </div>
                )}
              </div>

              {/* ── FOOTER ── */}
              <div style={{
                display: "flex", justifyContent: "flex-end",
                padding: "14px 24px", borderTop: "1px solid #f0f0f0", background: "#fafafa",
              }}>
                <button
                  onClick={() => setModalVisible(false)}
                  style={{
                    background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
                    border: "none", borderRadius: 8, height: 36,
                    padding: "0 22px", fontWeight: 500, fontSize: 13,
                    color: "#fff", cursor: "pointer", boxShadow: "0 2px 6px rgba(255,77,79,0.3)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
};

export default UserAttendance;