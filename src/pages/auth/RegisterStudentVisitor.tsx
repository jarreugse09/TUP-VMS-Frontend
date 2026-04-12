import React, { useState } from 'react';
import { Form, Button, Radio, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
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

const RegisterStudentVisitor: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/student-visitor', {
        name: values.name,
        email: values.email,
        password: values.password,
        consentGiven: values.consentGiven,
        role: values.role,
      });
      setSuccess(true);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterContainer>
      <GlassCard>
        <RegisterHeader>
          <div className="emoji">🎓</div>
          <Title level={2} className="reg-title">
            Student / Visitor Registration
          </Title>
          <Text className="subtitle">Create your TUP VMS account</Text>
        </RegisterHeader>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          <StatusAlerts success={success} error={error} />

          {success ? (
            <Button type="primary" block onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          ) : (
            <>
              <BaseNameFields />

              <Form.Item
                label="Account Type"
                name="role"
                rules={[{ required: true, message: 'Select account type' }]}
              >
                <Radio.Group id="reg-role">
                  <Space direction="horizontal" wrap>
                    <Radio value="Student" style={{ color: '#fff' }}>
                      Student
                    </Radio>
                    <Radio value="Visitor" style={{ color: '#fff' }}>
                      Visitor
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
                  Create Account
                </Button>
              </Form.Item>

              <FooterLink>
                <a onClick={() => navigate('/login')}>
                  Already have an account? Sign in
                </a>
              </FooterLink>
            </>
          )}
        </StyledForm>
      </GlassCard>
    </RegisterContainer>
  );
};

export default RegisterStudentVisitor;
