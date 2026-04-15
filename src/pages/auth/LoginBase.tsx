import { Form, Input, Button, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MailOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { login as apiLogin } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getDefaultRouteForUser } from '../../config/rolePages';

const { Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(255, 117, 151, 0.6), rgba(220, 20, 60, 0.6)),
    url("/images/tup-bg.png");
  background-size: cover;
  background-position: center;
  padding: 16px;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

  @media (max-width: 500px) {
    padding: 22px 18px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 28px;
  color: white;

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.24);
    margin-bottom: 14px;
    font-size: 22px;
  }

  .logo-text {
    font-size: clamp(28px, 5vw, 40px);
    font-weight: 800;
    margin-bottom: 8px;
    letter-spacing: -1px;
  }

  .subtitle {
    font-size: 15px;
    opacity: 0.86;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  .ant-form-item-explain-error {
    color: #ffd9df !important;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }

  .ant-input-affix-wrapper {
    height: 52px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15) !important;
    transition: all 0.3s;
    padding: 0 16px;

    .anticon {
      color: rgba(255, 255, 255, 0.6);
    }

    input {
      font-size: 15px;
      color: white;
      background: transparent !important;

      &::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      caret-color: white;
    }

    &:hover {
      border-color: #dc143c;
    }

    &.ant-input-affix-wrapper-focused {
      border-color: #dc143c;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.2);
    }
  }

  .ant-input,
  .ant-input-password {
    background: transparent !important;
    color: #fff !important;
    caret-color: #fff !important;
  }

  .ant-input-affix-wrapper input,
  .ant-input {
    color: #fff !important;
    caret-color: #fff !important;
    -webkit-text-fill-color: #fff !important;
  }

  .ant-input-affix-wrapper-focused,
  .ant-input:focus,
  .ant-input-focused {
    background: rgba(255, 255, 255, 0.2) !important;
    border-color: #dc143c !important;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active,
  .ant-input-affix-wrapper input:-webkit-autofill,
  .ant-input-affix-wrapper input:-webkit-autofill:hover,
  .ant-input-affix-wrapper input:-webkit-autofill:focus,
  .ant-input-affix-wrapper input:-webkit-autofill:active {
    -webkit-text-fill-color: #fff !important;
    box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.12) inset !important;
    -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.12) inset !important;
    transition: background-color 9999s ease-in-out 0s;
  }

  .ant-btn-primary {
    height: 54px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    background: #8b0000;
    border: none;
    transition: all 0.3s;

    &:hover {
      background: #dc143c;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 0, 0, 0.4);
    }
  }
`;

const Footer = styled.div`
  margin-top: 24px;
  text-align: center;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);

  a {
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

type LoginBaseProps = {
  badge: string;
  title: string;
  subtitle: string;
  registerPath: string;
};

const LoginBase = ({ badge, title, subtitle, registerPath }: LoginBaseProps) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (rawValues: unknown) => {
    const values = rawValues as { email: string; password: string };
    try {
      const response = await apiLogin(values.email, values.password);
      login(response.token, response.user);
      message.success('Welcome back!');
      navigate(getDefaultRouteForUser(response.user));
    } catch {
      message.error('Invalid email or password');
    }
  };

  return (
    <Container>
      <FormContainer>
        <Header>
          <div className="badge">{badge}</div>
          <div className="logo-text">{title}</div>
          <div className="subtitle">{subtitle}</div>
        </Header>

        <StyledForm layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="you@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Sign In <ArrowRightOutlined />
            </Button>
          </Form.Item>
        </StyledForm>

        <Footer>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Don&apos;t have an account?{' '}
          </Text>
          <a onClick={() => navigate(registerPath)}>Register here</a>
        </Footer>
      </FormContainer>
    </Container>
  );
};

export default LoginBase;
