import React, { useState } from 'react';
import { Form, Button, Radio, Space } from 'antd';
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

const RegisterHR: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin =
    user &&
    (user.subRole === 'superadmin' || user.subRole === 'hr_head');

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/hr', {
        firstName: values.firstName,
        surname: values.surname,
        birthdate: toIsoBirthdate(values.birthdate),
        email: values.email,
        password: values.password,
        consentGiven: values.consentGiven,
        subRole: values.subRole,
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
          <div className="emoji">👤</div>
          <Title level={2} className="reg-title">
            HR Staff Registration
          </Title>
          <Text className="subtitle">Admin-Only Registration</Text>
        </RegisterHeader>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          {!isAdmin && <AdminOnlyBanner />}
          <StatusAlerts success={success} error={error} />

          {success ? (
            <Button type="primary" block onClick={() => navigate('/auth/hr/login')}>
              Go to Login
            </Button>
          ) : !isAdmin ? (
            <Button type="primary" block onClick={() => navigate('/auth/hr/login')}>
              Go to Login
            </Button>
          ) : (
            <>
              <BaseNameFields />

              <Form.Item
                label="HR Role"
                name="subRole"
                rules={[{ required: true, message: 'Select HR role' }]}
              >
                <Radio.Group id="reg-subrole">
                  <Space direction="horizontal" wrap>
                    <Radio value="hr_head" style={{ color: '#fff' }}>
                      HR Head
                    </Radio>
                    <Radio value="hr_staff" style={{ color: '#fff' }}>
                      HR Staff
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

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
                  Register HR Account
                </Button>
              </Form.Item>

              <FooterLink>
                <a onClick={() => navigate('/auth/hr/login')}>← Back to Login</a>
              </FooterLink>
            </>
          )}
        </StyledForm>
      </GlassCard>
    </RegisterContainer>
  );
};

export default RegisterHR;
