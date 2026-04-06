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
  Modal,
  Form,
  Input,
  Upload,
  Radio,
  Grid,
} from "antd";
import {
  ReloadOutlined,
  UserOutlined,
  QrcodeOutlined,
  IdcardOutlined,
  DownloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import {
  getProfile,
  requestQRChange,
  requestProfilePhotoChange,
} from "../services/userService";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;

const MAROON = "#DC143C";
const MAROON_LIGHT = "#fff5f5";
const MAROON_MID = "#ffd6d6";

const Profile = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
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
      if (!error?.errorFields) message.error("Failed to request QR change");
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
      const canvas = await html2canvas(qrContainer, {
        scale: 2,
        useCORS: true,
      });
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
      if (!error?.errorFields)
        message.error("Failed to submit profile photo request");
    } finally {
      setPhotoRequesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 12 : isTablet ? 16 : 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              variant="borderless"
              style={{ borderRadius: 16, border: "1px solid #f0f0f0" }}
            >
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              variant="borderless"
              style={{ borderRadius: 16, border: "1px solid #f0f0f0" }}
            >
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  /* ─── QR CARD ───────────────────────────────────────────────────────────── */
  const renderQRCard = () => (
    <Card
      variant="borderless"
      style={{
        borderRadius: 16,
        border: "1px solid #f0f0f0",
        width: "100%",
        height: "100%",
      }}
      title={
        <Space>
          <QrcodeOutlined style={{ color: MAROON, fontSize: 15 }} />
          <Text strong style={{ fontSize: 14 }}>
            Access Control
          </Text>
        </Space>
      }
    >
      {profile.qrCode ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            padding: "8px 0",
          }}
        >
          {/* QR wrapper */}
          <div
            id="qr-download-container"
            style={{
              padding: isMobile ? 16 : 24,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #f0f0f0",
              display: "inline-block",
            }}
          >
            <QRCode
              value={profile.qrCode.qrString}
              size={isMobile ? 180 : isTablet ? 200 : 220}
              color="#141414"
            />
          </div>

          {/* QR string */}
          <div
            style={{
              width: "100%",
              padding: "10px 14px",
              background: MAROON_LIGHT,
              borderRadius: 8,
              border: `1px solid ${MAROON_MID}`,
              textAlign: "center",
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: 11,
                display: "block",
                marginBottom: 2,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
              }}
            >
              QR String
            </Text>
            <Text
              strong
              style={{ fontSize: 13, color: MAROON, fontFamily: "monospace" }}
            >
              {profile.qrCode.qrString}
            </Text>
          </div>

          <Divider style={{ margin: "0" }} />

          {/* Actions */}
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Button
              block
              size="large"
              icon={<ReloadOutlined />}
              loading={requesting}
              onClick={handleRequestQRChange}
              style={{
                borderRadius: 8,
                height: 44,
                borderColor: MAROON,
                color: MAROON,
                fontWeight: 500,
              }}
            >
              Request New QR Code
            </Button>
            <Button
              block
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleDownloadQR}
              style={{ borderRadius: 8, height: 44, fontWeight: 500 }}
            >
              Download QR Code
            </Button>
          </Space>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <QrcodeOutlined
            style={{ fontSize: 40, color: "#d9d9d9", marginBottom: 12 }}
          />
          <Text type="secondary" style={{ display: "block" }}>
            No QR Code assigned.
          </Text>
        </div>
      )}
    </Card>
  );

  /* ─── MAIN RENDER ───────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: isMobile ? 4 : isTablet ? 8 : 16,
      }}
    >
      <Row gutter={[16, 16]} align="stretch">
        {/* ── LEFT: Identification ── */}
        <Col xs={24} md={12}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 16,
              border: "1px solid #f0f0f0",
              height: "100%",
            }}
            title={
              <Space>
                <IdcardOutlined style={{ color: MAROON, fontSize: 15 }} />
                <Text strong style={{ fontSize: 14 }}>
                  Identification
                </Text>
              </Space>
            }
            extra={
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined style={{ fontSize: 13 }} />}
                onClick={fetchProfile}
                style={{ color: "#8c8c8c" }}
              />
            }
          >
            {/* Avatar section */}
            <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                  marginBottom: 16,
                }}
              >
                <Avatar
                  size={110}
                  src={profile.user.photoURL}
                  icon={<UserOutlined />}
                  style={{
                    border: `3px solid ${MAROON_MID}`,
                    outline: `3px solid ${MAROON_LIGHT}`,
                  }}
                />
                {/* Edit overlay button */}
                <button
                  onClick={() => setShowPhotoRequestModal(true)}
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: MAROON,
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <EditOutlined style={{ fontSize: 12, color: "#fff" }} />
                </button>
              </div>

              <Title level={4} style={{ margin: "0 0 6px", color: "#141414" }}>
                {profile.user.firstName} {profile.user.surname}
              </Title>

              <Tag
                style={{
                  background: MAROON_LIGHT,
                  border: `1px solid ${MAROON_MID}`,
                  color: MAROON,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.5px",
                  borderRadius: 20,
                  padding: "1px 10px",
                }}
              >
                {profile.user.role.toUpperCase()}
              </Tag>
            </div>

            <Divider style={{ margin: "0 0 20px" }} />

            {/* Info rows */}
            <Descriptions
              column={1}
              size="small"
              styles={{
                label: {
                  color: "#8c8c8c",
                  fontSize: 12,
                  fontWeight: 500,
                  width: 120,
                },
              }}
            >
              <Descriptions.Item label="Full Name">
                <Text style={{ fontSize: 13 }}>
                  {profile.user.firstName} {profile.user.surname}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Account Status">
                <Tag
                  color={profile.user.status === "Active" ? "green" : "gold"}
                  style={{ borderRadius: 20, fontSize: 11 }}
                >
                  {profile.user.status}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Birthdate">
                <Text style={{ fontSize: 13 }}>
                  {new Date(profile.user.birthdate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Subtle bottom action */}
            <div style={{ marginTop: 20 }}>
              <Button
                block
                size="middle"
                icon={<EditOutlined />}
                onClick={() => setShowPhotoRequestModal(true)}
                style={{
                  borderRadius: 8,
                  borderColor: "#e8e8e8",
                  color: "#595959",
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Request Profile Photo Update
              </Button>
              {isMobile && (
                <Button
                  block
                  size="middle"
                  icon={<QrcodeOutlined />}
                  onClick={handleRequestQRChange}
                  style={{
                    borderRadius: 8,
                    borderColor: MAROON,
                    color: MAROON,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Request QR Update
                </Button>
              )}
            </div>
          </Card>
        </Col>

        {/* ── RIGHT: QR Card (desktop) ── */}
        <Col xs={24} md={12}>
          {renderQRCard()}
        </Col>
      </Row>

      {/* ── REQUEST QR CHANGE MODAL ── */}
      <Modal
        title={
          <Space>
            <QrcodeOutlined style={{ color: MAROON }} />
            <span>Request QR Change</span>
          </Space>
        }
        open={showRequestModal}
        onCancel={() => setShowRequestModal(false)}
        onOk={handleSubmitRequest}
        okText="Submit Request"
        okButtonProps={{
          style: { background: MAROON, borderColor: MAROON, borderRadius: 6 },
        }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        confirmLoading={requesting}
        width={isMobile ? "96%" : 560}
        styles={{
          header: { borderBottom: "1px solid #f0f0f0", paddingBottom: 12 },
        }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="reason"
            label="Reason for request"
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Briefly describe why you need a new QR code..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="newQRString" label="New QR String (optional)">
            <Input
              placeholder="Leave blank to auto-generate"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item label="Upload QR Image (optional)">
            <Upload
              beforeUpload={(file) => {
                setUploadingFile(file);
                return false;
              }}
              maxCount={1}
            >
              <Button style={{ borderRadius: 8 }}>Click to Upload</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── REQUEST PROFILE PHOTO MODAL ── */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: MAROON }} />
            <span>Request Profile Photo Change</span>
          </Space>
        }
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
        okText="Submit Request"
        okButtonProps={{
          style: { background: MAROON, borderColor: MAROON, borderRadius: 6 },
        }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        confirmLoading={photoRequesting}
        width={isMobile ? "96%" : isTablet ? 620 : 680}
        styles={{
          header: { borderBottom: "1px solid #f0f0f0", paddingBottom: 12 },
        }}
      >
        <Form form={photoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="reason"
            label="Reason for request"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Briefly describe why you need to update your photo..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item label="Photo source" required>
            <Radio.Group
              value={photoInputMode}
              onChange={(e) => {
                const mode = e.target.value as "upload" | "camera";
                setPhotoInputMode(mode);
                setPhotoRequestFile(null);
                setCapturedPhoto(null);
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <Radio.Button
                value="upload"
                style={{ borderRadius: "6px 0 0 6px", fontWeight: 500 }}
              >
                Upload
              </Radio.Button>
              <Radio.Button
                value="camera"
                style={{ borderRadius: "0 6px 6px 0", fontWeight: 500 }}
              >
                Take Photo
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {photoInputMode === "upload" ? (
            <Form.Item
              label="Upload new profile photo"
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
                onRemove={() => setPhotoRequestFile(null)}
              >
                <Button style={{ borderRadius: 8 }}>Choose Photo</Button>
              </Upload>
            </Form.Item>
          ) : (
            <Form.Item
              label="Take new profile photo"
              required
              tooltip="This request requires admin approval before your profile photo is updated."
            >
              <div
                style={{
                  width: "100%",
                  background: "#141414",
                  borderRadius: 10,
                  overflow: "hidden",
                  minHeight: isMobile ? 200 : 240,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #2a2a2a",
                }}
              >
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured preview"
                    style={{
                      width: "100%",
                      maxHeight: isMobile ? 260 : 320,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <video
                    ref={photoVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      maxHeight: isMobile ? 260 : 320,
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                {capturedPhoto ? (
                  <Button
                    onClick={handleRetakePhoto}
                    style={{ borderRadius: 8 }}
                  >
                    Retake
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={handleCapturePhoto}
                    style={{
                      background: MAROON,
                      borderColor: MAROON,
                      borderRadius: 8,
                    }}
                  >
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
