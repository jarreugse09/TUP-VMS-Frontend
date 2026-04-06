import api from "./api";

export const getMessages = async () => {
    const response = await api.get("/chat/messages");
    return response.data.data;
};

export const sendMessage = async (message: string, recipientId?: string | null) => {
    const response = await api.post("/chat/send", {
        message,
        recipientId: recipientId || null,
    });
    return response.data.data;
};

export const getOnlineUsers = async () => {
    const response = await api.get("/chat/online-users");
    return response.data.data;
};

export const getUnreadCount = async () => {
    const response = await api.get("/chat/unread-count");
    return response.data.data.count;
};

export const markMessagesAsRead = async (messageIds: string[]) => {
    const response = await api.patch("/chat/mark-read", { messageIds });
    return response.data;
};

export const getUsersByRole = async (roles: string[]) => {
    const response = await api.get(`/chat/users?roles=${roles.join(",")}`);
    return response.data.data;
};
