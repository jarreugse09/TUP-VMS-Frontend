import { useState, useEffect, useCallback, useRef } from "react";
import { getMessages, sendMessage as sendMessageApi, getOnlineUsers } from "../services/chatService";
import { useAuth } from "../contexts/AuthContext";

interface Message {
    _id: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
}

interface OnlineUser {
    _id: string;
    name: string;
    role: string;
}

export const useChat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [loading, setLoading] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getMessages();
            setMessages(data);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchOnlineUsers = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getOnlineUsers();
            setOnlineUsers(data);
        } catch (error) {
            console.error("Failed to fetch online users:", error);
        }
    }, [user]);

    const sendMessage = useCallback(async (message: string) => {
        if (!user) return;
        try {
            await sendMessageApi(message);
            // Message will be added via WebSocket
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }, [user]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const wsUrl = `ws://localhost:5000/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected for chat");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "NEW_MESSAGE") {
                    setMessages((prev) => [...prev, data.message]);
                } else if (data.type === "USER_ONLINE") {
                    setOnlineUsers((prev) => {
                        const exists = prev.find((u) => u._id === data.user._id);
                        if (exists) return prev;
                        return [...prev, data.user];
                    });
                } else if (data.type === "USER_OFFLINE") {
                    setOnlineUsers((prev) => prev.filter((u) => u._id !== data.userId));
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
        fetchMessages();
        fetchOnlineUsers();
    }, [fetchMessages, fetchOnlineUsers]);

    return {
        messages,
        onlineUsers,
        loading,
        sendMessage,
        refresh: fetchMessages,
    };
};
