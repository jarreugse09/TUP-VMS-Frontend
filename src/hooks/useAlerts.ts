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
import { useWebSocket } from "./useWebSocket";

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

    const token = enabled ? localStorage.getItem("token") : null;
    const wsUrl = enabled && user && token ? getWebSocketUrl(token) : null;

    useWebSocket(wsUrl, data => {
        const event = data as {
            type?: string;
            alert?: Alert;
            alertId?: string;
        };

        if (event.type === "NEW_ALERT" && event.alert) {
            setAlerts(prev => [event.alert as Alert, ...prev]);
            setUnreadCount(prev => prev + 1);
            playAlertCue(event.alert as Alert);
        } else if (event.type === "ALERT_READ" && event.alertId) {
            let unreadWasPresent = false;
            setAlerts(prev =>
                prev.map(alert => {
                    if (alert._id !== event.alertId) {
                        return alert;
                    }
                    if (!alert.isRead) {
                        unreadWasPresent = true;
                    }
                    return { ...alert, isRead: true };
                }),
            );
            if (unreadWasPresent) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } else if (event.type === "ALL_ALERTS_READ") {
            setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
            setUnreadCount(0);
        } else if (event.type === "ALERT_UPDATED" && event.alert) {
            setAlerts(prev =>
                prev.map(alert =>
                    alert._id === event.alert!._id ? (event.alert as Alert) : alert,
                ),
            );
        }
    });

    // Bug 5 fix — also depend on `user` directly so this re-fires after
    // AuthContext rehydrates from localStorage (avoids empty alerts on direct nav)
    useEffect(() => {
        if (!enabled) {
            setAlerts([]);
            setUnreadCount(0);
            return;
        }
        if (user) {
            fetchAlerts();
            fetchUnreadCount();
        }
    }, [enabled, user, fetchAlerts, fetchUnreadCount]);

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
