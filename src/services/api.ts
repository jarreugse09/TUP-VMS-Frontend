import axios from "axios";

const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const API_BASE_URL = rawApiBaseUrl || (isLocalHost ? "http://localhost:5000/api" : "/api");

const api = axios.create({
  baseURL: API_BASE_URL,
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

// Global 401/403 handling - redirect to login on token expiry/invalid
let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && !isRedirecting) {
      isRedirecting = true;
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        isRedirecting = false;
      }
    }
    return Promise.reject(error);
  }
);

export const getWebSocketUrl = (token: string) => {
  const normalizedBase = String(API_BASE_URL || "").replace(/\/$/, "");
  const origin =
    normalizedBase.startsWith("http://") || normalizedBase.startsWith("https://")
      ? normalizedBase.replace(/\/api$/, "")
      : window.location.origin;
  const wsOrigin = origin.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  return `${wsOrigin}/ws?token=${encodeURIComponent(token)}`;
};

export default api;
