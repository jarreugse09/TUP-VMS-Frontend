import { useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Typography,
  Grid,
  Result,
  Row,
  Col,
} from "antd";
import {
  ScanOutlined,
  CameraOutlined,
  SendOutlined,
  UserOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { performScan, performManualScan, ScanAction } from "../../services/scanService";
import { DpaNotice } from "../../components/DpaNotice";
import api from "../../services/api";
import { useEffect } from "react";

const { Text } = Typography;
const { Option } = Select;

const MAROON = "#DC143C";

interface ScanResult {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    name: string;
    action: string;
    attendance?: {
      timeIn: string | null;
      timeOut: string | null;
      breakStart: string | null;
      breakEnd: string | null;
      goOutEntries: number;
    };
  };
}

const QRScanner = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [qrCode, setQrCode] = useState("");
  const [action, setAction] = useState<ScanAction>("time_in");
  const [platesNumber, setPlatesNumber] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const isTransactionAction = action.startsWith("transaction");
  const isGoOutAction = action === "go_out" || action === "break_start";

  useEffect(() => {
    if (isGoOutAction && supervisors.length === 0) {
      api.get("/users?limit=1000").then(res => {
        const data = res.data?.data || res.data || [];
        const validSupes = data.filter((u: any) => 
          u.subRole === "security_head" || u.subRole === "hr_head"
        );
        setSupervisors(validSupes);
      }).catch(err => console.error("Could not load supervisors", err));
    }
  }, [isGoOutAction]);

  const handleScan = async (isManual: boolean = false) => {
    if (!qrCode.trim()) {
      message.error("Please enter or scan a QR code");
      return;
    }

    if (isTransactionAction && !transactionType) {
      message.error("Transaction type is required for transaction actions");
      return;
    }

    if (isGoOutAction && !approvedBy) {
      message.error("Approved by is required for go_out action");
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const payload = {
        qrCode: qrCode.trim(),
        action,
        platesNumber: platesNumber || undefined,
        approvedBy: approvedBy || undefined,
        transactionType: transactionType || undefined,
        notes: notes || undefined,
      };

      const scanFn = isManual ? performManualScan : performScan;
      const result = await scanFn(payload);
      setScanResult(result);
      message.success(result.message);
      
      // Reset form on success
      setQrCode("");
      setPlatesNumber("");
      setNotes("");
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Scan failed";
      message.error(errorMsg);
      setScanResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setScanning(false);
    }
  };

  const renderResult = () => {
    if (!scanResult) return null;

    return (
      <Result
        status={scanResult.success ? "success" : "error"}
        title={scanResult.success ? "Scan Successful" : "Scan Failed"}
        subTitle={scanResult.message}
        extra={
          scanResult.success && scanResult.data ? [
            <Text key="user">
              <UserOutlined /> {scanResult.data.name}
            </Text>,
            <Text key="action">
              Action: {scanResult.data.action.replace(/_/g, " ")}
            </Text>,
          ] : undefined
        }
      />
    );
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: isMobile ? 8 : 16,
      }}
    >
      <Card
        variant="borderless"
        style={{
          borderRadius: 16,
          border: "1px solid #f0f0f0",
        }}
        title={
          <Space>
            <ScanOutlined style={{ color: MAROON }} />
            <Text strong>QR Scanner</Text>
          </Space>
        }
      >
        <Form layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Action" required>
                <Select
                  value={action}
                  onChange={setAction}
                  style={{ width: "100%" }}
                  size="large"
                >
                  <Option value="time_in">
                    <Space>Time In</Space>
                  </Option>
                  <Option value="time_out">
                    <Space>Time Out</Space>
                  </Option>
                  <Option value="break_start">
                    <Space>Break Start</Space>
                  </Option>
                  <Option value="break_end">
                    <Space>Break End</Space>
                  </Option>
                  <Option value="go_out">
                    <Space>Go Out</Space>
                  </Option>
                  <Option value="go_in">
                    <Space>Go In</Space>
                  </Option>
                  <Option value="transaction_start">
                    <Space>Transaction Start</Space>
                  </Option>
                  <Option value="transaction_end">
                    <Space>Transaction End</Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={
                  <Space>
                    <ScanOutlined />
                    <span>QR Code</span>
                  </Space>
                }
                required
              >
                <Input
                  placeholder="Enter or scan QR code value"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onPressEnter={() => handleScan(true)}
                  size="large"
                  prefix={<CameraOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>

          {isTransactionAction && (
            <Form.Item label="Transaction Type" required>
              <Select
                value={transactionType}
                onChange={setTransactionType}
                style={{ width: "100%" }}
                placeholder="Select transaction type"
              >
                <Option value="payment">Payment</Option>
                <Option value="enrollment">Enrollment</Option>
                <Option value="application">Application</Option>
                <Option value="inquiry">Inquiry</Option>
                <Option value="document">Document Request</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>
          )}

          <Row gutter={12}>
            <Col xs={24} md={isGoOutAction ? 12 : 24}>
              <Form.Item label={<Space><CarOutlined /> Plates Number</Space>}>
                <Input
                  placeholder="Enter vehicle plate number (optional)"
                  value={platesNumber}
                  onChange={(e) => setPlatesNumber(e.target.value)}
                  size="large"
                />
              </Form.Item>
            </Col>

            {isGoOutAction && (
              <Col xs={24} md={12}>
                <Form.Item label="Approved By (Supervisor)" required>
                  <Select
                    value={approvedBy}
                    onChange={setApprovedBy}
                    style={{ width: "100%" }}
                    size="large"
                    placeholder="Select Supervisor"
                  >
                    {supervisors.map(supe => (
                      <Option key={supe._id} value={supe._id}>
                        {supe.firstName} {supe.surname} ({supe.subRole.replace("_", " ").toUpperCase()})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Form.Item label="Notes">
            <Input.TextArea
              placeholder="Add notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleScan(true)}
              loading={scanning}
              block
              size="large"
              style={{
                background: MAROON,
                borderColor: MAROON,
                borderRadius: 8,
              }}
            >
              Submit Scan
            </Button>
          </Form.Item>
        </Form>

        {renderResult()}
      </Card>
      <DpaNotice />
    </div>
  );
};

export default QRScanner;
