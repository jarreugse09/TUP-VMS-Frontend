import React, { useState } from 'react';
import { Button, Card, Checkbox, Typography, Space, Divider, message } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const { Title, Paragraph, Text, Link } = Typography;

/**
 * ConsentRequired page — DPA 2012 Phase 5C
 * Displayed to any authenticated user whose consentGiven === false.
 * User must tick the checkbox and click Agree before accessing the system.
 */
const ConsentRequired: React.FC = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConsent = async () => {
    if (!agreed) {
      message.warning('Please tick the checkbox to confirm your consent.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put('/users/me/consent');

      // Update local user state so needsConsent becomes false immediately
      updateUser({ consentGiven: true, consentDate: res.data.user?.consentDate });
      message.success('Consent recorded. Welcome to TUP VMS.');
      navigate('/', { replace: true });
    } catch (err) {
      message.error('Failed to record consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{ maxWidth: 680, width: '100%', borderRadius: 16 }}
        styles={{ body: { padding: 40 } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space align="center">
            <SafetyCertificateOutlined style={{ fontSize: 36, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Privacy Notice & Consent
            </Title>
          </Space>

          <Paragraph>
            Pursuant to the <Text strong>Data Privacy Act of 2012 (Republic Act No. 10173)</Text>,
            Technological University of the Philippines collects and processes your personal
            information for the following purposes:
          </Paragraph>

          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>Identity verification and campus access management</li>
            <li>Attendance monitoring and payroll processing</li>
            <li>Security incident response and audit trail maintenance</li>
            <li>Communication between authorized university personnel</li>
          </ul>

          <Paragraph>
            Your data will be retained for a maximum of <Text strong>5 years</Text> in accordance
            with NPC Circular 2022-03, after which it will be securely anonymized or deleted.
            You have the right to access, correct, and request the erasure of your personal data
            by contacting the University Data Protection Officer (DPO).
          </Paragraph>

          <Paragraph>
            For questions, contact the TUP DPO at{' '}
            <Link href="mailto:dpo@tup.edu.ph">dpo@tup.edu.ph</Link>.
          </Paragraph>

          <Divider />

          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          >
            I have read and understood the Privacy Notice above and I freely give my consent
            to the collection and processing of my personal data for the stated purposes.
          </Checkbox>

          <Button
            type="primary"
            size="large"
            block
            loading={submitting}
            disabled={!agreed}
            onClick={handleConsent}
          >
            I Agree — Continue to TUP VMS
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default ConsentRequired;
