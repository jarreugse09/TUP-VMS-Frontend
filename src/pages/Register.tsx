import { Form, Input, Button, Card, Select, DatePicker, message } from "antd";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { useRef, useState } from "react";
import {
  register as apiRegister,
  login as apiLogin,
} from "../services/authService";
import { useAuth } from "../contexts/AuthContext";

const { Option } = Select;

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const [photoURL, setPhotoURL] = useState("");

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhotoURL(imageSrc);
    }
  };

  const onFinish = async (values: any) => {
    if (!photoURL) {
      message.error("Please capture a photo");
      return;
    }

    try {
      await apiRegister({
        ...values,
        photoURL,
      });
      // After register, login automatically
      const loginResponse = await apiLogin(values.email, values.password);
      login(loginResponse.token, loginResponse.user);
      message.success("Registration successful");
      const isTUP = loginResponse.user.role === "TUP";
      navigate(isTUP ? "/dashboard" : "/profile");
    } catch (error) {
      message.error("Registration failed");
    }
  };

  return (
    <Card title="Register" style={{ maxWidth: 600, margin: "50px auto" }}>
      <Form onFinish={onFinish}>
        <Form.Item name="firstName" rules={[{ required: true }]}>
          <Input placeholder="First Name" />
        </Form.Item>
        <Form.Item name="surname" rules={[{ required: true }]}>
          <Input placeholder="Surname" />
        </Form.Item>
        <Form.Item name="birthdate" rules={[{ required: true }]}>
          <DatePicker placeholder="Birthdate" />
        </Form.Item>
        <Form.Item name="role" rules={[{ required: true }]}>
          <Select placeholder="Role">
            <Option value="Staff">Staff</Option>
            <Option value="Student">Student</Option>
            <Option value="Visitor">Visitor</Option>
          </Select>
        </Form.Item>
        <Form.Item name="staffType">
          <Select placeholder="Staff Type">
            <Option value="Registrar">Registrar</Option>
            <Option value="Faculty">Faculty</Option>
            <Option value="Admin">Admin</Option>
            <Option value="Security">Security</Option>
          </Select>
        </Form.Item>
        <Form.Item name="email" rules={[{ required: true, type: "email" }]}>
          <Input placeholder="Email" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item name="confirmPassword" rules={[{ required: true }]}>
          <Input.Password placeholder="Confirm Password" />
        </Form.Item>
        <div style={{ marginBottom: 16 }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={320}
            height={240}
          />
          <Button onClick={capture} style={{ marginTop: 8 }}>
            Capture Photo
          </Button>
          {photoURL && (
            <img
              src={photoURL}
              alt="Captured"
              style={{ marginTop: 8, maxWidth: 200 }}
            />
          )}
        </div>
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            Register
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Register;
