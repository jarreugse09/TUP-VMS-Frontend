import {
  Form,
  Input,
  Button,
  Card,
  Select,
  DatePicker,
  message,
  Typography,
  Steps,
  Row,
  Col,
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

const { Step } = Steps;

const { Option } = Select;
const { Title, Text } = Typography;

/* ================= STYLES ================= */

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(135deg, rgba(255, 117, 151, 0.6), rgba(220, 20, 60, 0.7)),
    url("/images/tup-bg.png");
  background-size: cover;
  background-position: center;
  padding: 24px;
  overflow: hidden;
`;

const GlassCard = styled(Card)`
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

const Header = styled.div`
  text-align: center;
  margin-bottom: 28px;
  color: #fff;

  .emoji {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .title {
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .subtitle {
    opacity: 0.8;
  }
`;

const StyledForm = styled(Form)`
  .ant-form-item-label > label {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }

  .ant-input,
  .ant-picker,
  .ant-select-selector,
  .ant-input-affix-wrapper {
    height: 48px !important;
    border-radius: 12px !important;
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: #fff;
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
    color: #fff;
    caret-color: #fff;
  }

  .ant-input-affix-wrapper input {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  input::placeholder {
    color: rgba(255, 255, 255, 0.55) !important;
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

  .ant-btn-default {
    border-radius: 12px;
  }
`;

const CameraBox = styled.div`
  margin-top: 8px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.35);
  text-align: center;
  color: #fff;

  video {
    border-radius: 12px;
    margin-top: 12px;
  }

  img {
    margin-top: 12px;
    max-width: 160px;
    border-radius: 12px;
    border: 2px solid #dc143c;
  }
`;

const StepsWrap = styled.div`
  margin-bottom: 28px;

  .ant-steps-item-title,
  .ant-steps-item-description {
    color: #fff;
  }

  .ant-steps-item-process .ant-steps-item-icon {
    background: #dc143c;
    border-color: #dc143c;
  }

  .ant-steps-item-icon {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.35);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;

  .flex-1 {
    flex: 1;
  }
`;

const FooterLink = styled.div`
  margin-top: 18px;
  text-align: center;
  color: #ffffff;

  button {
    color: #ffffff;

  }a {
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
`;

/* ================= COMPONENT ================= */

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const webcamRef = useRef<Webcam>(null);

  const [form] = Form.useForm();

  const stepsConfig = [
    {
      key: "profile",
      title: "Profile",
      description: "Your basic info",
      fields: ["firstName", "surname", "birthdate"],
    },
    {
      key: "access",
      title: "Access",
      description: "Role & contact",
      fields: ["email", "role", "staffType", "customQR"],
    },
    {
      key: "security",
      title: "Security",
      description: "Password & photo",
      fields: ["password", "confirmPassword", "photoURL"],
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

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
      const birthdateISO = values.birthdate?.toDate
        ? values.birthdate.toDate().toISOString()
        : (values.birthdate?.toISOString?.() ?? values.birthdate);

      const payload = {
        firstName: values.firstName?.trim(),
        surname: values.surname?.trim(),
        birthdate: birthdateISO,
        role: values.role,
        staffType: values.role === "Staff" ? values.staffType : undefined,
        email: values.email?.trim().toLowerCase(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        photoURL,
        customQR: values.customQR || undefined, // 👈 OPTIONAL QR
      };

      console.log("Register payload", payload);

      await apiRegister(payload);

      const loginResponse = await apiLogin(values.email, values.password);
      login(loginResponse.token, loginResponse.user);

      message.success("Account created successfully 🎉");

      navigate(loginResponse.user.role === "TUP" ? "/dashboard" : "/profile");
    } catch (error: any) {
      const apiErrors = error?.response?.data?.errors;
      const apiMessage = error?.response?.data?.message || apiErrors?.[0]?.msg;
      if (apiErrors?.length) {
        console.error("Register validation errors:", apiErrors);
        message.error(apiErrors.map((e: any) => e.msg).join(" | "));
      } else {
        message.error(apiMessage || "Registration failed");
      }
    }
  };

  const handleNext = async () => {
    const fields = stepsConfig[currentStep].fields;
    await form.validateFields(fields);
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => setCurrentStep((prev) => prev - 1);

  return (
    <Container>
      <GlassCard>
        <Header>
          <div className="emoji">🫆</div>
          <Title level={2} className="title" style={{ color: "#fff" }}>
            Create Your Account
          </Title>
          <Text className="subtitle">Step into the TUP VMS portal</Text>
        </Header>
        <StepsWrap>
          <Steps current={currentStep} responsive>
            {stepsConfig.map((step) => (
              <Step
                key={step.key}
                title={step.title}
                description={step.description}
              />
            ))}
          </Steps>
        </StepsWrap>

        <StyledForm layout="vertical" form={form} onFinish={onFinish}>
          <div style={{ display: currentStep === 0 ? "block" : "none" }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="First Name"
                  name="firstName"
                  rules={[
                    { required: true, message: "First name is required" },
                  ]}
                >
                  <Input placeholder="First Name" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label="Surname"
                  name="surname"
                  rules={[{ required: true, message: "Surname is required" }]}
                >
                  <Input placeholder="Surname" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Birthdate"
              name="birthdate"
              rules={[{ required: true, message: "Birthdate is required" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                placeholder="MM/DD/YYYY"
                format="MM/DD/YYYY"
                allowClear
                inputReadOnly={false}
              />
            </Form.Item>
          </div>

          <div style={{ display: currentStep === 1 ? "block" : "none" }}>
            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: "Valid email is required",
                },
              ]}
            >
              <Input placeholder="you@example.com" />
            </Form.Item>

            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Role is required" }]}
            >
              <Select placeholder="Select Role" onChange={setRole}>
                <Option value="Staff">Staff</Option>
                <Option value="Student">Student</Option>
                <Option value="Visitor">Visitor</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Staff Type"
              name="staffType"
              rules={[
                {
                  required: role === "Staff",
                  message: "Staff type is required",
                },
              ]}
              hidden={role !== "Staff"}
            >
              <Select placeholder="Staff Type">
                <Option value="Registrar">Registrar</Option>
                <Option value="Faculty">Faculty</Option>
                <Option value="Admin">Admin</Option>
                <Option value="Security">Security</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Custom QR (optional)"
              name="customQR"
              tooltip="Provide your own QR string (subject to admin approval)"
            >
              <Input placeholder="Enter your own QR string (optional)" />
            </Form.Item>
          </div>

          <div style={{ display: currentStep === 2 ? "block" : "none" }}>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, min: 6, message: "At least 6 characters" },
              ]}
            >
              <Input.Password placeholder="Password" />
            </Form.Item>

            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              rules={[{ required: true, message: "Please confirm password" }]}
            >
              <Input.Password placeholder="Confirm Password" />
            </Form.Item>

            <CameraBox>
              <Text strong>Identity Verification</Text>
              <div style={{ marginBottom: 8, opacity: 0.8 }}>
                Capture a clear photo for confirmation
              </div>
              <div>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width={260}
                />
              </div>
              <Button onClick={capture} style={{ marginTop: 12 }}>
                Capture Photo
              </Button>

              {photoURL && (
                <div className="preview">
                  <Text
                    type="secondary"
                    style={{ color: "#fff", display: "block", marginTop: 10 }}
                  >
                    Preview
                  </Text>
                  <img src={photoURL} alt="Captured" />
                </div>
              )}
            </CameraBox>
          </div>

          <Actions>
            {currentStep > 0 && <Button onClick={handlePrev}>Back</Button>}

            {currentStep < stepsConfig.length - 1 && (
              <Button type="primary" onClick={handleNext} className="flex-1">
                Next
              </Button>
            )}

            {currentStep === stepsConfig.length - 1 && (
              <Button type="primary" htmlType="submit" block>
                Create Account
              </Button>
            )}
          </Actions>

          <FooterLink>
            <a type="link" onClick={() => navigate("/login")}>
              Already have an account? Sign in
            </a>
          </FooterLink>
        </StyledForm>
      </GlassCard>
    </Container>
  );
};

export default Register;
