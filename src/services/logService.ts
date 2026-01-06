import api from "./api";

export const getLogs = async () => {
  const response = await api.get("/logs/logs");
  return response.data;
};

export const getStaffLogs = async () => {
  const response = await api.get("/logs/logs/staff/");
  return response.data;
};

export const getAttendance = async () => {
  const response = await api.get("/attendance/logs");
  return response.data;
};

export const scanQR = async (
  qrString: string,
  mode: 'checkin' | 'checkout',
  data: {
    reason: string;
    approvedBy?: string;
    plateNumber?: string;
  }
) => {
  const response = await api.post('/logs/scan', {
    qrString,
    mode,
    reason: data.reason,
    approvedBy: data.approvedBy,
    plateNumber: data.plateNumber,
  });

  return response.data;
};

export const userScanQR = async (
  qrString: string,
  mode: 'checkin' | 'checkout'
) => {
  const response = await api.post('/logs/user/scan', {
    qrString,
    mode,
    type: 'Transaction', // 🔴 REQUIRED by backend
  });

  return response.data;
};

export const staffScanQR = async (
  qrString: string,
  mode: 'checkin' | 'checkout'
) => {
  const response = await api.post('/logs/staff/scan', {
    qrString,
    mode,
    type: 'Transaction', // REQUIRED by backend
  });

  return response.data;
};

export const createLog = async (logData: any) => {
  const response = await api.post("/logs", logData);
  return response.data;
};

export const exportLogs = async (payload: { startDate?: string; endDate?: string; month?: string; format: 'csv' | 'xlsx'; password: string }) => {
  const response = await api.post('/logs/export', payload, { responseType: 'blob' });
  return response;
};
