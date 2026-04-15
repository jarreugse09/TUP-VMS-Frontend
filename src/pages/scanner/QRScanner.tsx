import UniversalQRScanner from "../../components/qr/UniversalQRScanner";
import { useAuth } from "../../contexts/AuthContext";

interface QRScannerProps {
  mode?: "full" | "client-only";
}

const QRScanner = ({ mode = "client-only" }: QRScannerProps) => {
  const { user } = useAuth();
  const role = user?.subRole ?? user?.role ?? "";

  return <UniversalQRScanner mode={mode} role={role} />;
};

export default QRScanner;
