import {
  Form,
  Input,
  Button,
  Card,
  Select,
  DatePicker,
  message,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { useRef, useState } from "react";
import styled from "styled-components";
import {
  register as apiRegister,
  login as apiLogin,
} from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { Row, Col } from "antd";


const { Option } = Select;
const { Title, Text } = Typography;


const Container = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    linear-gradient(rgba(255, 77, 79, 0.80), rgba(255, 77, 79, 0.80)),
    url("/images/tup-bg.png");
  background-size: cover;
  background-position: center;
  padding: 24px;
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 640px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
  border: none;

  .ant-card-body {
    padding: 40px;
  }

  @media (max-width: 480px) {
    .ant-card-body {
      padding: 28px 22px;
    }
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;

  .emoji {
    font-size: 36px;
    margin-bottom: 6px;
  }

  .divider {
    width: 50px;
    height: 4px;
    margin: 16px auto 0;
    border-radius: 4px;
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 20px;
  }

  .ant-input,
  .ant-input-password,
  .ant-picker,
  .ant-select-selector {
    height: 48px !important;
    border-radius: 12px !important;
  }

  .ant-btn-primary {
    height: 52px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 16px;
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
    }
  }
`;

const CameraBox = styled.div`
  margin-top: 24px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 77, 79, 0.06);
  border: 1px dashed rgba(255, 77, 79, 0.45);
  text-align: center;

  video {
    border-radius: 12px;
    margin-top: 12px;
  }

  img {
    margin-top: 12px;
    max-width: 160px;
    border-radius: 12px;
    border: 2px solid #ff4d4f;
  }
`;


const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const webcamRef = useRef<Webcam>(null);

  const [photoURL, setPhotoURL] = useState<string>("");
  const [role, setRole] = useState<string>("");

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setPhotoURL(imageSrc);
  };

  const onFinish = async (values: any) => {
    if (!photoURL) {
      message.error("Please capture your photo");
      return;
    }

    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    try {
      await apiRegister({
        ...values,
        photoURL,
      });

      const loginResponse = await apiLogin(values.email, values.password);
      login(loginResponse.token, loginResponse.user);

      message.success("Account created successfully 🎉");

      navigate(
        loginResponse.user.role === "TUP" ? "/dashboard" : "/profile"
      );
    } catch (error) {
      message.error("Registration failed");
    }
  };

  const LoginLink = styled(Button)`
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


  return (
    <Container>
      <StyledCard>
        <Header>
          <div className="emoji">🫆</div>
          <Title level={2}>Create Your Account</Title>
          <Text type="secondary">
            Join us and start your TUPian journey!
          </Text>
          <div className="divider" />
        </Header>

        <StyledForm layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
  <Col xs={24} sm={12}>
    <Form.Item
      name="firstName"
      rules={[{ required: true, message: "First name is required" }]}
    >
      <Input placeholder="First Name" />
    </Form.Item>
  </Col>

  <Col xs={24} sm={12}>
    <Form.Item
      name="surname"
      rules={[{ required: true, message: "Surname is required" }]}
    >
      <Input placeholder="Surname" />
    </Form.Item>
  </Col>
</Row>


          <Form.Item name="birthdate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} placeholder="Birthdate" />
          </Form.Item>

          <Form.Item name="email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="Email Address" />
          </Form.Item>

          <Form.Item name="role" rules={[{ required: true }]}>
            <Select placeholder="Select Role" onChange={setRole}>
              <Option value="Staff">Staff</Option>
              <Option value="Student">Student</Option>
              <Option value="Visitor">Visitor</Option>
            </Select>
          </Form.Item>

          {role === "Staff" && (
            <Form.Item name="staffType" rules={[{ required: true }]}>
              <Select placeholder="Staff Type">
                <Option value="Registrar">Registrar</Option>
                <Option value="Faculty">Faculty</Option>
                <Option value="Admin">Admin</Option>
                <Option value="Security">Security</Option>
              </Select>
            </Form.Item>
          )}

          

          <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item name="confirmPassword" rules={[{ required: true }]}>
            <Input.Password placeholder="Confirm Password" />
          </Form.Item>

          <CameraBox>
  <div className="camera-header">
  <Text strong className="camera-title">
    Identity Verification
  </Text>

  <Text type="secondary" className="camera-subtitle">
    Capture a clear photo for identity confirmation
  </Text>
</div>

  <div className="camera-content">
    <Webcam
      audio={false}
      ref={webcamRef}
      screenshotFormat="image/jpeg"
      width={260}
    />
  </div>

  <Button className="capture-btn" onClick={capture}>
    Capture Photo
  </Button>

  {photoURL && (
    <div className="preview">
      <Text type="secondary">Preview</Text>
      <img src={photoURL} alt="Captured" />
    </div>
  )}
</CameraBox>


          <Form.Item style={{ marginTop: 32 }}>
            <Button type="primary" htmlType="submit" block>
              Create Account
            </Button>
          </Form.Item>
          <LoginLink type="link" onClick={() => navigate("/login")}>
  Already have an account? Sign in
</LoginLink>

        </StyledForm>
      </StyledCard>
    </Container>
  );
};

export default Register;
