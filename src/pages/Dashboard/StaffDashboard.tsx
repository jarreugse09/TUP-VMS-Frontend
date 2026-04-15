import UniversalQRScanner from "../../components/qr/UniversalQRScanner";
import { useAuth } from "../../contexts/AuthContext";

const StaffDashboard = () => {
  const { user } = useAuth();
  const role = user?.subRole ?? user?.role ?? "";
  const mode = ["security_head", "security_staff", "superadmin"].includes(role)
    ? "full"
    : "client-only";

  return <UniversalQRScanner mode={mode} role={role} />;
};

export default StaffDashboard;
