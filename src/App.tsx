import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Layout, Modal, Button, Typography, message, Spin, Grid } from "antd";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./contexts/AuthContext";
import { submitFirstPhotoCapture } from "./services/userService";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/Dashboard/AdminDashboard"));
const StaffDashboard = lazy(() => import("./pages/Dashboard/StaffDashboard"));
const AdminLogs = lazy(() => import("./pages/Logs/AdminLogs"));
const Logs = lazy(() => import("./pages/Logs/Logs"));
const StaffLogs = lazy(() => import("./pages/Logs/StaffLogs"));
const Attendance = lazy(() => import("./pages/Attendance"));
const QRRequests = lazy(() => import("./pages/QRRequests"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ManageUsers = lazy(() => import("./pages/Manage User"));
const MyAttendance = lazy(() => import("./pages/UserAttendance"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Chat = lazy(() => import("./pages/Chat"));

const { Content } = Layout;
const { Text } = Typography;

const CAMERA_BLOCKED_PATHS = [
  "/logs",
  "/attendance",
  "/qr-requests",
  "/admin/analytics",
  "/admin/manage-users",
  "/staff/logs",
  "/staff/attendance",
  "/user/logs",
  "/user/attendance",
];

const PUBLIC_PATHS = ["/login", "/register"];

const RouteFallback = () => (
  <div
    style={{
      minHeight: "50vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Spin size="large" />
  </div>
);

function AppContent() {
  const location = useLocation();
  const { token, user, updateUser } = useAuth();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMobile = !screens.md;
  const isTablet = Boolean(screens.md && !screens.xl);
  const isDesktop = Boolean(screens.xl);

  const mustCapturePhoto = useMemo(
    () => Boolean(user?.mustCapturePhoto),
    [user?.mustCapturePhoto],
  );
  const isAuthenticated = Boolean(token && user);
  const isPublicRoute = PUBLIC_PATHS.includes(location.pathname);
  const shouldShowShell = isAuthenticated && !isPublicRoute;
  const contentMargin = shouldShowShell && isDesktop ? 220 : 0;
  const contentPadding = shouldShowShell
    ? isMobile
      ? 12
      : isTablet
        ? 18
        : 24
    : 0;
  const contentTopPadding = shouldShowShell
    ? isDesktop
      ? contentPadding
      : isMobile
        ? 76
        : 86
    : 0;
  const effectiveRole =
    user?.role === "Staff" && user?.staffType === "Security"
      ? "Security"
      : user?.role || user?.staffType || "Visitor";

  const isCameraBlocked = CAMERA_BLOCKED_PATHS.some((path) =>
    location.pathname.startsWith(path),
  );

  useEffect(() => {
    const shouldBeOpen =
      isAuthenticated && mustCapturePhoto && !isPublicRoute && !isCameraBlocked;

    if (!shouldBeOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCapturedPhoto(null);
      setCaptureOpen(false);
      return;
    }

    setCaptureOpen(true);
  }, [isAuthenticated, mustCapturePhoto, isPublicRoute, isCameraBlocked]);

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
        message.error("Camera permission is required. Please allow camera access.");
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
      message.error("Camera permission is required. Please allow camera access.");
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
      updateUser({ mustCapturePhoto: false, photoURL: res?.user?.photoURL });
      setCaptureOpen(false);
      message.success("Profile photo saved.");
    } catch {
      message.error("Failed to save photo. Please try again.");
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const roleRoutes: Record<
    string,
    {
      dashboardPath: string;
      dashboardElement: React.ReactElement;
      extraRoutes?: React.ReactElement[];
    }
  > = {
    TUP: {
      dashboardPath: "/dashboard",
      dashboardElement: <AdminDashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<AdminLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
        <Route key="qr-requests" path="/qr-requests" element={<QRRequests />} />,
        <Route key="admin-analytics" path="/admin/analytics" element={<Analytics />} />,
        <Route
          key="admin-manage-users"
          path="/admin/manage-users"
          element={<ManageUsers />}
        />,
        <Route key="alerts" path="/alerts" element={<Alerts />} />,
        <Route key="chat" path="/chat" element={<Chat />} />,
      ],
    },
    Staff: {
      dashboardPath: "/staff/dashboard",
      dashboardElement: <StaffDashboard />,
      extraRoutes: [
        <Route key="logs" path="/staff/logs" element={<StaffLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
        <Route
          key="my-attendance"
          path="/staff/attendance"
          element={<MyAttendance />}
        />,
      ],
    },
    Security: {
      dashboardPath: "/security/dashboard",
      dashboardElement: <AdminDashboard />,
      extraRoutes: [
        <Route key="logs" path="/logs" element={<AdminLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
        <Route key="alerts" path="/alerts" element={<Alerts />} />,
        <Route key="chat" path="/chat" element={<Chat />} />,
      ],
    },
    Visitor: {
      dashboardPath: "/user/dashboard",
      dashboardElement: <Dashboard />,
      extraRoutes: [
        <Route key="logs" path="/user/logs" element={<Logs />} />,
        <Route
          key="attendance"
          path="/user/attendance"
          element={<MyAttendance />}
        />,
      ],
    },
    Student: {
      dashboardPath: "/user/dashboard",
      dashboardElement: <Dashboard />,
      extraRoutes: [
        <Route key="logs" path="/user/logs" element={<Logs />} />,
        <Route
          key="attendance"
          path="/user/attendance"
          element={<MyAttendance />}
        />,
      ],
    },
  };

  const currentRole = effectiveRole;
  const roleConfig = roleRoutes[currentRole] || roleRoutes.Visitor;
  const defaultAuthedPath = roleConfig.dashboardPath;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {shouldShowShell && <Sidebar />}

      <Layout
        className="app-shell-layout"
        style={{
          marginLeft: contentMargin,
          transition: "margin-left 0.3s ease",
        }}
      >
        <Content
          className="app-shell-content"
          style={{
            padding: shouldShowShell ? `${contentPadding}px` : "0",
            paddingTop: shouldShowShell ? `${contentTopPadding}px` : "0",
            minHeight: "100vh",
            background: shouldShowShell ? "#f0f2f5" : "transparent",
          }}
        >
          <div className="app-shell-inner">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    isAuthenticated ? (
                      <Navigate to={defaultAuthedPath} replace />
                    ) : (
                      <Login />
                    )
                  }
                />
                <Route
                  path="/register"
                  element={
                    isAuthenticated ? (
                      <Navigate to={defaultAuthedPath} replace />
                    ) : (
                      <Register />
                    )
                  }
                />

                <Route
                  path="/profile"
                  element={
                    isAuthenticated ? <Profile /> : <Navigate to="/login" replace />
                  }
                />

                <Route
                  path={roleConfig.dashboardPath}
                  element={
                    isAuthenticated ? (
                      roleConfig.dashboardElement
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  }
                />
                {roleConfig.extraRoutes?.map((route) =>
                  isAuthenticated ? route : React.cloneElement(route, {
                    element: <Navigate to="/login" replace />,
                  }),
                )}

                <Route
                  path="/"
                  element={
                    <Navigate
                      to={isAuthenticated ? defaultAuthedPath : "/login"}
                      replace
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <Navigate
                      to={isAuthenticated ? defaultAuthedPath : "/login"}
                      replace
                    />
                  }
                />
              </Routes>
            </Suspense>
          </div>

          <Modal
            title="First Sign-In: Capture Your Photo"
            open={captureOpen}
            closable={false}
            maskClosable={false}
            keyboard={false}
            footer={null}
            centered
            width={isMobile ? "96%" : isTablet ? 680 : 760}
            destroyOnClose={false}
          >
            <Text style={{ display: "block", marginBottom: 12 }}>
              This step is required for accounts created by admin. You cannot continue
              until a photo is captured. You can retake before submitting.
            </Text>

            <div
              style={{
                width: "100%",
                background: "#111",
                borderRadius: 12,
                overflow: "hidden",
                minHeight: isMobile ? 240 : 320,
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
                    maxHeight: isMobile ? 300 : 420,
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
                    maxHeight: isMobile ? 300 : 420,
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
                flexWrap: "wrap",
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
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
