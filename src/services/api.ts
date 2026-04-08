import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL, // should include /api
  withCredentials: true,
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getWebSocketUrl = (token: string) => {
  const normalizedBase = String(API_BASE_URL || "").replace(/\/$/, "");
  const origin = normalizedBase.replace(/\/api$/, "");
  const wsOrigin = origin.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  return `${wsOrigin}/ws?token=${encodeURIComponent(token)}`;
};

export default api;
