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
} from "antd";
import {
  ReloadOutlined,
  UserOutlined,
  QrcodeOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { getProfile, requestQRChange } from "../services/userService";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      message.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRequestQRChange = async () => {
    setRequesting(true);
    try {
      await requestQRChange("User requested new QR code");
      message.success("QR change request submitted");
    } catch (error) {
      message.error("Failed to request QR change");
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
    } catch (error) {
      console.error("Failed to download QR code:", error);
      message.error("Failed to download QR code");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <Row gutter={24}>
          <Col span={12}>
            <Card bordered={false} style={{ borderRadius: "20px" }}>
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card bordered={false} style={{ borderRadius: "20px" }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  const renderQRCard = () => (
    <Card
      bordered={false}
      style={{
        borderRadius: "20px",
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
          <div
            id="qr-download-container"
            style={{
              padding: "20px",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <Title level={3} style={{ marginBottom: "8px", whiteSpace: "nowrap" }}>
  {profile.user.firstName} {profile.user.surname}
</Title>

<Tag
  color="#DC143C"
  style={{
    marginBottom: "16px",
    borderRadius: 10,
    padding: "0 12px",
    whiteSpace: "nowrap",
  }}
>
  {profile.user.role.toUpperCase()}
</Tag>

            <QRCode value={profile.qrCode.qrString} size={280} color="#000000ff" bordered={false} />
          </div>

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text type="secondary" style={{ display: "block" }}>
                Code
              </Text>
              <Text code style={{ fontSize: "16px" }}>
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
                borderRadius: "8px",
                height: "50px",
                padding: "0 32px",
              }}
            >
              Request New QR Code
            </Button>

            <Button
              type="default"
              size="large"
              onClick={handleDownloadQR}
              style={{ borderRadius: "8px", height: "50px", padding: "0 32px" }}
            >
              Download QR Code
            </Button>

            <Text type="secondary" style={{ fontSize: "12px" }}>
              Requesting a new code will deactivate the current one.
            </Text>
          </Space>
        </div>
      ) : (
        <div style={{ padding: "40px", color: "#8c8c8c" }}>
          No QR Code assigned to this account.
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "12px" }}>
      {/* Desktop + Tablet Layout */}
      <Row gutter={24} style={{ alignItems: "stretch" }}>
        <Col xs={24} md={12}>
          <Card
            bordered={false}
            style={{
              borderRadius: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              width: "100%",
              display: "flex",
              flexDirection: "column",
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
            {/* PROFILE CONTENT WRAPPER */}
            <div style={{ position: "relative", textAlign: "center", paddingBottom: "24px" }}>
              {/* MOBILE QR BUTTON */}
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={() => setDrawerVisible(true)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  display: "none",
                  backgroundColor: "#DC143C",
                  borderColor: "#DC143C",
                }}
                className="mobile-qr-button"
              />

              {/* Avatar */}
              <Avatar
                size={140}
                src={profile.user.photoURL}
                icon={<UserOutlined />}
                style={{
                  border: "4px solid #fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  marginBottom: 16,
                }}
              />

              <Title level={2} style={{ margin: 0 }}>
                {profile.user.firstName} {profile.user.surname}
              </Title>
              <Tag
                color="#DC143C"
                style={{ marginTop: 8, borderRadius: 10, padding: "0 12px" }}
              >
                {profile.user.role.toUpperCase()}
              </Tag>
            </div>

            <Divider dashed style={{ margin: "12px 0" }} />

            <Descriptions column={1} size="middle" labelStyle={{ color: "#8c8c8c" }}>
              <Descriptions.Item label="Full Name">
                <Text strong>
                  {profile.user.firstName} {profile.user.surname}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color={profile.user.status === "Active" ? "green" : "gold"}>
                  {profile.user.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Birthdate">
                {new Date(profile.user.birthdate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Desktop QR Card */}
        <Col xs={0} md={12}>{renderQRCard()}</Col>
      </Row>

      {/* Mobile QR Drawer */}
      <Drawer
        title="Access Control"
        placement="right"
        closable
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width="90%"
      >
        {renderQRCard()}
      </Drawer>

      {/* Mobile Button Style */}
      <style>{`
        @media (max-width: 767px) {
          .mobile-qr-button {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
