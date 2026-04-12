import React, { useState } from 'react';
import { Form, Button, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  RegisterContainer,
  GlassCard,
  RegisterHeader,
  StyledForm,
  FooterLink,
  PasswordFields,
  BaseNameFields,
  ConsentCheckbox,
  StatusAlerts,
} from './RegisterBase';
import { Typography } from 'antd';

const { Title, Text } = Typography;

const RegisterSuperadmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Either superadmin OR unauthenticated (bootstrap mode — backend decides)
  const isAllowed = !user || user.subRole === 'superadmin';

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/superadmin', {
        name: values.name,
        email: values.email,
        password: values.password,
        consentGiven: values.consentGiven,
      });
      setSuccess(true);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <GlassCard>
        <RegisterHeader>
          <div className="emoji">🔐</div>
          <Title level={2} className="reg-title">
            Superadmin Registration
          </Title>
          <Text className="subtitle">
            {!user ? 'First-Time Bootstrap Mode' : 'Superadmin-Only Registration'}
          </Text>
        </RegisterHeader>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          {!isAllowed && (
            <Alert
              type="error"
              showIcon
              message="Access Denied"
              description="This registration page is strictly reserved for system administrators."
              style={{ marginBottom: 20, borderRadius: 10 }}
            />
          )}
          <StatusAlerts success={success} error={error} />

          {success ? (
            <Button type="primary" block onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          ) : !isAllowed ? (
            <Button type="primary" block onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          ) : (
            <>
              {!user && (
                <Alert
                  type="info"
                  showIcon
                  message="Bootstrap Mode"
                  description="No superadmin exists yet. Create the first superadmin account."
                  style={{ marginBottom: 16, borderRadius: 10 }}
                />
              )}
              <BaseNameFields />
              <PasswordFields form={form} />
              <ConsentCheckbox />

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  id="reg-submit"
                >
                  Create Superadmin Account
                </Button>
              </Form.Item>

              <FooterLink>
                <a onClick={() => navigate('/login')}>← Back to Login</a>
              </FooterLink>
            </>
          )}
        </StyledForm>
      </GlassCard>
    </RegisterContainer>
  );
};

export default RegisterSuperadmin;
