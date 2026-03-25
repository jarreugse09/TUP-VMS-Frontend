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
  qrString: string
) => {
  const response = await api.post('/logs/user/scan', {
    qrString,
    type: 'Transaction', // User scans are always transactions
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

export const getUserLogs = async () => {
  try {
    const response = await api.get('/logs/logs/staff/');
    return response.data || [];
  } catch (error) {
    // Handle 403 or other auth errors
    console.warn('Could not fetch user logs:', error);
    return [];
  }
};

export const getUserTransactions = async () => {
  try {
    const response = await api.get('/logs/logs/transactions');
    return response.data || [];
  } catch (error) {
    console.warn('Could not fetch transactions:', error);
    return [];
  }
};

export const getUserAttendance = async () => {
  try {
    const response = await api.get('/logs/logs/attendance');
    return response.data || [];
  } catch (error) {
    console.warn('Could not fetch attendance:', error);
    return [];
  }
};

export const getCurrentStatus = async () => {
  try {
    const response = await api.get('/logs/logs/staff/');
    const logs = response.data;
    if (!logs || logs.length === 0) {
      return { status: 'Outside TUP', lastAction: null, lastTime: null };
    }
    const latestLog = logs[0];
    return {
      status: latestLog.dailyStatus === 'In TUP' ? 'Inside TUP' : 'Outside TUP',
      lastAction: latestLog.dailyStatus,
      lastTime: latestLog._latestTime || latestLog.date,
      latestLog,
    };
  } catch (error) {
    // If auth error or other issues, return default status
    console.warn('Could not fetch current status:', error);
    return {
      status: 'Outside TUP',
      lastAction: null,
      lastTime: null,
    };
  }
};

export const exportLogs = async (payload: { startDate?: string; endDate?: string; month?: string; format: 'csv' | 'xlsx'; password: string }) => {
  const response = await api.post('/logs/export', payload, { responseType: 'blob' });
  return response;
};
