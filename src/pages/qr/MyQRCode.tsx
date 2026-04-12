import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Modal,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import QRCode from 'qrcode';
import { getProfile } from '../../services/userService';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const MyQRCode: React.FC = () => {
  const { user } = useAuth();
  const [qrString, setQrString] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const data = await getProfile();
        const nextQrString = data?.qrCode?.qrString ?? null;
        setQrString(nextQrString);

        if (nextQrString) {
          const dataUrl = await QRCode.toDataURL(nextQrString, {
            width: 220,
            margin: 2,
            color: {
              dark: '#111827',
              light: '#ffffff',
            },
          });
          setQrImageUrl(dataUrl);
        } else {
          setQrImageUrl(null);
        }
      } catch {
        message.warning('Failed to load QR code.');
      } finally {
        setLoading(false);
      }
    };

    void fetchQr();
  }, []);

  const downloadQR = () => {
    if (!qrImageUrl || !qrString) return;

    const link = document.createElement('a');
    const safeName = `${user?.firstName ?? 'user'}-${user?.surname ?? ''}`
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    link.download = `qr-${safeName || 'user'}-${user?.role ?? 'account'}.png`;
    link.href = qrImageUrl;
    link.click();
  };

  const handleRequestChange = async () => {
    if (!requestReason.trim()) {
      message.error('Reason is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/users/qr-requests', { reason: requestReason.trim() });
      message.success('QR change request submitted');
      setRequestOpen(false);
      setRequestReason('');
    } catch (error: unknown) {
      message.error('Failed to submit QR change request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center mt-24">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-sm">
          <Card className="text-center shadow-sm rounded-xl">
            <Title level={3}>My QR Code</Title>

            {qrImageUrl ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4 inline-block">
                  <img
                    id="qr-code-image"
                    src={qrImageUrl}
                    alt="My QR code"
                    className="h-[220px] w-[220px] mx-auto object-contain"
                  />
                </div>

                <div className="mt-4">
                  <Text type="secondary">
                    Use this QR code for campus access and transactions.
                  </Text>
                  <div className="mt-2">
                    <Text strong>{qrString}</Text>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                  <Button type="primary" onClick={downloadQR}>
                    Download QR
                  </Button>
                  <Button onClick={() => setRequestOpen(true)}>
                    Request QR Change
                  </Button>
                </div>
              </>
            ) : (
              <Text type="danger">
                No QR code found for your account. Please contact the administrator or request a new one.
              </Text>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={requestOpen}
        onCancel={() => setRequestOpen(false)}
        onOk={() => void handleRequestChange()}
        okText="Submit Request"
        confirmLoading={submitting}
        centered
        title="Request QR Change"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text type="secondary">
            Explain why you need a new QR code issued for your account.
          </Text>
          <TextArea
            rows={4}
            value={requestReason}
            onChange={event => setRequestReason(event.target.value)}
            placeholder="Enter the reason for your request"
            maxLength={500}
            showCount
          />
        </Space>
      </Modal>
    </>
  );
};

export default MyQRCode;
