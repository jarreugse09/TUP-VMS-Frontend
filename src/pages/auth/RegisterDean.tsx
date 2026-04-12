import React, { useState, useEffect } from 'react';
import { Form, Button, Select } from 'antd';
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
} from './RegisterBase';
import { Typography } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

interface CollegeOption { _id: string; name: string; }

const RegisterDean: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<CollegeOption[]>([]);

  const isAdmin = user && (user.subRole === 'superadmin' || user.subRole === 'hr_head');

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/colleges').then(r => setColleges(r.data || [])).catch(() => {});
  }, [isAdmin]);

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/dean', {
        name: values.name,
        email: values.email,
        password: values.password,
        consentGiven: values.consentGiven,
        collegeId: values.collegeId,
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
          <div className="emoji">🎓</div>
          <Title level={2} className="reg-title">
            Dean Registration
          </Title>
          <Text className="subtitle">Admin-Only Registration</Text>
        </RegisterHeader>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          {!isAdmin && <AdminOnlyBanner />}
          <StatusAlerts success={success} error={error} />

          {success ? (
            <Button type="primary" block onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          ) : !isAdmin ? (
            <Button type="primary" block onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          ) : (
            <>
              <BaseNameFields />

              <Form.Item
                label="College"
                name="collegeId"
                rules={[{ required: true, message: 'Select college' }]}
              >
                <Select placeholder="Select college" id="reg-college">
                  {colleges.map(c => (
                    <Option key={c._id} value={c._id}>{c.name}</Option>
                  ))}
                </Select>
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
                  Register Dean
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

export default RegisterDean;
