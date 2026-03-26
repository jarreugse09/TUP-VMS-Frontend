import {
  Card,
  Tag,
  Space,
  Typography,
  Avatar,
  Timeline,
  Spin,
  Empty,
  Badge,
  Divider,
} from "antd";
import {
  UserOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyAttendance as fetchMyAttendance } from "../services/logService";
import dayjs from "dayjs";

const { Title, Text } = Typography;


/* ================= TYPES (matching getMyLogs controller shape) ================= */

interface WentTo {
  firstName: string;
  surname:   string;
  role:      string;
}

interface Activity {
  reason:           string;
  wentTo?:          WentTo | null;
  scannedQrString?: string | null;
  timeIn?:          string | null;
  timeOut?:         string | null;
  status:           string;
  scannedAt?:       string;
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
  dailyStatus: string; // "In TUP" | "Checked Out" | "Transaction"
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

const getActivityLabel = (act: Activity): string => {
  if (act.wentTo) {
    return `${act.wentTo.firstName} ${act.wentTo.surname} (${act.wentTo.role})`;
  }
  const labelMap: Record<string, string> = {
    attendance:  "Attendance Check-in",
    break:       "Break",
    "go out":    "Went Out",
    transaction: "Transaction",
  };
  return labelMap[act.reason] ?? act.reason;
};

const getActivityIcon = (act: Activity) => {
  if (act.reason === "transaction")
    return <SwapOutlined style={{ color: "#1677ff", fontSize: 13 }} />;
  if (act.status === "In TUP")
    return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 13 }} />;
  return <LogoutOutlined style={{ color: "#b1122b", fontSize: 13 }} />;
};

const getActivityColor = (act: Activity): string => {
  if (act.reason === "transaction") return "#1677ff";
  return act.status === "In TUP" ? "#52c41a" : "#b1122b";
};

/* ================= COMPONENT ================= */

const UserAttendance = () => {
  const { user } = useAuth();
  const pollingIntervalMs = 12000;
  const fetchingRef = useRef(false);
  const [logs,    setLogs]    = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    const intervalId     = window.setInterval(fetchLogs, pollingIntervalMs);
    const handleFocus    = () => fetchLogs();
    const handleVisible  = () => {
      if (document.visibilityState === "visible") fetchLogs();
    };
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>

      {/* ── PROFILE HERO ── */}
      <div style={{
        background: "linear-gradient(135deg, #b1122b 0%, #8c0d22 100%)",
        borderRadius: 20, padding: "28px 24px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 20,
        boxShadow: "0 8px 32px rgba(140,13,34,0.35)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180,
          borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", right:40, bottom:-60, width:140, height:140,
          borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />

        <Avatar size={72} src={user?.photoURL} icon={<UserOutlined />}
          style={{ border:"3px solid rgba(255,255,255,0.6)",
            boxShadow:"0 4px 16px rgba(0,0,0,0.3)", flexShrink:0 }} />

        <div style={{ flex:1, zIndex:1 }}>
          <Title level={4} style={{ margin:0, color:"#fff" }}>
            {user?.firstName} {user?.surname}
          </Title>
          <Space size={8} style={{ marginTop:4 }}>
            <Tag style={{ background:"rgba(255,255,255,0.2)", border:"none",
              color:"#fff", fontWeight:600 }}>
              {user?.role}
            </Tag>
            {todayLog?.user?.qrString && (
              <Text style={{ color:"rgba(255,255,255,0.75)", fontSize:12 }}>
                {todayLog.user.qrString}
              </Text>
            )}
          </Space>
        </div>

        <div style={{ textAlign:"center", zIndex:1, background:"rgba(255,255,255,0.12)",
          borderRadius:14, padding:"10px 16px", minWidth:110 }}>
          <Badge
            status={isInTUP ? "success" : "default"}
            text={
              <Text style={{ color:"#fff", fontWeight:700, fontSize:13 }}>
                {todayLog ? (isInTUP ? "In TUP" : "Checked Out") : "Not yet in"}
              </Text>
            }
          />
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, marginTop:2 }}>
            Today's Status
          </div>
        </div>
      </div>

      {/* ── TODAY SUMMARY ── */}
      {todayLog && (
        <Card style={{ borderRadius:16, marginBottom:24,
          boxShadow:"0 4px 16px rgba(0,0,0,0.07)", border:"1px solid #f0f0f0" }}
          bodyStyle={{ padding:"16px 20px" }}>

          <Text style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:1, color:"#b1122b" }}>
            Today — {dayjs(todayLog.date).format("MMMM DD, YYYY")}
          </Text>

          <div style={{ display:"flex", gap:32, marginTop:12, flexWrap:"wrap" }}>
            <div>
              <Text type="secondary" style={{ fontSize:12 }}>
                <ClockCircleOutlined style={{ marginRight:4 }} /> First Time In
              </Text>
              <Title level={5} style={{ margin:0, color:"#262626" }}>
                {getTimeIn(todayLog) ? dayjs(getTimeIn(todayLog)!).format("hh:mm A") : "—"}
              </Title>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize:12 }}>
                <LogoutOutlined style={{ marginRight:4 }} /> Last Time Out
              </Text>
              <Title level={5} style={{ margin:0, color:"#262626" }}>
                {getTimeOut(todayLog) ? dayjs(getTimeOut(todayLog)!).format("hh:mm A") : "—"}
              </Title>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize:12 }}>
                <EnvironmentOutlined style={{ marginRight:4 }} /> Places Visited
              </Text>
              <Title level={5} style={{ margin:0, color:"#262626" }}>
                {todayLog.activities.filter((a) => a.reason === "transaction").length}
              </Title>
            </div>
          </div>

          {/* Today's visit trail */}
          {todayLog.activities.length > 0 && (
            <>
              <Divider style={{ margin:"16px 0 12px" }} />
              <Text style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:1, color:"#8c8c8c", display:"block", marginBottom:12 }}>
                Today's Trail
              </Text>
              <Timeline
                items={todayLog.activities.map((act, i) => ({
                  key:   i,
                  color: getActivityColor(act),
                  dot:   getActivityIcon(act),
                  children: (
                    <div>
                      <Space style={{ justifyContent:"space-between", width:"100%" }} wrap>
                        <Text strong style={{ fontSize:13 }}>
                          {act.reason === "transaction"
                            ? `Went to: ${getActivityLabel(act)}`
                            : getActivityLabel(act)}
                        </Text>
                        <Tag color={
                          act.reason === "transaction" ? "blue"
                            : act.status === "In TUP"  ? "green" : "volcano"}
                          style={{ fontSize:11 }}>
                          {act.reason === "transaction" ? "Transaction" : act.status}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize:12 }}>
                        {act.timeIn
                          ? dayjs(act.timeIn).format("hh:mm A")
                          : act.scannedAt
                          ? dayjs(act.scannedAt).format("hh:mm A")
                          : ""}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </>
          )}

          {/* Staff attendance block */}
          {todayLog.attendance && (
            <>
              <Divider style={{ margin:"10px 0 10px" }} />
              <Text style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:1, color:"#8c8c8c", display:"block", marginBottom:8 }}>
                Attendance
              </Text>
              <Space size={24}>
                <Text type="secondary" style={{ fontSize:12 }}>
                  <ClockCircleOutlined style={{ marginRight:4 }} />
                  In:{" "}
                  <Text style={{ fontSize:12, color:"#262626" }}>
                    {todayLog.attendance.timeIn
                      ? dayjs(todayLog.attendance.timeIn).format("hh:mm A") : "—"}
                  </Text>
                </Text>
                <Text type="secondary" style={{ fontSize:12 }}>
                  <LogoutOutlined style={{ marginRight:4 }} />
                  Out:{" "}
                  <Text style={{ fontSize:12, color:"#262626" }}>
                    {todayLog.attendance.timeOut
                      ? dayjs(todayLog.attendance.timeOut).format("hh:mm A") : "—"}
                  </Text>
                </Text>
              </Space>
            </>
          )}
        </Card>
      )}

      {/* ── HISTORY ── */}
      <Text style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
        letterSpacing:1, color:"#8c8c8c", display:"block", marginBottom:12 }}>
        Attendance History
      </Text>

      {loading && logs.length === 0 ? (
        <div style={{ textAlign:"center", padding:48 }}>
          <Spin size="large" />
        </div>
      ) : historyLogs.length === 0 ? (
        <Empty description="No attendance history yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Space direction="vertical" style={{ width:"100%" }} size={12}>
          {historyLogs.map((log) => {
            const timeIn  = getTimeIn(log);
            const timeOut = getTimeOut(log);
            const visits  = log.activities.filter((a) => a.reason === "transaction");

            return (
              <Card key={log._id}
                style={{ borderRadius:14, border:"1px solid #f0f0f0",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}
                bodyStyle={{ padding:"14px 18px" }}>

                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:8 }}>
                  <Text strong style={{ fontSize:14 }}>
                    {dayjs(log.date).format("MMM DD, YYYY")}
                  </Text>
                  <Tag color={log.dailyStatus === "In TUP" ? "green" : "volcano"}>
                    {log.dailyStatus}
                  </Tag>
                </div>

                <Space size={24} style={{ marginBottom: visits.length ? 10 : 0 }}>
                  <Text type="secondary" style={{ fontSize:12 }}>
                    <ClockCircleOutlined style={{ marginRight:4 }} />
                    In:{" "}
                    <Text style={{ fontSize:12, color:"#262626" }}>
                      {timeIn ? dayjs(timeIn).format("hh:mm A") : "—"}
                    </Text>
                  </Text>
                  <Text type="secondary" style={{ fontSize:12 }}>
                    <LogoutOutlined style={{ marginRight:4 }} />
                    Out:{" "}
                    <Text style={{ fontSize:12, color:"#262626" }}>
                      {timeOut ? dayjs(timeOut).format("hh:mm A") : "—"}
                    </Text>
                  </Text>
                </Space>

                {visits.length > 0 && (
                  <>
                    <Divider style={{ margin:"10px 0 8px" }} />
                    <Space direction="vertical" size={4} style={{ width:"100%" }}>
                      {visits.map((act, i) => (
                        <div key={i} style={{
                          display:"flex", justifyContent:"space-between",
                          alignItems:"center", padding:"4px 10px",
                          borderRadius:8, background:"#f0f5ff",
                          borderLeft:"3px solid #1677ff",
                        }}>
                          <Text style={{ fontSize:12 }}>
                            <EnvironmentOutlined style={{ marginRight:5, color:"#1677ff" }} />
                            Went to:{" "}
                            <Text strong style={{ fontSize:12 }}>
                              {getActivityLabel(act)}
                            </Text>
                          </Text>
                          <Text type="secondary" style={{ fontSize:11 }}>
                            {act.timeIn
                              ? dayjs(act.timeIn).format("hh:mm A")
                              : act.scannedAt
                              ? dayjs(act.scannedAt).format("hh:mm A")
                              : "—"}
                          </Text>
                        </div>
                      ))}
                    </Space>
                  </>
                )}
              </Card>
            );
          })}
        </Space>
      )}
    </div>
  );
};

export default UserAttendance;