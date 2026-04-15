import React, { useState } from 'react';
import { Form, Button } from 'antd';
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
  AdminOnlyBanner,
  toIsoBirthdate,
} from './RegisterBase';
import { Typography } from 'antd';

const { Title, Text } = Typography;

const RegisterTopManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user && user.subRole === 'superadmin';

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/top-management', {
        firstName: values.firstName,
        surname: values.surname,
        birthdate: toIsoBirthdate(values.birthdate),
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
          <div className="emoji">🏢</div>
          <Title level={2} className="reg-title">
            Top Management Registration
          </Title>
          <Text className="subtitle">Superadmin-Only Registration</Text>
        </RegisterHeader>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          {!isAdmin && <AdminOnlyBanner />}
          <StatusAlerts success={success} error={error} />

          {success ? (
            <Button type="primary" block onClick={() => navigate('/auth/top-management/login')}>
              Go to Login
            </Button>
          ) : !isAdmin ? (
            <Button type="primary" block onClick={() => navigate('/auth/top-management/login')}>
              Go to Login
            </Button>
          ) : (
            <>
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
                  Register Top Management
                </Button>
              </Form.Item>

              <FooterLink>
                <a onClick={() => navigate('/auth/top-management/login')}>← Back to Login</a>
              </FooterLink>
            </>
          )}
        </StyledForm>
      </GlassCard>
    </RegisterContainer>
  );
};

export default RegisterTopManagement;
