import {
  Card,
  Avatar,
  Descriptions,
  Button,
  QRCode,
  message,
  Tag,
  Space,
  Divider,
  Typography,
  Skeleton,
  Row,
  Col,
  Drawer,
  Modal,
  Form,
  Input,
  Upload,
  Radio,
} from "antd";
import {
  ReloadOutlined,
  UserOutlined,
  QrcodeOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import {
  getProfile,
  requestQRChange,
  requestProfilePhotoChange,
} from "../services/userService";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPhotoRequestModal, setShowPhotoRequestModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [photoRequestFile, setPhotoRequestFile] = useState<File | null>(null);
  const [photoInputMode, setPhotoInputMode] = useState<"upload" | "camera">(
    "upload",
  );
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoRequesting, setPhotoRequesting] = useState(false);
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const [form] = Form.useForm();
  const [photoForm] = Form.useForm();

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((track) => track.stop());
      photoStreamRef.current = null;
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
    } catch {
      message.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (
      !showPhotoRequestModal ||
      photoInputMode !== "camera" ||
      capturedPhoto
    ) {
      stopPhotoCamera();
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        photoStreamRef.current = stream;
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          await photoVideoRef.current.play();
        }
      } catch {
        message.error("Camera access is required to take a photo.");
        setPhotoInputMode("upload");
      }
    };

    startCamera();

    return () => {
      stopPhotoCamera();
    };
  }, [showPhotoRequestModal, photoInputMode, capturedPhoto]);

  const handleCapturePhoto = () => {
    if (!photoVideoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = photoVideoRef.current.videoWidth || 640;
    canvas.height = photoVideoRef.current.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(photoVideoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(photoDataUrl);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setPhotoRequestFile(file);
      },
      "image/jpeg",
      0.85,
    );
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    setPhotoRequestFile(null);
  };

  const handleRequestQRChange = () => {
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    try {
      const values = await form.validateFields();
      setRequesting(true);

      await requestQRChange({
        reason: values.reason,
        newQRString: values.newQRString || undefined,
        newQRImage: uploadingFile || null,
      });

      message.success("QR change request submitted");
      setShowRequestModal(false);
      form.resetFields();
      setUploadingFile(null);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error("Failed to request QR change");
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDownloadQR = async () => {
    const qrContainer = document.getElementById("qr-download-container");
    if (!qrContainer) {
      message.error("Failed to find QR code container");
      return;
    }

    try {
      const canvas = await html2canvas(qrContainer, { scale: 2, useCORS: true });
      const image = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = image;
      link.download = `${profile.user.firstName}_${profile.user.surname}_QR.png`;
      link.click();

      message.success("QR Code downloaded successfully!");
    } catch {
      message.error("Failed to download QR code");
    }
  };

  const handleSubmitPhotoRequest = async () => {
    try {
      const values = await photoForm.validateFields();
      if (!photoRequestFile) {
        message.error("Please upload your new profile photo");
        return;
      }

      setPhotoRequesting(true);
      await requestProfilePhotoChange({
        reason: values.reason,
        newPhotoImage: photoRequestFile,
      });

      message.success("Profile photo update request submitted for approval");
      setShowPhotoRequestModal(false);
      photoForm.resetFields();
      setPhotoRequestFile(null);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error("Failed to submit profile photo request");
      }
    } finally {
      setPhotoRequesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Row gutter={24}>
          <Col span={12}>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

const renderQRCard = () => (
  <Card
    variant="borderless"
    style={{
      borderRadius: 20,
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      textAlign: "center",
    }}
    title={
      <Space>
        <QrcodeOutlined style={{ color: "#DC143C" }} />
        <Text strong>Access Control</Text>
      </Space>
    }
  >
    {profile.qrCode ? (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px 0",
        }}
      >
        {/* QR CONTAINER */}
        <div
          id="qr-download-container"
          style={{
            padding: 20,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            marginBottom: 20,
            textAlign: "center",
          }}
        >

          {/* CENTERED QR */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <QRCode
              value={profile.qrCode.qrString}
              size={280}
              color="#000000ff"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Text type="secondary" style={{ display: "block" }}>
              Code
            </Text>
            <Text code style={{ fontSize: 16 }}>
              {profile.qrCode.qrString}
            </Text>
          </div>

          <Divider style={{ margin: "12px 0" }} />

          <Button
            type="primary"
            size="large"
            icon={<ReloadOutlined />}
            loading={requesting}
            onClick={handleRequestQRChange}
            style={{
              backgroundColor: "#DC143C",
              borderColor: "#DC143C",
              borderRadius: 8,
              height: 50,
              padding: "0 32px",
            }}
          >
            Request New QR Code
          </Button>

          <Button
            size="large"
            onClick={handleDownloadQR}
            style={{ borderRadius: 8, height: 50, padding: "0 32px" }}
          >
            Download QR Code
          </Button>
        </Space>
      </div>
    ) : (
      <Text type="secondary">No QR Code assigned.</Text>
    )}
  </Card>
);


  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 12 }}>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
            title={
              <Space>
                <IdcardOutlined style={{ color: "#DC143C" }} />
                <Text strong>Identification</Text>
              </Space>
            }
            extra={
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={fetchProfile}
                style={{ color: "#DC143C" }}
              />
            }
          >
            <div style={{ textAlign: "center", paddingBottom: 24 }}>
              <Avatar
                size={140}
                src={profile.user.photoURL}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              />

              <div style={{ marginBottom: 12 }}>
                <Button onClick={() => setShowPhotoRequestModal(true)}>
                  Request Profile Photo Update
                </Button>
              </div>

              <Title level={2}>
                {profile.user.firstName} {profile.user.surname}
              </Title>

              <Tag color="#DC143C">
                {profile.user.role.toUpperCase()}
              </Tag>
            </div>

            <Divider dashed />

            <Descriptions
              column={1}
              size="middle"
              styles={{ label: { color: "#8c8c8c" } }}
            >
              <Descriptions.Item label="Full Name">
                {profile.user.firstName} {profile.user.surname}
              </Descriptions.Item>

              <Descriptions.Item label="Account Status">
                <Tag
                  color={
                    profile.user.status === "Active" ? "green" : "gold"
                  }
                >
                  {profile.user.status}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Birthdate">
                {new Date(profile.user.birthdate).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={0} md={12}>{renderQRCard()}</Col>
      </Row>

      <Drawer
        title="Access Control"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width="90%"
      >
        {renderQRCard()}
      </Drawer>

      <Modal
        title="Request QR Change"
        open={showRequestModal}
        onCancel={() => setShowRequestModal(false)}
        onOk={handleSubmitRequest}
        confirmLoading={requesting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="newQRString" label="New QR String (optional)">
            <Input />
          </Form.Item>

          <Form.Item label="Upload QR Image (optional)">
            <Upload
              beforeUpload={(file) => {
                setUploadingFile(file);
                return false;
              }}
              maxCount={1}
            >
              <Button>Click to Upload</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Request Profile Photo Change"
        open={showPhotoRequestModal}
        onCancel={() => {
          stopPhotoCamera();
          setShowPhotoRequestModal(false);
          photoForm.resetFields();
          setPhotoRequestFile(null);
          setCapturedPhoto(null);
          setPhotoInputMode("upload");
        }}
        onOk={handleSubmitPhotoRequest}
        confirmLoading={photoRequesting}
      >
        <Form form={photoForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Photo Source" required>
            <Radio.Group
              value={photoInputMode}
              onChange={(e) => {
                const mode = e.target.value as "upload" | "camera";
                setPhotoInputMode(mode);
                setPhotoRequestFile(null);
                setCapturedPhoto(null);
              }}
            >
              <Radio.Button value="upload">Upload</Radio.Button>
              <Radio.Button value="camera">Take Photo</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {photoInputMode === "upload" ? (
            <Form.Item
              label="Upload New Profile Photo"
              required
              tooltip="This request requires admin approval before your profile photo is updated."
            >
              <Upload
                beforeUpload={(file) => {
                  setPhotoRequestFile(file);
                  return false;
                }}
                accept="image/*"
                maxCount={1}
                onRemove={() => {
                  setPhotoRequestFile(null);
                }}
              >
                <Button>Choose Photo</Button>
              </Upload>
            </Form.Item>
          ) : (
            <Form.Item
              label="Take New Profile Photo"
              required
              tooltip="This request requires admin approval before your profile photo is updated."
            >
              <div
                style={{
                  width: "100%",
                  background: "#111",
                  borderRadius: 12,
                  overflow: "hidden",
                  minHeight: 240,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured preview"
                    style={{ width: "100%", maxHeight: 320, objectFit: "contain" }}
                  />
                ) : (
                  <video
                    ref={photoVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}
                  />
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {capturedPhoto ? (
                  <Button onClick={handleRetakePhoto}>Retake</Button>
                ) : (
                  <Button type="primary" onClick={handleCapturePhoto}>
                    Capture
                  </Button>
                )}
              </div>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
