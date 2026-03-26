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
        closeIcon={<span style={{ color:"#fff", fontSize:18, fontWeight:600 }}>✕</span>}
      >
        {selectedLog && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
 
            {/* HERO */}
            <div style={{
              display:"flex", alignItems:"center", gap:16, padding:16, borderRadius:16,
              background:"linear-gradient(135deg, #ff4d4f, #ff7875)", color:"#fff",
              position:"relative", overflow:"hidden",
            }}>
              <Avatar size={72} src={selectedLog.user.photoURL} icon={<UserOutlined />}
                style={{ border:"3px solid #fff", boxShadow:"0 4px 12px rgba(0,0,0,0.25)" }} />
              <div style={{ flex:1 }}>
                <Title level={4} style={{ margin:0, color:"#fff" }}>
                  {selectedLog.user.firstName} {selectedLog.user.surname}
                </Title>
                <Space size="small">
                  <Tag color="white" style={{ color:"#ff4d4f" }}>
                    {selectedLog.user.role}
                  </Tag>
                  <Text style={{ color:"rgba(255,255,255,0.85)" }}>
                    Date Entered: {dayjs(selectedLog.date).format("MMM DD, YYYY")}
                  </Text>
                </Space>
              </div>
            </div>
 
            {/* SUMMARY BOX */}
            <Card size="small" variant="borderless"
              style={{ borderRadius:16, background:"#fff", boxShadow:"0 6px 16px rgba(0,0,0,0.08)" }}>
              <Space style={{ width:"100%", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <Text type="secondary">First Time In</Text>
                  <Title level={5} style={{ margin:0 }}>
                    {getTimeIn(selectedLog) ? dayjs(getTimeIn(selectedLog)!).format("hh:mm A") : "—"}
                  </Title>
                </div>
                <div>
                  <Text type="secondary">Last Time Out</Text>
                  <Title level={5} style={{ margin:0 }}>
                    {getTimeOut(selectedLog) ? dayjs(getTimeOut(selectedLog)!).format("hh:mm A") : "—"}
                  </Title>
                </div>
                <div>
                  <Text type="secondary">Status</Text>
                  <Tag
                    color={selectedLog.dailyStatus === "In TUP" ? "green" : "volcano"}
                    style={{ fontSize:14, padding:"4px 12px", display:"block", marginTop:4 }}
                  >
                    {selectedLog.dailyStatus}
                  </Tag>
                </div>
              </Space>
            </Card>
 
            {/* ACTIVITY DETAILS */}
            <div>
              <Title level={5} style={{ marginBottom:8 }}>Activity Details</Title>
              {selectedLog.activities.length ? (
                <Space direction="vertical" style={{ width:"100%" }}>
                  {selectedLog.activities.map((act, i) => (
                    <Card key={i} size="small" variant="borderless"
                      style={{ borderRadius:14, background:"#fafafa",
                        borderLeft:`5px solid ${act.status === "In TUP" ? "#52c41a" : "#f5222d"}` }}>
                      <Space direction="vertical" size={4} style={{ width:"100%" }}>
                        <Space style={{ justifyContent:"space-between", width:"100%" }}>
                          <Space size={6}>
                            {act.status === "In TUP"
                              ? <CheckCircleOutlined style={{ color:"#52c41a" }} />
                              : <CloseCircleOutlined style={{ color:"#f5222d" }} />}
                            <Text strong>
                              {reasonLabel[act.reason] ?? act.reason.toUpperCase()}
                            </Text>
                          </Space>
                          <Tag color={act.status === "In TUP" ? "green" : "volcano"}>
                            {act.status}
                          </Tag>
                        </Space>
                        <Space size="large">
                          <Text type="secondary">
                            In: {act.timeIn ? dayjs(act.timeIn).format("hh:mm A") : "—"}
                          </Text>
                          <Text type="secondary">
                            Out: {act.timeOut ? dayjs(act.timeOut).format("hh:mm A") : "—"}
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No activity details recorded</Text>
              )}
            </div>
 
            {/* Staff Attendance block */}
            {selectedLog.attendance && (
              <>
                <Divider style={{ margin:"0 0 4px" }} />
                <div>
                  <Title level={5} style={{ marginBottom:8 }}>
                    <EnvironmentOutlined style={{ marginRight:6, color:"#ff4d4f" }} />
                    Attendance Record
                  </Title>
                  <Card size="small" variant="borderless"
                    style={{ borderRadius:14, background:"#fafafa", borderLeft:"5px solid #ff4d4f" }}>
                    <Space size="large">
                      <Text type="secondary">
                        In:{" "}
                        <Text strong>
                          {selectedLog.attendance.timeIn
                            ? dayjs(selectedLog.attendance.timeIn).format("hh:mm A") : "—"}
                        </Text>
                      </Text>
                      <Text type="secondary">
                        Out:{" "}
                        <Text strong>
                          {selectedLog.attendance.timeOut
                            ? dayjs(selectedLog.attendance.timeOut).format("hh:mm A") : "—"}
                        </Text>
                      </Text>
                    </Space>
                  </Card>
                </div>
              </>
            )}
 
            {/* CLOSE */}
            <div style={{ textAlign:"center", marginTop:4 }}>
              <button
                onClick={() => setModalVisible(false)}
                style={{
                  background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
                  border: "none", borderRadius: 14, height: 46, width: 160,
                  fontWeight: 600, fontSize: 14, color: "#fff", cursor: "pointer",
                  boxShadow: "0 8px 16px rgba(255,77,79,0.45)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserAttendance;