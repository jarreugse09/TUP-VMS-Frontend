import api from "./api";

export const getAlerts = async () => {
    const response = await api.get("/alerts");
    return response.data.data;
};

export const getUnreadCount = async () => {
    const response = await api.get("/alerts/unread-count");
    return response.data.data.count;
};

export const markAlertAsRead = async (alertId: string) => {
    const response = await api.patch(`/alerts/${alertId}/read`);
    return response.data.data;
};

export const markAllAlertsAsRead = async () => {
    const response = await api.patch("/alerts/read-all");
    return response.data;
};

export const deleteAlert = async (alertId: string) => {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
};
