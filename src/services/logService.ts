import api from "./api";

export const getLogs = async () => {
  const response = await api.get("/logs/logs");
  return response.data;
};
export const scanQR = async (qrString: string, mode: string) => {
  const response = await api.post("/logs/scan", { qrString, mode });
  return response.data;
};
export const createLog = async (logData: any) => {
  const response = await api.post("/logs", logData);
  return response.data;
};
