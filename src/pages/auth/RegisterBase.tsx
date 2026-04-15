import React from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Checkbox,
  Alert,
  DatePicker,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const { Title, Text } = Typography;

/* ================= STYLES ================= */

export const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(255, 117, 151, 0.6), rgba(220, 20, 60, 0.7)),
    url('/images/tup-bg.png');
  background-size: cover;
  background-position: center;
  padding: 24px;
  overflow: hidden;
`;

export const GlassCard = styled(Card)`
  width: 100%;
  max-width: 760px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);

  .ant-card-body {
    padding: 40px;
  }

  @media (max-width: 540px) {
    .ant-card-body {
      padding: 28px 22px;
    }
  }
`;

export const RegisterHeader = styled.div`
  text-align: center;
  margin-bottom: 28px;
  color: #fff;

  .emoji {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .reg-title {
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
    color: #fff !important;
  }

  .subtitle {
    opacity: 0.8;
    color: #fff;
  }
`;

export const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }

  .ant-form-item-explain-error {
    color: #ffd9df !important;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }

  .ant-input,
  .ant-picker,
  .ant-select-selector,
  .ant-input-affix-wrapper {
    height: 48px !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.12) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: #fff !important;
  }

  .ant-select-arrow,
  .ant-picker-suffix,
  .ant-select-selection-item {
    color: #fff !important;
  }

  .ant-input,
  .ant-input-password,
  .ant-input-affix-wrapper {
    background: transparent !important;
    color: #fff !important;
    caret-color: #fff !important;
  }

  .ant-input-affix-wrapper input {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    color: #fff !important;
    caret-color: #fff !important;
    -webkit-text-fill-color: #fff !important;
  }

  .ant-input-affix-wrapper-focused,
  .ant-input:focus,
  .ant-input-focused,
  .ant-select-focused .ant-select-selector {
    background: rgba(255, 255, 255, 0.18) !important;
    border-color: #dc143c !important;
    box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.2) !important;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.55) !important;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active,
  .ant-input-affix-wrapper input:-webkit-autofill {
    -webkit-text-fill-color: #fff !important;
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.12) inset !important;
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.12) inset !important;
    transition: background-color 9999s ease-in-out 0s;
  }

  .ant-btn-primary {
    height: 52px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 16px;
    background: linear-gradient(135deg, #8b0000, #dc143c);
    border: none;
    box-shadow: 0 12px 32px rgba(139, 0, 0, 0.45);
  }

  .ant-checkbox {
    .ant-checkbox-inner {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.4);
    }
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background: #dc143c;
    border-color: #dc143c;
  }

  .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.9) !important;
  }
`;

export const FooterLink = styled.div`
  margin-top: 18px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);

  a {
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }
`;

export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

/* ================= PASSWORD FIELDS ================= */

interface PasswordFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
}

export const PasswordFields: React.FC<PasswordFieldsProps> = () => (
  <TwoCol>
    <Form.Item
      label="Password"
      name="password"
      rules={[{ required: true, min: 8, message: 'Min 8 characters' }]}
    >
      <Input.Password placeholder="Password" id="reg-password" />
    </Form.Item>
    <Form.Item
      label="Confirm Password"
      name="confirmPassword"
      dependencies={['password']}
      rules={[
        { required: true, message: 'Confirm your password' },
        ({ getFieldValue }) => ({
          validator(_, value) {
            if (!value || getFieldValue('password') === value) {
              return Promise.resolve();
            }
            return Promise.reject('Passwords do not match');
          },
        }),
      ]}
    >
      <Input.Password placeholder="Confirm Password" id="reg-confirm-password" />
    </Form.Item>
  </TwoCol>
);

/* ================= BASE FIELDS ================= */

export const BaseNameFields: React.FC = () => (
  <>
    <TwoCol>
      <Form.Item
        label="First Name"
        name="firstName"
        rules={[{ required: true, message: 'First name is required' }]}
      >
        <Input placeholder="First name" id="reg-first-name" />
      </Form.Item>
      <Form.Item
        label="Surname"
        name="surname"
        rules={[{ required: true, message: 'Surname is required' }]}
      >
        <Input placeholder="Surname" id="reg-surname" />
      </Form.Item>
    </TwoCol>
    <TwoCol>
      <Form.Item
        label="Birthdate"
        name="birthdate"
        rules={[{ required: true, message: 'Birthdate is required' }]}
      >
        <DatePicker
          placeholder="MM/DD/YYYY"
          format="MM/DD/YYYY"
          style={{ width: '100%' }}
          id="reg-birthdate"
        />
      </Form.Item>
      <Form.Item
        label="Email Address"
        name="email"
        rules={[
          { required: true, type: 'email', message: 'Valid email is required' },
        ]}
      >
        <Input placeholder="you@tup.edu.ph" id="reg-email" />
      </Form.Item>
    </TwoCol>
  </>
);

export const toIsoBirthdate = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    'toISOString' in value &&
    typeof value.toISOString === 'function'
  ) {
    return value.toISOString();
  }

  return '';
};

/* ================= CONSENT CHECKBOX ================= */

export const ConsentCheckbox: React.FC = () => (
  <Form.Item
    name="consentGiven"
    valuePropName="checked"
    rules={[
      {
        validator: (_, value) =>
          value
            ? Promise.resolve()
            : Promise.reject('You must agree to the Privacy Notice to continue'),
      },
    ]}
  >
    <Checkbox style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
      I have read and agree to the{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer">
        Privacy Notice
      </a>{' '}
      in compliance with Republic Act No. 10173 (Data Privacy Act).
    </Checkbox>
  </Form.Item>
);

/* ================= SUCCESS / ERROR ALERTS ================= */

interface StatusAlertsProps {
  success: boolean;
  error: string | null;
}

export const StatusAlerts: React.FC<StatusAlertsProps> = ({
  success,
  error,
}) => (
  <>
    {success && (
      <Alert
        type="success"
        message="Account created successfully!"
        description="You may now log in with your credentials."
        showIcon
        style={{ marginBottom: 16, borderRadius: 10 }}
      />
    )}
    {error && (
      <Alert
        type="error"
        message="Registration failed"
        description={error}
        showIcon
        style={{ marginBottom: 16, borderRadius: 10 }}
      />
    )}
  </>
);

/* ================= ADMIN GUARD BANNER ================= */

export const AdminOnlyBanner: React.FC = () => (
  <Alert
    type="warning"
    showIcon
    message="Access Restricted"
    description="This registration page is for authorized administrators only. Unauthorized access attempts are logged."
    style={{ marginBottom: 20, borderRadius: 10 }}
  />
);

/* ================= EXPORTS ================= */
export { Title, Text, Form, Input, Button, useNavigate };
