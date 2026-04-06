import {
  Card,
  message,
  notification,
  Row,
  Col,
  Avatar,
  Typography,
  Divider,
  Tag,
  Button,
  Space,
  Badge,
  Input,
  Grid,
} from "antd";
import { useState, useEffect, useCallback, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { scanQR } from "../../services/logService";
import {
  UserOutlined,
  ClockCircleOutlined,
  ScanOutlined,
  CheckCircleFilled,
  LogoutOutlined,
  LoginOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const qrcodeRegionId = "html5qr-code-full-region";

const AdminDashboard = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [mode, setMode] = useState<"checkin" | "checkout">("checkin");
  const [scanResult, setScanResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const modeRef = useRef<"checkin" | "checkout">("checkin");
  const reasonRef = useRef<string>("attendance");
  const [manualQR, setManualQR] = useState("");

  const [selectedReason, setSelectedReason] = useState<string>("attendance");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Detect mobile
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);

  useEffect(() => {
    if (cooldown <= 0) {
      processingRef.current = false;
      lastScannedRef.current = null;
      return;
    }

    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    reasonRef.current = selectedReason;
  }, [selectedReason]);

  // ===== HANDLE SCAN =====
  const handleScan = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    if (decodedText === lastScannedRef.current) return;

    processingRef.current = true;
    lastScannedRef.current = decodedText;

    try {
      const currentMode = modeRef.current;
      const currentReason = reasonRef.current;
      const payload = {
        reason: currentReason,
      };
      const result = await scanQR(decodedText, currentMode, payload);
      const userName = result?.user
        ? `${result.user.firstName} ${result.user.surname}`
        : "Unknown User";
      setResultMessage(`${userName} – ${currentReason.toUpperCase()} recorded`);
      setScanResult({ ...result, time: new Date() });
      setCooldown(2);

      setTimeout(() => {
        setResultMessage(null);
        processingRef.current = false;
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Scan failed";
      setResultMessage(null);
      
      // Handle specific status errors with better notifications
      if (errorMsg.includes("already check in") || errorMsg.includes("already attended")) {
        const isAlreadyCheckedIn = errorMsg.includes("already check in");
        notification.warning({
          message: isAlreadyCheckedIn ? "⏱️ Already Checked In" : "⏱️ Already Attended",
          description: isAlreadyCheckedIn 
            ? "User is already checked in. Try checking them out first."
            : "User has already checked in for attendance today.",
          duration: 4,
        });
        
        // Auto-refresh after 4 seconds for next scan
        setTimeout(() => {
          setScanResult(null);
          processingRef.current = false;
          lastScannedRef.current = null;
        }, 4000);
      } else if (errorMsg.includes("must check in first")) {
        notification.warning({
          message: "❌ Not Checked In Yet",
          description: "User must check in before they can check out.",
          duration: 4,
        });
        
        setTimeout(() => {
          processingRef.current = false;
          lastScannedRef.current = null;
        }, 4000);
      } else {
        notification.error({
          message: "❌ Scan Failed",
          description: errorMsg,
          duration: 3,
        });
        processingRef.current = false;
      }
    }
  }, []);

  // ===== MANUAL SUBMIT =====
  const handleManualSubmit = async () => {
    if (!manualQR.trim()) {
      message.warning("Please enter a QR code");
      return;
    }

    if (processingRef.current) return;

    processingRef.current = true;
    lastScannedRef.current = manualQR.trim();

    try {
      const payload = {
        reason: selectedReason,
      };
      const result = await scanQR(manualQR.trim(), mode, payload);
      const userName = result?.user
        ? `${result.user.firstName} ${result.user.surname}`
        : "Unknown User";
      setResultMessage(
        `${userName} – ${selectedReason.toUpperCase()} recorded`,
      );
      setScanResult({ ...result, time: new Date() });
      setCooldown(2);
      setManualQR("");

      setTimeout(() => {
        setResultMessage(null);
        processingRef.current = false;
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Scan failed";
      setResultMessage(null);
      
      // Handle specific status errors with better notifications
      if (errorMsg.includes("already check in") || errorMsg.includes("already attended")) {
        const isAlreadyCheckedIn = errorMsg.includes("already check in");
        notification.warning({
          message: isAlreadyCheckedIn ? "⏱️ Already Checked In" : "⏱️ Already Attended",
          description: isAlreadyCheckedIn 
            ? "User is already checked in. Try checking them out first."
            : "User has already checked in for attendance today.",
          duration: 4,
        });
        setManualQR("");
        
        // Auto-refresh after 4 seconds for next scan
        setTimeout(() => {
          setScanResult(null);
          processingRef.current = false;
          lastScannedRef.current = null;
        }, 4000);
      } else if (errorMsg.includes("must check in first")) {
        notification.warning({
          message: "❌ Not Checked In Yet",
          description: "User must check in before they can check out.",
          duration: 4,
        });
        setManualQR("");
        
        setTimeout(() => {
          processingRef.current = false;
          lastScannedRef.current = null;
        }, 4000);
      } else {
        notification.error({
          message: "❌ Scan Failed",
          description: errorMsg,
          duration: 3,
        });
        setManualQR("");
        processingRef.current = false;
      }
    }
  };

  const restartScanner = async () => {
    setScannerError(null);
    setScannerStarted(false);
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
  };

  useEffect(() => {
    if (scannerStarted) return;

    const html5QrCode = new Html5Qrcode(qrcodeRegionId);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 20,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      supportedScanTypes: ["qr_code"],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (text) => handleScan(text),
        undefined,
      )
      .then(() => {
        setScannerStarted(true);
        setScannerError(null);
      })
      .catch((err) => {
        console.error(err);
        setScannerError("Failed to start camera. Please check permissions.");
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((e) => console.error(e));
      }
    };
  }, [handleScan, scannerStarted]);

  return (
    <div style={{ minHeight: "100vh", padding: "0px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Row gutter={[24, 24]} style={{ alignItems: "stretch" }}>
          {/* Left Side: Scanner */}
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
                  id={qrcodeRegionId}
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
                  <Button type="primary" onClick={restartScanner}>
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
                  onChange={(e) => setManualQR(e.target.value)}
                  onPressEnter={handleManualSubmit}
                  style={{ flex: 1, borderRadius: "8px 0 0 8px" }}
                  prefix={<EditOutlined />}
                />
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  disabled={cooldown > 0}
                  onClick={handleManualSubmit}
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
                <Text type="secondary">Scan Type</Text>
              </Divider>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type={selectedReason === "attendance" ? "primary" : "default"}
                  onClick={() => setSelectedReason("attendance")}
                  style={{ flex: 1, minWidth: 100, borderRadius: 8 }}
                >
                  Attendance
                </Button>
                <Button
                  type={selectedReason === "break" ? "primary" : "default"}
                  onClick={() => setSelectedReason("break")}
                  style={{ flex: 1, minWidth: 100, borderRadius: 8 }}
                >
                  Break
                </Button>
                <Button
                  type={selectedReason === "go out" ? "primary" : "default"}
                  onClick={() => setSelectedReason("go out")}
                  style={{ flex: 1, minWidth: 100, borderRadius: 8 }}
                >
                  Go Out
                </Button>
              </div>

              <Text
                type="secondary"
                style={{ display: "block", marginTop: 12, fontSize: 12 }}
              >
                Selected: <strong>{selectedReason.toUpperCase()}</strong>
              </Text>
            </Card>
          </Col>

          {/* Right Side: Result */}
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
                    type={mode === "checkin" ? "primary" : "text"}
                    icon={<LoginOutlined />}
                    onClick={() => {
                      setMode("checkin");
                      setScanResult(null);
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    In
                  </Button>
                  <Button
                    type={mode === "checkout" ? "primary" : "text"}
                    icon={<LogoutOutlined />}
                    onClick={() => {
                      setMode("checkout");
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
                  {resultMessage && (
                    <div
                      style={{
                        background: "#f6ffed",
                        border: "1px solid #b7eb8f",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        color: "#52c41a",
                        fontWeight: 500,
                      }}
                    >
                      ✓ {resultMessage}
                    </div>
                  )}

                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      marginBottom: 24,
                    }}
                  >
                    <Avatar
                      size={isMobile ? 100 : 140}
                      src={scanResult?.user?.photoURL}
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
                    {scanResult?.user
                      ? `${scanResult.user.firstName} ${scanResult.user.surname}`
                      : "Unknown User"}
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
                      {scanResult?.user?.role
                        ? scanResult.user.role.toUpperCase()
                        : "-"}
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
                        {mode === "checkin" ? "CHECKED IN" : "CHECKED OUT"}
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

export default AdminDashboard;
