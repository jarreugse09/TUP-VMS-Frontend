import React, { useState, useEffect } from 'react';
import { Form, Button, Select } from 'antd';
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
const { Option } = Select;

interface CollegeOption {
  _id: string;
  name: string;
}

interface DepartmentOption {
  _id: string;
  name: string;
  collegeId: string;
}

const RegisterFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>('');

  useEffect(() => {
    api.get('/colleges').then(r => setColleges(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCollege) {
      api.get(`/departments?collegeId=${selectedCollege}`)
        .then(r => setDepartments(r.data || []))
        .catch(() => {});
    } else {
      setDepartments([]);
    }
    form.setFieldValue('departmentId', undefined);
  }, [selectedCollege, form]);

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as Record<string, unknown>;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/faculty', {
        name: values.name,
        email: values.email,
        password: values.password,
        consentGiven: values.consentGiven,
        collegeId: values.collegeId,
        departmentId: values.departmentId,
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
          <div className="emoji">🧑‍🏫</div>
          <Title level={2} className="reg-title">
            Faculty Registration
          </Title>
          <Text className="subtitle">TUP Faculty Self-Registration</Text>
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
                label="College"
                name="collegeId"
                rules={[{ required: true, message: 'Select your college' }]}
              >
                <Select
                  placeholder="Select college"
                  onChange={(v: string) => setSelectedCollege(v)}
                  id="reg-college"
                >
                  {colleges.map(c => (
                    <Option key={c._id} value={c._id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Department"
                name="departmentId"
                rules={[{ required: true, message: 'Select your department' }]}
              >
                <Select
                  placeholder={selectedCollege ? 'Select department' : 'Select a college first'}
                  disabled={!selectedCollege}
                  id="reg-department"
                >
                  {departments.map(d => (
                    <Option key={d._id} value={d._id}>{d.name}</Option>
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
                  Create Faculty Account
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

export default RegisterFaculty;
