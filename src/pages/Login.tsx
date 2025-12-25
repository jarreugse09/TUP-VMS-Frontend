import { Form, Input, Button, Card, message } from "antd";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { login as apiLogin } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);

  .ant-card-head {
    border-bottom: none;
    text-align: center;
  }

  .ant-card-head-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .ant-card-body {
    padding: 32px;
  }

  @media (max-width: 480px) {
    max-width: 90%;
    .ant-card-body {
      padding: 24px;
    }
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 20px;
  }

  .ant-input-affix-wrapper {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .ant-btn {
    height: 48px;
    border-radius: 8px;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
  }
`;

const RegisterLink = styled(Button)`
  display: block;
  margin: 0 auto;
  color: #667eea;
  font-weight: 500;

  &:hover {
    color: #764ba2;
  }
`;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: any) => {
    try {
      const response = await apiLogin(values.email, values.password);
      login(response.token, response.user);
      message.success("Login successful");
      const isTUP = response.user.role === "TUP";
      navigate(isTUP ? "/dashboard" : "/profile");
    } catch (error) {
      message.error("Login failed");
    }
  };

  return (
    <Container>
      <StyledCard title="Welcome Back">
        <StyledForm onFinish={onFinish}>
          <Form.Item name="email" rules={[{ required: true, type: "email" }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Login
            </Button>
          </Form.Item>
        </StyledForm>
        <RegisterLink type="link" onClick={() => navigate("/register")}>
          Don't have an account? Register here
        </RegisterLink>
      </StyledCard>
    </Container>
  );
};

export default Login;
