import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Layout, Modal, Button, Typography, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard/Dashboard";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import StaffDashboard from "./pages/Dashboard/StaffDashboard";
import AdminLogs from "./pages/Logs/AdminLogs";
import Logs from "./pages/Logs/Logs";
import QRRequests from "./pages/QRRequests.tsx";

import Attendance from "./pages/Attendance";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./contexts/AuthContext";
import { submitFirstPhotoCapture } from "./services/userService";
import StaffLogs from "@/pages/Logs/StaffLogs.tsx";
import Analytics from "@/pages/Analytics.tsx";
import ManageUsers from "@/pages/Manage User.tsx";

const { Content } = Layout;
const { Text } = Typography;

function App() {
  const { token, user, updateUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const mustCapturePhoto = useMemo(
    () => Boolean(user?.mustCapturePhoto),
    [user?.mustCapturePhoto],
  );

  useEffect(() => {
    setCaptureOpen(mustCapturePhoto);
  }, [mustCapturePhoto]);

  useEffect(() => {
    if (!captureOpen || capturedPhoto) return;

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
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        message.error(
          "Camera permission is required. Please allow camera access.",
        );
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [captureOpen, capturedPhoto]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(photoDataUrl);
  };

  const handleRetake = async () => {
    setCapturedPhoto(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      message.error(
        "Camera permission is required. Please allow camera access.",
      );
    }
  };

  const handleSubmitCapture = async () => {
    if (!capturedPhoto) {
      message.warning("Please capture your photo first.");
      return;
    }

    setSubmittingPhoto(true);
    try {
      const res = await submitFirstPhotoCapture(capturedPhoto);
      updateUser({
        mustCapturePhoto: false,
        photoURL: res?.user?.photoURL,
      });
      setCaptureOpen(false);
      message.success("Profile photo saved.");
    } catch {
      message.error("Failed to save photo. Please try again.");
    } finally {
      setSubmittingPhoto(false);
    }
  };

  if (!token) {
    // Public routes
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // Define role-based dashboards and extra routes
  const roleRoutes: Record<
    string,
    {
      dashboardPath: string;
      dashboardElement: JSX.Element;
      extraRoutes?: JSX.Element[];
    }
  > = {
    TUP: {
      dashboardPath: "/dashboard",
      dashboardElement: <AdminDashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<AdminLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
        <Route
          key="qr-requests"
          path="/qr-requests"
          element={<QRRequests />}
        />,
        <Route
          key="admin-analytics"
          path="/admin/analytics"
          element={<Analytics />}
        />,
        <Route
          key="admin-manage-users"
          path="/admin/manage-users"
          element={<ManageUsers />}
        />,
      ],
    },

    Staff: {
      dashboardPath: "/staff/dashboard",
      dashboardElement: <StaffDashboard />,
      extraRoutes: [
        <Route key="logs" path="/staff/logs" element={<StaffLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Security: {
      dashboardPath: "/security/dashboard",
      dashboardElement: <AdminDashboard />, // or a custom security dashboard
      extraRoutes: [
        <Route key="logs" path="/logs" element={<AdminLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
      ],
    },
    Visitor: {
      dashboardPath: "/user/dashboard",
      dashboardElement: <Dashboard />,
      extraRoutes: [<Route key="logs" path="/user/logs" element={<Logs />} />],
    },
    Student: {
      dashboardPath: "/user/dashboard",
      dashboardElement: <Dashboard />,
      extraRoutes: [<Route key="logs" path="/user/logs" element={<Logs />} />],
    },
  };

  const currentRole = user?.role || user?.staffType || "Visitor";
  const roleConfig = roleRoutes[currentRole] || roleRoutes["Visitor"];
  const contentMargin = collapsed ? 80 : 200;

  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

        <Layout style={{ marginLeft: contentMargin, transition: "all 0.2s" }}>
          <Content
            style={{
              padding: "24px",
              minHeight: "100vh",
              background: "#f0f2f5",
            }}
          >
            <Routes>
              {/* Profile always available */}
              <Route path="/profile" element={<Profile />} />

              {/* Role-based dashboard and extra routes */}
              <Route
                path={roleConfig.dashboardPath}
                element={roleConfig.dashboardElement}
              />
              {roleConfig.extraRoutes?.map((r) => r)}

              {/* Redirect root & unknown paths */}
              <Route
                path="/"
                element={<Navigate to={roleConfig.dashboardPath} replace />}
              />
              <Route
                path="*"
                element={<Navigate to={roleConfig.dashboardPath} replace />}
              />
            </Routes>

            <Modal
              title="First Sign-In: Capture Your Photo"
              open={captureOpen}
              closable={false}
              maskClosable={false}
              keyboard={false}
              footer={null}
              centered
              width={760}
              destroyOnClose={false}
            >
              <Text style={{ display: "block", marginBottom: 12 }}>
                This step is required for accounts created by admin. You cannot
                continue until a photo is captured. You can retake before
                submitting.
              </Text>

              <div
                style={{
                  width: "100%",
                  background: "#111",
                  borderRadius: 12,
                  overflow: "hidden",
                  minHeight: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured preview"
                    style={{
                      width: "100%",
                      maxHeight: 420,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      maxHeight: 420,
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
                  marginTop: 16,
                }}
              >
                {capturedPhoto ? (
                  <Button onClick={handleRetake}>Retake</Button>
                ) : (
                  <Button type="primary" onClick={handleCapture}>
                    Capture
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={handleSubmitCapture}
                  loading={submittingPhoto}
                  disabled={!capturedPhoto}
                >
                  Save and Continue
                </Button>
              </div>
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
