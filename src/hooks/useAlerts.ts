import { useState, useEffect, useCallback, useRef } from "react";
import {
    getAlerts,
    getUnreadCount,
    markAlertAsRead,
    markAllAlertsAsRead,
    updateAlertIncidentStatus,
} from "../services/alertService";
import { getWebSocketUrl } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface Alert {
    _id: string;
    type: string;
    title: string;
    message: string;
    cameraSource: string;
    detectionLabel: string;
    detectedObjects?: string[];
    confidence: number;
    severity: string;
    incidentStatus: "new" | "acknowledged" | "in_progress" | "resolved";
    imageUrl?: string;
    isRead: boolean;
    readBy?: string[];
    createdAt: string;
}

interface UseAlertsOptions {
    enabled?: boolean;
    playCue?: boolean;
}

const AUDIO_CUE =
    "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAAAAAAAP//AAD//wAA//8AAP//AAD//wAA";

export const useAlerts = (options: boolean | UseAlertsOptions = true) => {
    const enabled = typeof options === "boolean" ? options : options.enabled ?? true;
    const playCue = typeof options === "boolean" ? false : options.playCue ?? false;
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAlertCue = useCallback((alert: Alert) => {
        if (!playCue) return;
        if (alert.type !== "weapon" || alert.severity !== "critical") return;

        try {
            if (!audioRef.current) {
                audioRef.current = new Audio(AUDIO_CUE);
            }
            audioRef.current.currentTime = 0;
            void audioRef.current.play().catch(() => undefined);
        } catch (error) {
            console.error("Failed to play alert cue:", error);
        }

        if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            document.visibilityState !== "visible"
        ) {
            if (Notification.permission === "granted") {
                new Notification(alert.title, {
                    body: `${alert.cameraSource} • ${alert.detectionLabel}`,
                });
            } else if (Notification.permission === "default") {
                void Notification.requestPermission();
            }
        }
    }, [playCue]);

    const fetchAlerts = useCallback(async () => {
        if (!enabled || !user) return;
        try {
            setLoading(true);
            const data = await getAlerts();
            setAlerts(data);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        } finally {
            setLoading(false);
        }
    }, [enabled, user]);

    const fetchUnreadCount = useCallback(async () => {
        if (!enabled || !user) return;
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, [enabled, user]);

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

    const updateIncidentStatus = useCallback(async (
        alertId: string,
        incidentStatus: Alert["incidentStatus"],
    ) => {
        try {
            const updatedAlert = await updateAlertIncidentStatus(alertId, incidentStatus);
            setAlerts((prev) =>
                prev.map((alert) =>
                    alert._id === alertId ? updatedAlert : alert
                )
            );
            return updatedAlert;
        } catch (error) {
            console.error("Failed to update incident status:", error);
            throw error;
        }
    }, []);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!enabled || !user) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const wsUrl = getWebSocketUrl(token);
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
                    playAlertCue(data.alert);
                } else if (data.type === "ALERT_READ") {
                    let unreadWasPresent = false;
                    setAlerts((prev) =>
                        prev.map((alert) => {
                            if (alert._id !== data.alertId) {
                                return alert;
                            }
                            if (!alert.isRead) {
                                unreadWasPresent = true;
                            }
                            return { ...alert, isRead: true };
                        })
                    );
                    if (unreadWasPresent) {
                        setUnreadCount((prev) => Math.max(0, prev - 1));
                    }
                } else if (data.type === "ALL_ALERTS_READ") {
                    setAlerts((prev) =>
                        prev.map((alert) => ({ ...alert, isRead: true }))
                    );
                    setUnreadCount(0);
                } else if (data.type === "ALERT_UPDATED") {
                    setAlerts((prev) =>
                        prev.map((alert) =>
                            alert._id === data.alert._id ? data.alert : alert
                        )
                    );
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
    }, [enabled, playAlertCue, user]);

    // Initial fetch
    useEffect(() => {
        if (!enabled) {
            setAlerts([]);
            setUnreadCount(0);
            return;
        }
        fetchAlerts();
        fetchUnreadCount();
    }, [enabled, fetchAlerts, fetchUnreadCount]);

    return {
        alerts,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        updateIncidentStatus,
        refresh: fetchAlerts,
    };
};
