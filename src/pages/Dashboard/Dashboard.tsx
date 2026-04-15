import UniversalQRScanner from "../../components/qr/UniversalQRScanner";
import { useAuth } from "../../contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.subRole ?? user?.role ?? "";

  return <UniversalQRScanner mode="client-only" role={role} />;
};

export default Dashboard;
