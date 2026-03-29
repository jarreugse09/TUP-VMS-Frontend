import { useState, useEffect, useCallback, useRef } from "react";
import { getAlerts, getUnreadCount, markAlertAsRead, markAllAlertsAsRead } from "../services/alertService";
import { useAuth } from "../contexts/AuthContext";

interface Alert {
    _id: string;
    type: string;
    title: string;
    message: string;
    cameraSource: string;
    detectionLabel: string;
    confidence: number;
    severity: string;
    imageUrl?: string;
    isRead: boolean;
    readBy?: string[];
    createdAt: string;
}

export const useAlerts = () => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const fetchAlerts = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getAlerts();
            setAlerts(data);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, [user]);

    const markAsRead = useCallback(async (alertId: string) => {
        try {
            await markAlertAsRead(alertId);
            setAlerts((prev) =>
                prev.map((alert) =>
                    alert._id === alertId ? { ...alert, isRead: true } : alert
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark alert as read:", error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await markAllAlertsAsRead();
            setAlerts((prev) => prev.map((alert) => ({ ...alert, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all alerts as read:", error);
        }
    }, []);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const wsUrl = `ws://localhost:5000/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected for alerts");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "NEW_ALERT") {
                    setAlerts((prev) => [data.alert, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                } else if (data.type === "ALERT_READ") {
                    setAlerts((prev) =>
                        prev.map((alert) =>
                            alert._id === data.alertId ? { ...alert, isRead: true } : alert
                        )
                    );
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
        };

        return () => {
            ws.close();
        };
    }, [user]);

    // Initial fetch
    useEffect(() => {
        fetchAlerts();
        fetchUnreadCount();
    }, [fetchAlerts, fetchUnreadCount]);

    return {
        alerts,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchAlerts,
    };
};
