import api from './api';

export const exportAttendance = async (payload: { startDate?: string; endDate?: string; month?: string; format: 'csv'|'xlsx'; password: string }) => {
  const response = await api.post('/attendance/export', payload, { responseType: 'blob' });
  return response;
};
