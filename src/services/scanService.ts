import api from "./api";

export type ScanAction = 
  | "time_in" 
  | "time_out" 
  | "break_start" 
  | "break_end" 
  | "go_out" 
  | "go_in"
  | "transaction_start"
  | "transaction_end";

export interface ScanPayload {
  qrCode: string;
  action: ScanAction;
  platesNumber?: string;
  approvedBy?: string;
  transactionType?: string;
  notes?: string;
}

const processScanRequest = async (payload: ScanPayload, isManual: boolean) => {
  if (payload.action === "transaction_start") {
    const response = await api.post("/transactions/start", {
      providerQrCode: payload.qrCode,
      transactionType: payload.transactionType,
      notes: payload.notes
    });
    return response.data;
  }
  
  if (payload.action === "transaction_end") {
    const response = await api.post("/transactions/end", {
      providerQrCode: payload.qrCode,
      notes: payload.notes
    });
    return response.data;
  }

  const endpoint = isManual ? "/scan/manual" : "/scan";
  const response = await api.post(endpoint, payload);
  return response.data;
};

export const performScan = async (payload: ScanPayload) => processScanRequest(payload, false);
export const performManualScan = async (payload: ScanPayload) => processScanRequest(payload, true);

export const getTransactionLogs = async (params?: any) => {
  const response = await api.get("/transaction-logs/own", { params });
  return response.data;
};

export const getAllTransactionLogs = async (params?: any) => {
  const response = await api.get("/transaction-logs/all", { params });
  return response.data;
};

export const getColleges = async () => {
  const response = await api.get("/colleges");
  return response.data;
};

export const getDepartments = async (params?: any) => {
  const response = await api.get("/departments", { params });
  return response.data;
};
