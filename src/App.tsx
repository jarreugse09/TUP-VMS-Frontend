import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Layout, Modal, Button, Typography, message, Spin } from "antd";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./contexts/AuthContext";
import { submitFirstPhotoCapture } from "./services/userService";
} from 'react-router-dom';
import { Layout, Modal, Button, Typography, message, Spin, Drawer } from 'antd';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { submitFirstPhotoCapture } from './services/userService';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/Dashboard/AdminDashboard'));
const StaffDashboard = lazy(() => import('./pages/Dashboard/StaffDashboard'));
const AdminLogs = lazy(() => import('./pages/Logs/AdminLogs'));
const Logs = lazy(() => import('./pages/Logs/Logs'));
const StaffLogs = lazy(() => import('./pages/Logs/StaffLogs'));
const Attendance = lazy(() => import('./pages/Attendance'));
const QRRequests = lazy(() => import('./pages/QRRequests'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ManageUsers = lazy(() => import('./pages/Manage User'));
const MyAttendance = lazy(() => import('./pages/UserAttendance'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Chat = lazy(() => import('./pages/Chat'));

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

const RouteFallback = () => (
  <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Spin size="large" />
  </div>
);

// ─── Inner component (needs useLocation, must be inside <Router>) ──────────────

function App() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token, user, updateUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const mustCapturePhoto = useMemo(
    () => Boolean(user?.mustCapturePhoto),
    [user?.mustCapturePhoto],
  );

  const isCameraBlocked = CAMERA_BLOCKED_PATHS.some((path) =>
    location.pathname.startsWith(path),
  );

  useEffect(() => {
  const shouldBeOpen = mustCapturePhoto && !isCameraBlocked;

  if (!shouldBeOpen) {
    // Actively kill the stream whenever we leave an allowed page
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Also clear the video element's source so browser releases the device
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturedPhoto(null);
    setCaptureOpen(false);
  } else {
    setCaptureOpen(true);
  }
}, [mustCapturePhoto, isCameraBlocked]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [captureOpen, capturedPhoto]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoDataUrl);
  };

  const handleRetake = async () => {
    setCapturedPhoto(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
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
        'Camera permission is required. Please allow camera access.',
      );
    }
  };

  const handleSubmitCapture = async () => {
    if (!capturedPhoto) {
      message.warning('Please capture your photo first.');
      return;
    }
    setSubmittingPhoto(true);
    try {
      const res = await submitFirstPhotoCapture(capturedPhoto);
      updateUser({ mustCapturePhoto: false, photoURL: res?.user?.photoURL });
      setCaptureOpen(false);
      message.success('Profile photo saved.');
    } catch {
      message.error('Failed to save photo. Please try again.');
    } finally {
      setSubmittingPhoto(false);
    }
  };

  // Use React.ReactElement for dashboardElement and extraRoutes
  const roleRoutes: Record<string, {
    dashboardPath: string;
    dashboardElement: React.ReactElement;
    extraRoutes?: React.ReactElement[];
  }> = {
    TUP: {
      dashboardPath: '/dashboard',
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
        <Route key="alerts" path="/alerts" element={<Alerts />} />,
        <Route key="chat" path="/chat" element={<Chat />} />,
      ],
    },
    Staff: {
      dashboardPath: '/staff/dashboard',
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
      dashboardPath: '/security/dashboard',
      dashboardElement: <AdminDashboard />, // or a custom security dashboard
      extraRoutes: [
        <Route key="logs" path="/logs" element={<AdminLogs />} />,
        <Route key="attendance" path="/attendance" element={<Attendance />} />,
        <Route key="alerts" path="/alerts" element={<Alerts />} />,
        <Route key="chat" path="/chat" element={<Chat />} />,
      ],
    },
    Visitor: {
      dashboardPath: '/user/dashboard',
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
      dashboardPath: '/user/dashboard',
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

  const currentRole = user?.role || user?.staffType || "Visitor";
  const roleConfig = roleRoutes[currentRole] || roleRoutes["Visitor"];
  const contentMargin = collapsed ? 80 : 200;

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Sidebar - handles mobile drawer internally */}
        <Sidebar />

        <Layout
          style={{
            marginLeft: isMobile ? 0 : contentMargin,
            transition: 'margin-left 0.3s ease',
          }}
        >
          <Content
            style={{
              padding: isMobile ? '16px' : '24px',
              paddingTop: isMobile ? '72px' : '24px',
              minHeight: '100vh',
              background: '#f0f2f5',
            }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Profile always available */}
                <Route path="/profile" element={<Profile />} />

                {/* Role-based dashboard and extra routes */}
                <Route
                  path={roleConfig.dashboardPath}
                  element={roleConfig.dashboardElement}
                />
                {roleConfig.extraRoutes?.map(r => r)}

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
            </Suspense>

            <Modal
              title="First Sign-In: Capture Your Photo"
              open={captureOpen}
              closable={false}
              maskClosable={false}
              keyboard={false}
              footer={null}
              centered
              width={isMobile ? '95%' : 760}
              destroyOnClose={false}
            >
              <Text style={{ display: 'block', marginBottom: 12 }}>
                This step is required for accounts created by admin. You cannot
                continue until a photo is captured. You can retake before
                submitting.
              </Text>

              <div
                style={{
                  width: '100%',
                  background: '#111',
                  borderRadius: 12,
                  overflow: 'hidden',
                  minHeight: isMobile ? 240 : 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Captured preview"
                    style={{
                      width: '100%',
                      maxHeight: isMobile ? 300 : 420,
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      maxHeight: isMobile ? 300 : 420,
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 16,
                  flexWrap: 'wrap',
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