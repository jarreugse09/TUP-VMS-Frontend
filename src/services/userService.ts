import api from "./api";

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/users/profile");
  return response.data;
};

export const requestQRChange = async (payload: {
  reason: string;
  newQRString?: string;
  newQRImage?: File | null;
}) => {
  const form = new FormData();
  form.append("reason", payload.reason);
  if (payload.newQRString) form.append("newQRString", payload.newQRString);
  if (payload.newQRImage) form.append("newQRImage", payload.newQRImage);

  const response = await api.post("/users/request-qr-change", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getUser = async (id: string) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, userData: any) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const getQRRequests = async () => {
  const response = await api.get("/users/qr-requests");
  return response.data;
};

export const approveQRRequest = async (requestId: string) => {
  const response = await api.put(`/users/qr-requests/${requestId}/approve`);
  return response.data;
};

export const rejectQRRequest = async (requestId: string) => {
  const response = await api.put(`/users/qr-requests/${requestId}/reject`);
  return response.data;
};

export const getAllUsers = async (params?: any) => {
  const { data } = await api.get("/users/admin", { params });
  return data;
};

export const adminRegisterUser = async (payload: {
  firstName: string;
  surname: string;
  birthdate: string;
  role: "Staff" | "Student";
  staffType?: string;
  email: string;
  password: string;
  customQR: string;
  photoURL?: string;
}) => {
  const { data } = await api.post("/users/admin/register", payload);
  return data;
};

export const submitFirstPhotoCapture = async (photoDataUrl: string) => {
  const { data } = await api.post("/users/profile/first-photo", {
    photoDataUrl,
  });
  return data;
};
