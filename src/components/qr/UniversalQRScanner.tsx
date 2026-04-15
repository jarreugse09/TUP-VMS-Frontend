import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Grid,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
  notification,
} from "antd";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  EditOutlined,
  LoginOutlined,
  LogoutOutlined,
  ScanOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { clientScanQR, securityScanQR } from "../../services/logService";

const { Title, Text } = Typography;

type Mode = "full" | "client-only";
type PanelMode = "attendance" | "transaction";
type AttendanceAction =
  | "time_in"
  | "time_out"
  | "break_start"
  | "break_end"
  | "go_out"
  | "go_in";
type TransactionAction = "transaction_start" | "transaction_end";

interface Props {
  mode: Mode;
  role: string;
}

interface ScanUser {
  firstName?: string;
  surname?: string;
  role?: string;
  photoURL?: string;
}

interface ScanResult {
  user: ScanUser;
  time: Date;
}

const SECURITY_ROLES = ["security_head", "security_staff", "superadmin"];

const UniversalQRScanner = ({ mode, role }: Props) => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const [manualQR, setManualQR] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(
    mode === "full" ? "attendance" : "transaction",
  );
  const [attendanceAction, setAttendanceAction] =
    useState<AttendanceAction>("time_in");
  const [transactionAction, setTransactionAction] =
    useState<TransactionAction>("transaction_start");
  const scannerIdRef = useRef(
    `universal-qr-${Math.random().toString(36).slice(2)}`,
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const panelModeRef = useRef<PanelMode>(mode === "full" ? "attendance" : "transaction");
  const attendanceActionRef = useRef<AttendanceAction>("time_in");
  const transactionActionRef = useRef<TransactionAction>("transaction_start");
  const normalizedRole = (role || "").toLowerCase();
  const isSecurityRole = SECURITY_ROLES.includes(normalizedRole);
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);

  useEffect(() => {
    panelModeRef.current = panelMode;
  }, [panelMode]);

  useEffect(() => {
    attendanceActionRef.current = attendanceAction;
  }, [attendanceAction]);

  useEffect(() => {
    transactionActionRef.current = transactionAction;
  }, [transactionAction]);

  useEffect(() => {
    if (cooldown <= 0) {
      processingRef.current = false;
      lastScannedRef.current = null;
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const buildResult = useCallback(
    (result: unknown) => {
      const response = (result &&
      typeof result === "object" &&
      "user" in result &&
      result.user &&
      typeof result.user === "object"
        ? result.user
        : null) as ScanUser | null;

      return {
        user:
          response ?? {
            firstName: "QR",
            surname: "Recorded",
            role: isSecurityRole ? "Security" : "Client",
            photoURL: "",
          },
        time: new Date(),
      };
    },
    [isSecurityRole],
  );

  const resetAfterWarning = useCallback((delay = 4000) => {
    window.setTimeout(() => {
      setScanResult(null);
      processingRef.current = false;
      lastScannedRef.current = null;
    }, delay);
  }, []);

  const handleScanError = useCallback(
    (error: unknown) => {
      const errorData =
        error && typeof error === "object"
          ? (error as {
              response?: { data?: { message?: string } };
              message?: string;
            })
          : undefined;

      const errorMessage =
        errorData?.response?.data?.message ?? errorData?.message ?? "Scan failed";

      if (
        errorMessage.includes("already check in") ||
        errorMessage.includes("already attended")
      ) {
        const isAlreadyCheckedIn = errorMessage.includes("already check in");
        notification.warning({
          message: isAlreadyCheckedIn ? "⏱️ Already Checked In" : "⏱️ Already Attended",
          description: isAlreadyCheckedIn
            ? "User is already checked in. Try checking them out first."
            : "User has already checked in for attendance today.",
          duration: 4,
        });
        resetAfterWarning();
        return;
      }

      if (errorMessage.includes("must check in first")) {
        notification.warning({
          message: "❌ Not Checked In Yet",
          description: "User must check in before they can check out.",
          duration: 4,
        });
        resetAfterWarning();
        return;
      }

      notification.error({
        message: "❌ Scan Failed",
        description: errorMessage,
        duration: 3,
      });
      processingRef.current = false;
      lastScannedRef.current = null;
    },
    [resetAfterWarning],
  );

  const processScan = useCallback(
    async (qrCode: string) => {
      if (processingRef.current || qrCode === lastScannedRef.current) {
        return;
      }

      if (!normalizedRole) {
        notification.error({
          message: "❌ Scan Blocked",
          description: "Unable to determine the current role.",
          duration: 3,
        });
        return;
      }

      if (!isSecurityRole && mode !== "client-only") {
        notification.error({
          message: "❌ Scan Blocked",
          description: "This scanner mode is not allowed for the current role.",
          duration: 3,
        });
        return;
      }

      processingRef.current = true;
      lastScannedRef.current = qrCode;

      const values = form.getFieldsValue([
        "platesNumber",
        "approvedBy",
        "transactionType",
        "notes",
      ]) as {
        platesNumber?: string;
        approvedBy?: string;
        transactionType?: string;
        notes?: string;
      };

      try {
        const result = isSecurityRole
          ? await securityScanQR(
              qrCode,
              panelModeRef.current === "attendance"
                ? attendanceActionRef.current
                : transactionActionRef.current,
              values,
            )
          : await clientScanQR(
              qrCode,
              transactionActionRef.current === "transaction_start"
                ? "checkin"
                : "checkout",
              values,
            );

        setScanResult(buildResult(result));
        setCooldown(3);
        setManualQR("");

        const successLabel =
          panelModeRef.current === "attendance"
            ? attendanceActionRef.current.replace(/_/g, " ")
            : transactionActionRef.current.replace(/_/g, " ");
        message.success(`${successLabel} successful`);
      } catch (error) {
        handleScanError(error);
      }
    },
    [buildResult, form, handleScanError, isSecurityRole, mode, normalizedRole],
  );

  const handleCameraScan = useCallback(
    async (decodedText: string) => {
      await processScan(decodedText);
    },
    [processScan],
  );

  const handleManualSubmit = useCallback(async () => {
    if (!manualQR.trim()) {
      message.warning("Please enter a QR code");
      return;
    }

    await processScan(manualQR.trim());
  }, [manualQR, processScan]);

  const restartScanner = useCallback(async () => {
    setScannerError(null);
    setScannerStarted(false);
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (scannerStarted) {
      return;
    }

    const html5QrCode = new Html5Qrcode(scannerIdRef.current);
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (text) => {
          void handleCameraScan(text);
        },
        undefined,
      )
      .then(() => {
        setScannerStarted(true);
        setScannerError(null);
      })
      .catch((error: unknown) => {
        console.error(error);
        setScannerError("Failed to start camera. Please check permissions.");
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().catch((error) => console.error(error));
      }
    };
  }, [handleCameraScan, scannerStarted]);

  return (
    <div style={{ minHeight: "100vh", padding: "0px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Row gutter={[24, 24]} style={{ alignItems: "stretch" }}>
          <Col xs={24} md={12} style={{ display: "flex" }}>
            <Card
              style={{
                borderRadius: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <Space>
                  <ScanOutlined style={{ color: "#1677ff", fontSize: 20 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    Live Scanner
                  </Text>
                </Space>
                <Badge
                  status={scannerError ? "error" : "processing"}
                  text={
                    <Text type="secondary">
                      {scannerError ? "Error" : "Active"}
                    </Text>
                  }
                />
              </div>

              <div
                style={{
                  position: "relative",
                  alignItems: "center",
                  width: "100%",
                  aspectRatio: "1.3 / 1",
                  background: "#000",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  id={scannerIdRef.current}
                  style={{ width: "100%", height: "100%" }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: isMobile ? "180px" : isTablet ? "220px" : "250px",
                    height: isMobile ? "180px" : isTablet ? "220px" : "250px",
                    border: "2px solid #1677ff",
                    borderRadius: "12px",
                    pointerEvents: "none",
                    zIndex: 5,
                    boxShadow: "0 0 0 1000px rgba(0, 0, 0, 0.4)",
                  }}
                />

                {cooldown > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background: "rgba(255, 255, 255, 0.9)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 10,
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <ClockCircleOutlined
                        style={{
                          fontSize: 48,
                          color: "#1677ff",
                          marginBottom: 16,
                        }}
                      />
                      <Title level={4} style={{ margin: 0 }}>
                        Processing...
                      </Title>
                      <Text type="secondary">Next scan in {cooldown}s</Text>
                    </div>
                  </div>
                )}
              </div>

              {scannerError && (
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Text
                    type="danger"
                    style={{ display: "block", marginBottom: 8 }}
                  >
                    {scannerError}
                  </Text>
                  <Button type="primary" onClick={() => void restartScanner()}>
                    Restart Scanner
                  </Button>
                </div>
              )}

              <Divider style={{ margin: "24px 0 16px" }}>
                <Text type="secondary">Manual Entry</Text>
              </Divider>

              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="Enter QR code manually"
                  value={manualQR}
                  disabled={cooldown > 0}
                  onChange={(event) => setManualQR(event.target.value)}
                  onPressEnter={() => void handleManualSubmit()}
                  style={{ flex: 1, borderRadius: "8px 0 0 8px" }}
                  prefix={<EditOutlined />}
                />
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  disabled={cooldown > 0}
                  onClick={() => void handleManualSubmit()}
                  style={{ borderRadius: "0 8px 8px 0" }}
                />
              </Space.Compact>

              <Text
                type="secondary"
                style={{ display: "block", marginTop: 8, fontSize: 12 }}
              >
                Use this if the QR code cannot be scanned by the camera
              </Text>

              <Divider style={{ margin: "24px 0 16px" }}>
                <Text type="secondary">Scanner Actions</Text>
              </Divider>

              {mode === "full" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <Button
                    type={panelMode === "attendance" ? "primary" : "default"}
                    onClick={() => setPanelMode("attendance")}
                    style={{ borderRadius: 8 }}
                  >
                    Attendance
                  </Button>
                  <Button
                    type={panelMode === "transaction" ? "primary" : "default"}
                    onClick={() => setPanelMode("transaction")}
                    style={{ borderRadius: 8 }}
                  >
                    Transaction
                  </Button>
                </div>
              )}

              <Form
                form={form}
                layout="vertical"
                initialValues={{ transactionType: "other", notes: "" }}
              >
                {mode === "full" && panelMode === "attendance" ? (
                  <>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        type={attendanceAction === "time_in" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("time_in")}
                        style={{ borderRadius: 8 }}
                      >
                        Time In
                      </Button>
                      <Button
                        type={attendanceAction === "time_out" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("time_out")}
                        style={{ borderRadius: 8 }}
                      >
                        Time Out
                      </Button>
                      <Button
                        type={attendanceAction === "break_start" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("break_start")}
                        style={{ borderRadius: 8 }}
                      >
                        Break Start
                      </Button>
                      <Button
                        type={attendanceAction === "break_end" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("break_end")}
                        style={{ borderRadius: 8 }}
                      >
                        Break End
                      </Button>
                      <Button
                        type={attendanceAction === "go_out" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("go_out")}
                        style={{ borderRadius: 8 }}
                      >
                        Go Out
                      </Button>
                      <Button
                        type={attendanceAction === "go_in" ? "primary" : "default"}
                        onClick={() => setAttendanceAction("go_in")}
                        style={{ borderRadius: 8 }}
                      >
                        Go In
                      </Button>
                    </div>
                    <Form.Item
                      label="Plate Number"
                      name="platesNumber"
                      style={{ marginTop: 16, marginBottom: 12 }}
                    >
                      <Input placeholder="Enter plate number if needed" />
                    </Form.Item>
                    <Form.Item
                      label="Approved By"
                      name="approvedBy"
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder="Enter approver name if required" />
                    </Form.Item>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        type={
                          transactionAction === "transaction_start"
                            ? "primary"
                            : "default"
                        }
                        onClick={() => setTransactionAction("transaction_start")}
                        style={{ borderRadius: 8 }}
                      >
                        Transaction Start
                      </Button>
                      <Button
                        type={
                          transactionAction === "transaction_end"
                            ? "primary"
                            : "default"
                        }
                        onClick={() => setTransactionAction("transaction_end")}
                        style={{ borderRadius: 8 }}
                      >
                        Transaction End
                      </Button>
                    </div>
                    <Form.Item
                      label="Transaction Type"
                      name="transactionType"
                      style={{ marginTop: 16, marginBottom: 12 }}
                    >
                      <Select
                        options={[
                          { value: "other", label: "Other" },
                          { value: "entry", label: "Entry" },
                          { value: "exit", label: "Exit" },
                        ]}
                      />
                    </Form.Item>
                  </>
                )}
                <Form.Item label="Notes" name="notes" style={{ marginBottom: 0 }}>
                  <Input.TextArea
                    rows={3}
                    placeholder="Optional notes for this scan"
                  />
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} md={12} style={{ display: "flex" }}>
            <Card
              style={{
                borderRadius: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
              title={<Text strong>Current Action</Text>}
              extra={
                <div
                  style={{ background: "#f0f2f5", padding: 4, borderRadius: 8 }}
                >
                  <Button
                    type={
                      (mode === "full" && panelMode === "attendance"
                        ? attendanceAction === "time_in"
                        : transactionAction === "transaction_start")
                        ? "primary"
                        : "text"
                    }
                    icon={<LoginOutlined />}
                    onClick={() => {
                      if (mode === "full" && panelMode === "attendance") {
                        setAttendanceAction("time_in");
                      } else {
                        setTransactionAction("transaction_start");
                      }
                      setScanResult(null);
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    In
                  </Button>
                  <Button
                    type={
                      (mode === "full" && panelMode === "attendance"
                        ? attendanceAction === "time_out"
                        : transactionAction === "transaction_end")
                        ? "primary"
                        : "text"
                    }
                    icon={<LogoutOutlined />}
                    onClick={() => {
                      if (mode === "full" && panelMode === "attendance") {
                        setAttendanceAction("time_out");
                      } else {
                        setTransactionAction("transaction_end");
                      }
                      setScanResult(null);
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    Out
                  </Button>
                </div>
              }
            >
              {scanResult ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginBottom: 24,
                    }}
                  >
                    <Avatar
                      size={isMobile ? 100 : 140}
                      src={scanResult.user.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        border: "4px solid #fff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    />
                    {!isMobile && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 5,
                          right: 5,
                          background: "#52c41a",
                          borderRadius: "50%",
                          width: 30,
                          height: 30,
                          border: "3px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircleFilled
                          style={{ color: "#fff", fontSize: 16 }}
                        />
                      </div>
                    )}
                  </div>

                  <Title level={isMobile ? 3 : 2} style={{ marginBottom: 4 }}>
                    {`${scanResult.user.firstName || ""} ${scanResult.user.surname || ""}`.trim() ||
                      "QR Recorded"}
                  </Title>
                  <div style={{ marginBottom: 24 }}>
                    <Tag
                      color="blue"
                      style={{
                        borderRadius: 20,
                        padding: "2px 16px",
                        border: "none",
                        fontWeight: 600,
                      }}
                    >
                      {(scanResult.user.role || "-").toUpperCase()}
                    </Tag>
                  </div>

                  <Divider dashed style={{ margin: "24px 0" }} />

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        Status
                      </Text>
                      <Text strong style={{ fontSize: 18 }}>
                        {(mode === "full" && panelMode === "attendance"
                          ? attendanceAction
                          : transactionAction
                        )
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </Text>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        Timestamp
                      </Text>
                      <Text strong style={{ fontSize: 18 }}>
                        {scanResult.time.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Col>
                  </Row>
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#fafafa",
                    borderRadius: 16,
                    border: "2px dashed #e8e8e8",
                  }}
                >
                  <ScanOutlined
                    style={{ fontSize: 64, color: "#d9d9d9", marginBottom: 16 }}
                  />
                  <Text style={{ color: "#8c8c8c", fontSize: 16 }}>
                    Awaiting QR Scan...
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default UniversalQRScanner;
