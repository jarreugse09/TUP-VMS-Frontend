import {
  Card,
  message,
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
} from 'antd';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { userScanQR } from '../../services/logService';
import {
  UserOutlined,
  ClockCircleOutlined,
  ScanOutlined,
  CheckCircleFilled,
  LogoutOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { EditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const qrcodeRegionId = 'html5qr-code-full-region';

const StaffDashboard = () => {
  const [mode, setMode] = useState<'checkin' | 'checkout'>('checkin');
  const [scanResult, setScanResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const [manualQR, setManualQR] = useState('');

  useEffect(() => {
    if (cooldown <= 0) {
      processingRef.current = false;
      lastScannedRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      setCooldown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  // QR SCAN HANDLER
  // =====================
  const handleScan = useCallback(
    async (decodedText: string) => {
      if (processingRef.current) return;
      if (decodedText === lastScannedRef.current) return;

      processingRef.current = true;
      lastScannedRef.current = decodedText;

      try {
        const result = await userScanQR(decodedText, mode);

        setScanResult({
          ...result,
          time: new Date(),
        });

        message.success({
          content:
            mode === 'checkin'
              ? 'Transaction check-in successful'
              : 'Transaction check-out successful',
          icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
        });

        setCooldown(3);
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Scan failed');
        setCooldown(2);
      }
    },
    [mode]
  );

  // =====================
  // MANUAL QR HANDLER
  // =====================
  const handleManualSubmit = async () => {
    if (!manualQR.trim()) {
      message.warning('Please enter a QR code');
      return;
    }

    if (processingRef.current) return;

    processingRef.current = true;
    lastScannedRef.current = manualQR.trim();

    try {
      const result = await userScanQR(manualQR.trim(), mode);

      setScanResult({
        ...result,
        time: new Date(),
      });

      message.success({
        content:
          mode === 'checkin'
            ? 'Transaction check-in successful'
            : 'Transaction check-out successful',
        icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
      });

      setCooldown(3);
      setManualQR('');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Scan failed');
      setCooldown(2);
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
      supportedScanTypes: ['qr_code'],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        text => handleScan(text),
        undefined
      )
      .then(() => {
        setScannerStarted(true);
        setScannerError(null);
      })
      .catch(err => {
        console.error(err);
        setScannerError(
          'Failed to start camera. Please check permissions and try again.'
        );
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(e => console.error(e));
      }
    };
  }, [handleScan, scannerStarted]);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Row gutter={24} style={{ alignItems: 'stretch' }}>
          {' '}
          {/* gutter adds the gap */}
          {/* Left Side: Scanner */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card
              variant="borderless"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              styles={{
                body: {
                  padding: 24,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <Space>
                  <ScanOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                  <Text strong style={{ fontSize: 16 }}>
                    Live Scanner
                  </Text>
                </Space>
                <Badge
                  status={scannerError ? 'error' : 'processing'}
                  text={
                    <Text type="secondary">
                      {scannerError ? 'Error' : 'Active'}
                    </Text>
                  }
                />
              </div>

              {/* Scanner Container */}
              <div
                style={{
                  position: 'relative',
                  alignItems: 'center',
                  width: '100%',
                  aspectRatio: '1.3 / 1',
                  background: '#000',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <div
                  id={qrcodeRegionId}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* Focus Frame - This stays centered regardless of video size */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '250px',
                    height: '250px',
                    border: '2px solid #1677ff',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    zIndex: 5,
                    /* Darkens everything outside the focus square */
                    boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.4)',
                  }}
                />

                {cooldown > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 10,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <ClockCircleOutlined
                        style={{
                          fontSize: 48,
                          color: '#1677ff',
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
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text
                    type="danger"
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    {scannerError}
                  </Text>
                  <Button type="primary" onClick={restartScanner}>
                    Restart Scanner
                  </Button>
                </div>
              )}

              {/* Manual QR Entry */}
              <Divider style={{ margin: '24px 0 16px' }}>
                <Text type="secondary">Manual Entry</Text>
              </Divider>

              <Space.Compact>
                <Input
                  placeholder="Enter QR code manually"
                  value={manualQR}
                  disabled={cooldown > 0}
                  onChange={e => setManualQR(e.target.value)}
                  onPressEnter={handleManualSubmit}
                  style={{
                    width: 'calc(100% - 48px)',
                    borderRadius: '8px 0 0 8px',
                  }}
                  prefix={<EditOutlined />}
                />
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  disabled={cooldown > 0}
                  onClick={handleManualSubmit}
                  style={{
                    borderRadius: '0 8px 8px 0',
                  }}
                />
              </Space.Compact>

              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 8, fontSize: 12 }}
              >
                Use this if the QR code cannot be scanned by the camera
              </Text>
            </Card>
          </Col>
          {/* Right Side: Result */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card
              variant="borderless"
              style={{
                borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              title={<Text strong>Current Action</Text>}
              extra={
                <div
                  style={{ background: '#f0f2f5', padding: 4, borderRadius: 8 }}
                >
                  <Button
                    type={mode === 'checkin' ? 'primary' : 'text'}
                    icon={<LoginOutlined />}
                    onClick={() => {
                      setMode('checkin');
                      setScanResult(null);
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    In
                  </Button>
                  <Button
                    type={mode === 'checkout' ? 'primary' : 'text'}
                    icon={<LogoutOutlined />}
                    onClick={() => {
                      setMode('checkout');
                      setScanResult(null);
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    Out
                  </Button>
                </div>
              }
              styles={{
                body: {
                  padding: 24,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                },
              }}
            >
              {scanResult ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      marginBottom: 24,
                    }}
                  >
                    <Avatar
                      size={140}
                      src={scanResult.user.photoURL}
                      icon={<UserOutlined />}
                      style={{
                        border: '4px solid #fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 5,
                        right: 5,
                        background: '#52c41a',
                        borderRadius: '50%',
                        width: 30,
                        height: 30,
                        border: '3px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircleFilled
                        style={{ color: '#fff', fontSize: 16 }}
                      />
                    </div>
                  </div>

                  <Title level={2} style={{ marginBottom: 4 }}>
                    {scanResult.user.firstName} {scanResult.user.surname}
                  </Title>
                  <div style={{ marginBottom: 24 }}>
                    <Tag
                      color="blue"
                      style={{
                        borderRadius: 20,
                        padding: '2px 16px',
                        border: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {scanResult.user.role.toUpperCase()}
                    </Tag>
                  </div>

                  <Divider dashed style={{ margin: '24px 0' }} />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 4 }}
                      >
                        Status
                      </Text>
                      <Text strong style={{ fontSize: 18 }}>
                        {mode === 'checkin' ? 'CHECKED IN' : 'CHECKED OUT'}
                      </Text>
                    </Col>
                    <Col span={12}>
                      <Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 4 }}
                      >
                        Timestamp
                      </Text>
                      <Text strong style={{ fontSize: 18 }}>
                        {scanResult.time.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Col>
                  </Row>
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#fafafa',
                    borderRadius: 16,
                    border: '2px dashed #e8e8e8',
                  }}
                >
                  <ScanOutlined
                    style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }}
                  />
                  <Text style={{ color: '#8c8c8c', fontSize: 16 }}>
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

export default StaffDashboard;
