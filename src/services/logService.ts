import api from "./api";

type AttendanceApiRecord = {
  _id: string;
  date: string;
  timeIn?: string | null;
  timeOut?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  goOutEntries?: Array<{
    goOutTime?: string | null;
    goInTime?: string | null;
  }>;
  staffId?: {
    _id: string;
    firstName: string;
    surname: string;
    role: string;
    photoURL?: string;
  };
};

const toLegacyAttendanceLog = (record: AttendanceApiRecord) => {
  const attendanceStatus = (record.timeOut ? 'Checked Out' : 'In TUP') as 'Checked Out' | 'In TUP';
  const breakStatus = (record.breakEnd ? 'In TUP' : 'Checked Out') as 'Checked Out' | 'In TUP';
  return {
    _id: record._id,
    date: record.date,
    user: {
      _id: record.staffId?._id || '',
      qrString: undefined,
      firstName: record.staffId?.firstName || '',
      surname: record.staffId?.surname || '',
      role: record.staffId?.role || '',
      photoURL: record.staffId?.photoURL,
      birthdate: '',
    },
    dailyStatus: attendanceStatus,
    attendance: {
      timeIn: record.timeIn || undefined,
      timeOut: record.timeOut || undefined,
      status: attendanceStatus,
    },
    activities: [
      ...(record.breakStart || record.breakEnd
        ? [{
            reason: 'break',
            timeIn: record.breakEnd || undefined,
            timeOut: record.breakStart || undefined,
            status: breakStatus,
          }]
        : []),
      ...((record.goOutEntries || []).map((entry) => {
        const goOutStatus = (entry.goInTime ? 'In TUP' : 'Checked Out') as 'Checked Out' | 'In TUP';
        return {
          reason: 'go out',
          timeIn: entry.goInTime || undefined,
          timeOut: entry.goOutTime || undefined,
          status: goOutStatus,
        };
      })),
    ],
  };
};

const getAttendancePayload = (responseData: unknown) => {
  const typed = responseData as { attendance?: AttendanceApiRecord[]; data?: AttendanceApiRecord[] };
  return typed.attendance || typed.data || [];
};

const mapScanAction = (
  mode: 'checkin' | 'checkout',
  reason: string,
): 'time_in' | 'time_out' | 'break_start' | 'break_end' | 'go_out' | 'go_in' => {
  if (reason === 'attendance') {
    return mode === 'checkin' ? 'time_in' : 'time_out';
  }
  if (reason === 'break') {
    return mode === 'checkin' ? 'break_end' : 'break_start';
  }
  return mode === 'checkin' ? 'go_in' : 'go_out';
};

export const getLogs = async () => {
  const response = await api.get("/attendance/logs");
  return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
};

export const getStaffLogs = async () => {
  const response = await api.get("/attendance/logs");
  return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
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
  const response = await api.post('/scan', {
    qrCode: qrString,
    action: mapScanAction(mode, data.reason),
    approvedBy: data.approvedBy,
    platesNumber: data.plateNumber,
  });
  return response.data;
};

export const userScanQR = async (qrString: string) => {
  const response = await api.post('/scan', {
    qrCode: qrString,
    action: 'transaction_start',
    transactionType: 'other',
  });
  return response.data;
};

export const staffScanQR = async (
  qrString: string,
  mode: 'checkin' | 'checkout'
) => {
  const response = await api.post('/scan', {
    qrCode: qrString,
    action: mode === 'checkin' ? 'transaction_start' : 'transaction_end',
    transactionType: 'other',
  });
  return response.data;
};

export const createLog = async (logData: any) => {
  const response = await api.post("/scan/manual", logData);
  return response.data;
};

export const getUserLogs = async () => {
  try {
    const response = await api.get('/attendance/logs');
    return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
  } catch (error) {
    console.warn('Could not fetch user logs:', error);
    return [];
  }
};

export const getUserTransactions = async () => {
  try {
    const response = await api.get('/transaction-logs/own', { params: { role: 'provider' } });
    return response.data?.data || response.data || [];
  } catch (error) {
    console.warn('Could not fetch transactions:', error);
    return [];
  }
};

export const getUserAttendance = async () => {
  try {
    const response = await api.get('/attendance/logs');
    return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
  } catch (error) {
    console.warn('Could not fetch attendance:', error);
    return [];
  }
};

export const getCurrentStatus = async () => {
  try {
    const logs = await getMyAttendance();
    if (!logs || logs.length === 0) {
      return { status: 'Outside TUP', lastAction: null, lastTime: null };
    }
    const latestLog = logs[0];
    return {
      status: latestLog.dailyStatus === 'In TUP' ? 'Inside TUP' : 'Outside TUP',
      lastAction: latestLog.dailyStatus,
      lastTime:
        latestLog.attendance?.timeOut ||
        latestLog.attendance?.timeIn ||
        latestLog.date,
      latestLog,
    };
  } catch (error) {
    console.warn('Could not fetch current status:', error);
    return { status: 'Outside TUP', lastAction: null, lastTime: null };
  }
};

export const exportLogs = async (payload: {
  startDate?: string;
  endDate?: string;
  month?: string;
  format: 'csv' | 'xlsx';
  password: string;
}) => {
  const response = await api.post('/attendance/export', payload, { responseType: 'blob' });
  return response;
};

export const getMyLogs = async () => {
  const response = await api.get("/attendance/logs");
  return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
};

// ── Normal user attendance (check-in / check-out only, no transactions) ───────
export const getMyAttendance = async () => {
  const response = await api.get("/attendance/logs");
  return getAttendancePayload(response.data).map(toLegacyAttendanceLog);
};

// ── Normal user transactions — both directions (I scanned + scanned me) ───────
export const getMyTransactions = async () => {
  const response = await api.get("/transaction-logs/own", { params: { role: 'client' } });
  const transactions = response.data?.data || response.data || [];
  return transactions.map((entry: any) => ({
    _id: entry._id,
    date: entry.transactionStart,
    timeIn: entry.transactionStart || null,
    timeOut: entry.transactionEnd || null,
    status: entry.transactionEnd ? 'Completed' : 'Ongoing',
    reason: entry.transactionType,
    direction: 'outgoing',
    otherParty: entry.staffId
      ? {
          firstName: entry.staffId.firstName,
          surname: entry.staffId.surname,
          role: entry.staffId.role,
          photoURL: entry.staffId.photoURL,
        }
      : null,
    scannedQrString: null,
    scannedAt: entry.transactionStart,
  }));
};
