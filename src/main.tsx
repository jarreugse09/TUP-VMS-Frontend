import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.tsx";
import { AuthProvider } from "@/contexts/AuthContext.tsx";
import "@/styles/index.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
