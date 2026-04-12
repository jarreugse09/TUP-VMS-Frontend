import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Layout, Modal, Button, Typography, message, Spin } from 'antd';
import Sidebar from './components/Sidebar';
import { useAuth } from './contexts/AuthContext';
import { submitFirstPhotoCapture } from './services/userService';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/Dashboard/AdminDashboard'));
const StaffDashboard = lazy(() => import('./pages/Dashboard/StaffDashboard'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Analytics = lazy(() => import('./pages/Analytics'));
const MyAttendance = lazy(() => import('./pages/UserAttendance'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Chat = lazy(() => import('./pages/Chat'));
const SpecialSchedules = lazy(() => import('./pages/SpecialSchedules'));
// Canonical v2 pages — full implementations in Logs/ (capital L)
const VisitLogs = lazy(() => import('./pages/Logs/VisitLogs'));
const TransactionLogs = lazy(() => import('./pages/Logs/TransactionLogs'));
const ActionLogs = lazy(() => import('./pages/Logs/ActionLogs'));
const AttendanceLogs = lazy(() => import('./pages/attendance/AttendanceLogs'));
const QRRequestLogs = lazy(() => import('./pages/qr/QRRequestLogs'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const WorkSchedulesMgmt = lazy(() => import('./pages/admin/WorkSchedules'));
const QRScannerV2 = lazy(() => import('./pages/scanner/QRScanner'));
const ConsentRequired = lazy(() => import('./pages/ConsentRequired'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const PhotoRequestsPage = lazy(() => import('./pages/admin/PhotoRequestsPage'));
const BackupRestorePage = lazy(() => import('./pages/admin/BackupRestorePage'));
const CsvUploadPage = lazy(() => import('./pages/admin/CsvUploadPage'));
const Archive = lazy(() => import('./pages/admin/Archive'));
// Role-specific registration pages
const RegisterStudentVisitor = lazy(
  () => import('./pages/auth/RegisterStudentVisitor'),
);
const RegisterFaculty = lazy(() => import('./pages/auth/RegisterFaculty'));
const RegisterDepartmentHead = lazy(
  () => import('./pages/auth/RegisterDepartmentHead'),
);
const RegisterDean = lazy(() => import('./pages/auth/RegisterDean'));
const RegisterTopManagement = lazy(
  () => import('./pages/auth/RegisterTopManagement'),
);
const RegisterNonAcademic = lazy(
  () => import('./pages/auth/RegisterNonAcademic'),
);
const RegisterSuperadmin = lazy(
  () => import('./pages/auth/RegisterSuperadmin'),
);
const RegisterHR = lazy(() => import('./pages/auth/RegisterHR'));
const RegisterSecurity = lazy(() => import('./pages/auth/RegisterSecurity'));
const PrivacyNotice = lazy(() => import('./pages/auth/PrivacyNotice'));

import { DpaConsentGate } from './components/DpaConsentGate';

const { Content } = Layout;
const { Text } = Typography;

// Push toasts below the fixed mobile burger button (top: 16px + 48px height + 8px gap)
message.config({ top: 76, duration: 3 });

const CAMERA_BLOCKED_PATHS = [
  '/logs',
  '/attendance',
  '/qr-requests',
  '/admin/analytics',
  '/admin/manage-users',
  '/staff/logs',
  '/staff/attendance',
  '/user/logs',
  '/user/attendance',
];

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/register/student-visitor',
  '/auth/register/faculty',
  '/auth/register/department-head',
  '/auth/register/dean',
  '/auth/register/top-management',
  '/auth/register/non-academic',
  '/auth/register/superadmin',
  '/auth/register/hr',
  '/auth/register/security',
  '/privacy',
];

const RouteFallback = () => (
  <div
    style={{
      minHeight: '50vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Spin size="large" />
  </div>
);

const CameraRouteGuard = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.includes('/dashboard');

  useEffect(() => {
    if (isDashboardRoute) return;

    document.querySelectorAll('video').forEach(videoEl => {
      const mediaStream = videoEl.srcObject as MediaStream | null;
      mediaStream?.getTracks().forEach(track => track.stop());
      videoEl.srcObject = null;
    });
  }, [isDashboardRoute, location.pathname]);

  return null;
};

function AppContent() {
  const location = useLocation();
  const { token, user, updateUser } = useAuth();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  const mustCapturePhoto = useMemo(
    () => Boolean(user?.mustCapturePhoto),
    [user?.mustCapturePhoto],
  );
  const isPublicRoute = PUBLIC_PATHS.includes(location.pathname);
  const isAuthenticated = Boolean(token && user);
  const shouldShowShell = isAuthenticated && !isPublicRoute;
  const effectiveRole = getEffectiveRole(user);
  const scannerMode: 'full' | 'client-only' = [
    'security_head',
    'security_staff',
    'superadmin',
  ].includes(user?.subRole ?? user?.role ?? '')
    ? 'full'
    : 'client-only';

  const contentMargin = shouldShowShell
    ? isDesktop
      ? 256
      : isTablet
        ? 64
        : 0
    : 0;
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
      : isTablet
        ? contentPadding
        : isMobile
          ? 76
          : contentPadding
    : 0;
  const innerContainerStyle: React.CSSProperties = shouldShowShell
    ? {
        width: '100%',
        maxWidth: isDesktop ? '1440px' : '100%',
        margin: '0 auto',
      }
    : {
        width: '100%',
        maxWidth: 'none',
        margin: 0,
        minHeight: '100vh',
      };

  const isCameraBlocked = CAMERA_BLOCKED_PATHS.some(path =>
    location.pathname.startsWith(path),
  );

  useEffect(() => {
    const shouldBeOpen =
      isAuthenticated && mustCapturePhoto && !isPublicRoute && !isCameraBlocked;

    if (!shouldBeOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
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

  const MyQRCode = lazy(() => import('./pages/qr/MyQRCode'));

  const commonExtraRoutes = [
    {
      pageId: 'attendance' as AppPageId,
      path: '/attendance',
      element: <Attendance />,
    },
    {
      pageId: 'attendance' as AppPageId,
      path: '/staff/attendance',
      element: <MyAttendance />,
    },
    {
      pageId: 'attendance' as AppPageId,
      path: '/user/attendance',
      element: <MyAttendance />,
    },
    {
      pageId: 'attendance' as AppPageId,
      path: '/attendance/logs',
      element: <AttendanceLogs />,
    },
    { pageId: 'my_qr' as AppPageId, path: '/my-qr', element: <MyQRCode /> },
    {
      pageId: 'qr_requests' as AppPageId,
      path: '/qr-requests',
      element: <QRRequestLogs />,
    },
    {
      pageId: 'analytics' as AppPageId,
      path: '/admin/analytics',
      element: <Analytics />,
    },
    {
      pageId: 'manage_users' as AppPageId,
      path: '/admin/manage-users',
      element: <UserManagement />,
    },
    { pageId: 'alerts' as AppPageId, path: '/alerts', element: <Alerts /> },
    { pageId: 'chat' as AppPageId, path: '/chat', element: <Chat /> },
    {
      pageId: 'visit_logs' as AppPageId,
      path: '/logs/visitors',
      element: <VisitLogs />,
    },
    {
      pageId: 'transaction_logs' as AppPageId,
      path: '/logs/transactions',
      element: <TransactionLogs />,
    },
    {
      pageId: 'action_logs' as AppPageId,
      path: '/logs/actions',
      element: <ActionLogs />,
    },
    {
      pageId: 'work_schedules' as AppPageId,
      path: '/admin/work-schedules',
      element: <WorkSchedulesMgmt />,
    },
    {
      pageId: 'special_schedules' as AppPageId,
      path: '/admin/special-schedules',
      element: <SpecialSchedules />,
    },
    {
      pageId: 'qr_scanner' as AppPageId,
      path: '/scanner',
      element: <QRScannerV2 mode={scannerMode} />,
    },
    {
      pageId: 'qr_scanner' as AppPageId,
      path: '/security/scanner',
      element: <Navigate to="/scanner" replace />,
    },
    {
      pageId: 'photo_requests' as AppPageId,
      path: '/admin/photo-requests',
      element: <PhotoRequestsPage />,
    },
    {
      pageId: 'backup' as AppPageId,
      path: '/admin/backup',
      element: <BackupRestorePage />,
    },
    {
      pageId: 'csv_upload' as AppPageId,
      path: '/admin/csv-upload',
      element: <CsvUploadPage />,
    },
    {
      pageId: 'archive' as AppPageId,
      path: '/admin/archive',
      element: <Archive />,
    },
  ];

  const roleRoutes: Record<
    string,
    {
      dashboardPath: string;
      dashboardElement: React.ReactElement;
      extraRoutes?: React.ReactElement[];
    }
  > = {
    TUP: {
      dashboardPath: '/dashboard',
      dashboardElement: <AdminDashboard />,
      extraRoutes: commonExtraRoutes,
    },
    Staff: {
      dashboardPath: '/staff/dashboard',
      dashboardElement: <StaffDashboard />,
      extraRoutes: commonExtraRoutes,
    },
    Security: {
      dashboardPath: '/security/dashboard',
      dashboardElement: <AdminDashboard />,
      extraRoutes: commonExtraRoutes,
    },
    Visitor: {
      dashboardPath: '/user/dashboard',
      dashboardElement: <Dashboard />,
      extraRoutes: commonExtraRoutes,
    },
    Student: {
      dashboardPath: '/user/dashboard',
      dashboardElement: <Dashboard />,
      extraRoutes: commonExtraRoutes,
    },
  };

  const roleConfig = roleRoutes[effectiveRole] || roleRoutes.Visitor;
  const defaultAuthedPath = roleConfig.dashboardPath;

  return (
    <>
      <CameraRouteGuard />
      <Layout style={{ minHeight: '100vh' }}>
        {shouldShowShell && <Sidebar />}

        <Layout
          className="app-shell-layout"
          style={{
            marginLeft: contentMargin,
            transition: 'margin-left 0.3s ease',
          }}
        >
          <Content
            className="app-shell-content"
            style={{
              padding: shouldShowShell ? `${contentPadding}px` : '0',
              paddingTop: shouldShowShell ? `${contentTopPadding}px` : '0',
              minHeight: '100vh',
              overflowX: 'hidden',
              background: shouldShowShell ? '#f0f2f5' : 'transparent',
            }}
          >
            <div className="app-shell-inner" style={innerContainerStyle}>
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
                  {/* DPA 2012 — Consent gate */}
                  <Route
                    path="/consent-required"
                    element={
                      isAuthenticated ? (
                        <ConsentRequired />
                      ) : (
                        <Navigate to="/login" replace />
                      )
                    }
                  />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  {/* Role-specific registration routes — public, no auth required */}
                  <Route
                    path="/auth/register/student-visitor"
                    element={<RegisterStudentVisitor />}
                  />
                  <Route
                    path="/auth/register/faculty"
                    element={<RegisterFaculty />}
                  />
                  <Route
                    path="/auth/register/department-head"
                    element={<RegisterDepartmentHead />}
                  />
                  <Route
                    path="/auth/register/dean"
                    element={<RegisterDean />}
                  />
                  <Route
                    path="/auth/register/top-management"
                    element={<RegisterTopManagement />}
                  />
                  <Route
                    path="/auth/register/non-academic"
                    element={<RegisterNonAcademic />}
                  />
                  <Route
                    path="/auth/register/superadmin"
                    element={<RegisterSuperadmin />}
                  />
                  <Route path="/auth/register/hr" element={<RegisterHR />} />
                  <Route
                    path="/auth/register/security"
                    element={<RegisterSecurity />}
                  />
                  <Route path="/privacy" element={<PrivacyNotice />} />

                  <Route element={<DpaConsentGate />}>
                    <Route
                      path="/profile"
                      element={
                        isAuthenticated && canAccessPage(user, 'profile') ? (
                          <Profile />
                        ) : (
                          <Navigate
                            to={isAuthenticated ? defaultAuthedPath : '/login'}
                            replace
                          />
                        )
                      }
                    />
                    {canAccessPage(user, roleConfig.dashboardPageId) && (
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
                    )}
                    {roleConfig.extraRoutes
                      ?.filter(route => canAccessPage(user, route.pageId))
                      .map(route => (
                        <Route
                          key={`${route.pageId}-${route.path}`}
                          path={route.path}
                          element={
                            isAuthenticated ? (
                              route.element
                            ) : (
                              <Navigate to="/login" replace />
                            )
                          }
                        />
                      ))}

                    <Route
                      path="/"
                      element={
                        <Navigate
                          to={isAuthenticated ? defaultAuthedPath : '/login'}
                          replace
                        />
                      }
                    />
                    <Route
                      path="*"
                      element={
                        <Navigate
                          to={isAuthenticated ? defaultAuthedPath : '/login'}
                          replace
                        />
                      }
                    />
                  </Route>
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
              width={isMobile ? '96%' : isTablet ? 680 : 760}
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
                  justifyContent: isMobile ? 'stretch' : 'flex-end',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 8,
                  marginTop: 16,
                  flexWrap: isMobile ? 'nowrap' : 'wrap',
                }}
              >
                {capturedPhoto ? (
                  <Button onClick={handleRetake} block={isMobile}>
                    Retake
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={handleCapture}
                    block={isMobile}
                  >
                    Capture
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={handleSubmitCapture}
                  loading={submittingPhoto}
                  disabled={!capturedPhoto}
                  block={isMobile}
                >
                  Save and Continue
                </Button>
              </div>
            </Modal>
          </Content>
        </Layout>
      </Layout>
    </>
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
