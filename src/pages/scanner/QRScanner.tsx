import { useState, useEffect } from 'react';
import {
  Card, Form, Input, Select, Button, message, Space,
  Typography, Grid, Result, Row, Col, Tabs, Divider, Tag,
} from 'antd';
import {
  ScanOutlined, CameraOutlined, SendOutlined,
  UserOutlined, CarOutlined, SwapOutlined,
} from '@ant-design/icons';
import { performManualScan, ScanAction } from '../../services/scanService';
import api from '../../services/api';

const { Text, Title } = Typography;
const { Option } = Select;
const MAROON = '#DC143C';

interface ScanResult {
  success: boolean;
  message: string;
  data?: {
    userId?: string;
    name?: string;
    action?: string;
    transactionId?: string;
    attendance?: {
      timeIn: string | null;
      timeOut: string | null;
      breakStart: string | null;
      breakEnd: string | null;
      goOutEntries: number;
    };
  };
}

interface QRScannerProps {
  mode?: 'full' | 'client-only';
}

const QRScanner = ({ mode = 'client-only' }: QRScannerProps) => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const isFullMode = mode === 'full';

  // ── Sub-feature A (attendance/visit scan) state
  const [qrCode, setQrCode] = useState('');
  const [action, setAction] = useState<ScanAction>('time_in');
  const [platesNumber, setPlatesNumber] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [supervisors, setSupervisors] = useState<Array<{ _id: string; firstName: string; surname: string; subRole: string }>>([]);

  // ── Sub-feature B (transaction scan) state
  const [txnQrCode, setTxnQrCode] = useState('');
  const [txnType, setTxnType] = useState('');
  const [txnAction, setTxnAction] = useState<'transaction_start' | 'transaction_end'>('transaction_start');
  const [txnScanning, setTxnScanning] = useState(false);
  const [txnResult, setTxnResult] = useState<ScanResult | null>(null);

  const isGoOutAction = action === 'go_out' || action === 'break_start';

  useEffect(() => {
    if (isGoOutAction && supervisors.length === 0) {
      api.get('/users?limit=500').then(res => {
        const data = res.data?.data || res.data || [];
        setSupervisors(
          data.filter((u: { subRole: string }) =>
            u.subRole === 'security_head' || u.subRole === 'hr_head'
          )
        );
      }).catch(() => {});
    }
  }, [isGoOutAction, supervisors.length]);

  const handleAttendanceScan = async () => {
    if (!qrCode.trim()) { message.error('Please enter a QR code'); return; }
    if (isGoOutAction && !approvedBy) { message.error('Approving supervisor is required for go-out'); return; }

    setScanning(true);
    setScanResult(null);
    try {
      const result = await performManualScan({
        qrCode: qrCode.trim(),
        action,
        platesNumber: platesNumber || undefined,
        approvedBy: approvedBy || undefined,
        notes: notes || undefined,
      });
      setScanResult(result);
      message.success(result.message);
      setQrCode(''); setPlatesNumber(''); setNotes('');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Scan failed';
      message.error(errorMsg);
      setScanResult({ success: false, message: errorMsg });
    } finally {
      setScanning(false);
    }
  };

  const handleTransactionScan = async () => {
    if (!txnQrCode.trim()) { message.error('Please enter a QR code'); return; }
    if (txnAction === 'transaction_start' && !txnType) { message.error('Transaction type is required'); return; }

    setTxnScanning(true);
    setTxnResult(null);
    try {
      const result = await performManualScan({
        qrCode: txnQrCode.trim(),
        action: txnAction,
        transactionType: txnType || undefined,
      } as Parameters<typeof performManualScan>[0]);
      setTxnResult(result);
      message.success(result.message);
      setTxnQrCode('');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Transaction scan failed';
      message.error(errorMsg);
      setTxnResult({ success: false, message: errorMsg });
    } finally {
      setTxnScanning(false);
    }
  };

  const renderScanResult = (result: ScanResult | null) => {
    if (!result) return null;
    return (
      <Result
        status={result.success ? 'success' : 'error'}
        title={result.success ? 'Scan Successful' : 'Scan Failed'}
        subTitle={result.message}
        extra={
          result.success && result.data ? [
            <Text key="user"><UserOutlined /> {result.data.name}</Text>,
            <Text key="action">Action: {result.data.action?.replace(/_/g, ' ')}</Text>,
          ] : undefined
        }
      />
    );
  };

  // ── Sub-feature B panel (shared for all roles)
  const txnPanel = (
    <Card
      style={{ borderRadius: 12, border: '2px solid #e6f4ff', background: '#f0f8ff' }}
      title={
        <Space>
          <SwapOutlined style={{ color: '#1677ff' }} />
          <Text strong style={{ color: '#1677ff' }}>
            {isFullMode ? 'Transaction Scan' : 'Client Transaction Scan'}
          </Text>
          <Tag color="blue">{isFullMode ? 'All Roles' : 'Client Mode'}</Tag>
        </Space>
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Scan a staff member&apos;s QR code to start or end a service transaction.
      </Text>
      <Form layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="Transaction Action" required>
              <Select value={txnAction} onChange={setTxnAction} size="large" style={{ width: '100%' }}>
                <Option value="transaction_start">Transaction Start</Option>
                <Option value="transaction_end">Transaction End</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Staff QR Code" required>
              <Input
                prefix={<CameraOutlined />}
                placeholder="Enter QR code manually"
                value={txnQrCode}
                onChange={e => setTxnQrCode(e.target.value)}
                onPressEnter={handleTransactionScan}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
        {txnAction === 'transaction_start' && (
          <Form.Item label="Transaction Type" required>
            <Select value={txnType} onChange={setTxnType} placeholder="Select type" size="large" style={{ width: '100%' }}>
              <Option value="payment">Payment</Option>
              <Option value="enrollment">Enrollment</Option>
              <Option value="application">Application</Option>
              <Option value="inquiry">Inquiry</Option>
              <Option value="document">Document Request</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
        )}
        <Form.Item>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleTransactionScan}
            loading={txnScanning}
            block
            size="large"
            style={{ background: '#1677ff', borderRadius: 8 }}
          >
            Submit Transaction Scan
          </Button>
        </Form.Item>
      </Form>
      {renderScanResult(txnResult)}
    </Card>
  );

  // ── Sub-feature A panel (security / superadmin only)
  const attendancePanel = (
    <Card
      style={{ borderRadius: 12, border: '2px solid #fff1f0', background: '#fff' }}
      title={
        <Space>
          <ScanOutlined style={{ color: MAROON }} />
          <Text strong>Attendance / Visit Scan</Text>
          <Tag color="red">Security & Admin</Tag>
        </Space>
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Scan a student, visitor, or staff QR code to record attendance or campus visit.
      </Text>
      <Form layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item label="Action" required>
              <Select value={action} onChange={setAction} style={{ width: '100%' }} size="large">
                <Option value="time_in">Time In</Option>
                <Option value="time_out">Time Out</Option>
                <Option value="break_start">Break Start</Option>
                <Option value="break_end">Break End</Option>
                <Option value="go_out">Go Out</Option>
                <Option value="go_in">Go In</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="QR Code" required>
              <Input
                prefix={<CameraOutlined />}
                placeholder="Enter or scan QR code"
                value={qrCode}
                onChange={e => setQrCode(e.target.value)}
                onPressEnter={handleAttendanceScan}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} md={isGoOutAction ? 12 : 24}>
            <Form.Item label={<Space><CarOutlined /> Plates Number</Space>}>
              <Input
                placeholder="Vehicle plate (optional)"
                value={platesNumber}
                onChange={e => setPlatesNumber(e.target.value)}
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
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="Select supervisor"
                  showSearch
                  optionFilterProp="children"
                >
                  {supervisors.map(s => (
                    <Option key={s._id} value={s._id}>
                      {s.firstName} {s.surname} ({s.subRole?.replace('_', ' ').toUpperCase()})
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
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleAttendanceScan}
            loading={scanning}
            block
            size="large"
            style={{ background: MAROON, borderColor: MAROON, borderRadius: 8 }}
          >
            Submit Scan
          </Button>
        </Form.Item>
      </Form>
      {renderScanResult(scanResult)}
    </Card>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? 8 : 16 }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        <ScanOutlined /> QR Scanner
      </Title>

      {isFullMode ? (
        <Tabs
          defaultActiveKey="attendance"
          items={[
            { key: 'attendance', label: 'Attendance / Visit', children: attendancePanel },
            { key: 'transaction', label: 'Transaction', children: txnPanel },
          ]}
        />
      ) : (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            You have access to the <strong>Transaction Scan</strong> sub-feature only.
            Security personnel handle attendance and visit scans.
          </Text>
          <Divider />
          {txnPanel}
        </>
      )}
    </div>
  );
};

export default QRScanner;
