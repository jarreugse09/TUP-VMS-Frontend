import { Form, Input, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  MailOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { login as apiLogin } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(128, 0, 32, 0.6), rgba(220, 20, 60, 0.6)),
    url("/images/tup-bg.png");
  background-size: cover;
  background-position: center;
  padding: 24px;
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);

  @media (max-width: 500px) {
    padding: 40px 30px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  color: white;

  .logo-text {
    font-size: 42px;
    font-weight: 800;
    margin-bottom: 8px;
    letter-spacing: -1px;
  }

  .subtitle {
    font-size: 16px;
    opacity: 0.8;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  .ant-input-affix-wrapper {
    height: 52px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
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

  /* Prevent white background on focus/autofill */
  .ant-input,
  .ant-input-password {
    background: transparent !important;
    color: white;
    caret-color: white;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:focus {
    -webkit-text-fill-color: white;
    transition:
      background-color 600000s 0s,
      color 600000s 0s;
    box-shadow: 0 0 0px 1000px rgba(255, 255, 255, 0.1) inset;
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
    color: #ff6b6b;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
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
      <FormContainer>
        <Header>
          <div className="logo-text">TUP VMS</div>
          <div className="subtitle">Sign in to access the portal</div>
        </Header>

        <StyledForm layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
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
            rules={[{ required: true, message: "Please enter your password" }]}
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
          Don't have an account?{" "}
          <a onClick={() => navigate("/register")}>Register here</a>
        </Footer>
      </FormContainer>
    </Container>
  );
};

export default Login;
