import { Form, Input, Button, Card, message, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { login as apiLogin } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: 
    linear-gradient(
      rgba(255, 77, 79, 0.80),
      rgba(255, 77, 79, 0.80)
    ),
    url("/images/tup-bg.png");
  background-size: cover;
  background-position: center;
  padding: 20px;
`;

const StyledCard = styled(Card)`
  position: relative;
  width: 100%;
  max-width: 420px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.3);
  border: none;
  overflow: hidden;

  /* Gradient glow border illusion */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1.5px;
    border-radius: 24px;
    background: linear-gradient(135deg, #ff4d4f, #ff7875);
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  .ant-card-body {
    padding: 44px 38px;
  }

  @media (max-width: 480px) {
    .ant-card-body {
      padding: 32px 24px;
    }
  }
`;


const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;

  .emoji {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .subtitle {
    display: block;
    margin-top: 6px;
    font-size: 14px;
    opacity: 0.8;
  }

  .divider {
    width: 48px;
    height: 4px;
    margin: 16px auto 0;
    border-radius: 4px;
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
  }
`;


const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 22px;
  }

  .ant-input-affix-wrapper {
    height: 50px;
    border-radius: 12px;
    border: 1px solid transparent;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
    transition: all 0.25s ease;

    &:hover {
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
    }

    &.ant-input-affix-wrapper-focused {
      border-color: #ff4d4f;
      box-shadow: 0 0 0 4px rgba(255, 77, 79, 0.2);
    }
  }

  .ant-btn-primary {
    height: 52px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.3px;
    background: linear-gradient(135deg, #ff4d4f, #ff7875);
    border: none;
    box-shadow: 0 12px 24px rgba(255, 77, 79, 0.45);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 32px rgba(255, 77, 79, 0.6);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 8px 18px rgba(255, 77, 79, 0.4);
    }
  }
`;


const RegisterLink = styled(Button)`
  display: block;
  margin: 18px auto 0;
  font-weight: 500;
  font-size: 14px;
  color: #ff4d4f;

  &:hover {
    color: #d9363e;
    text-decoration: underline;
  }
`;


const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: any) => {
    try {
      const response = await apiLogin(values.email, values.password);
      login(response.token, response.user);
      message.success("Welcome back!");
      const isTUP = response.user.role === "TUP";
      navigate(isTUP ? "/dashboard" : "/profile");
    } catch {
      message.error("Invalid email or password");
    }
  };

  return (
    <Container>
      <StyledCard>
        <Header>
  <div className="emoji">🫆</div>
  <Title level={2} style={{ marginBottom: 0 }}>
    Welcome to TUP-VMS
  </Title>
  <Text className="subtitle">
    Sign in to continue exploring us!
  </Text>
  <div className="divider" />
</Header>


        <StyledForm layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="email"
            rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email address"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Sign In
            </Button>
          </Form.Item>
        </StyledForm>

        <RegisterLink type="link" onClick={() => navigate("/register")}>
          Don’t have an account? Create one
        </RegisterLink>
      </StyledCard>
    </Container>
  );
};

export default Login;
