import UniversalQRScanner from "../../components/qr/UniversalQRScanner";
import { useAuth } from "../../contexts/AuthContext";

const AdminDashboard = () => {
  const { user } = useAuth();
  const role = user?.subRole ?? user?.role ?? "";

  return <UniversalQRScanner mode="full" role={role} />;
};

export default AdminDashboard;
