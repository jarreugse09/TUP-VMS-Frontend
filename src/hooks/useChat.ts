import { useCallback, useEffect, useState } from "react";
import {
  ChatMessage,
  getMessages,
  getOnlineUsers,
  getUnreadCount,
  markMessagesAsRead,
  sendMessage as sendMessageApi,
} from "../services/chatService";
import { getWebSocketUrl } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "./useWebSocket";

interface OnlineUser {
  _id: string;
  name: string;
  role: string;
}

interface WebSocketEvent {
  type?: string;
  event?: string;
  message?: ChatMessage;
  user?: OnlineUser;
  userId?: string;
}

interface UseChatOptions {
  enabled?: boolean;
}

export const useChat = (options: UseChatOptions = {}) => {
  const enabled = options.enabled ?? true;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!enabled || !user) {
      return;
    }

    try {
      setLoading(true);
      const data = await getMessages();
      setMessages(data);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  const fetchOnlineUsers = useCallback(async () => {
    if (!enabled || !user) {
      return;
    }

    try {
      const data = await getOnlineUsers();
      setOnlineUsers(data);
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    }
  }, [enabled, user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!enabled || !user) {
      return;
    }

    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread chat count:", error);
    }
  }, [enabled, user]);

  const sendMessage = useCallback(
    async (payload: { content: string; replyTo?: string; threadId?: string; mentions?: string[] }) => {
      if (!enabled || !user) {
        return;
      }

      try {
        await sendMessageApi(payload);
      } catch (error) {
        console.error("Failed to send chat message:", error);
      }
    },
    [enabled, user],
  );

  const markAsRead = useCallback(
    async (messageIds?: string[]) => {
      if (!enabled || !user) {
        return;
      }

      try {
        await markMessagesAsRead(messageIds);
        setMessages((previous) =>
          previous.map((entry) =>
            !messageIds || messageIds.length === 0 || messageIds.includes(entry._id)
              ? {
                ...entry,
                isRead: true,
                readBy: entry.readBy.includes(String(user._id))
                  ? entry.readBy
                  : [...entry.readBy, String(user._id)],
              }
              : entry,
          ),
        );
        setUnreadCount(0);
      } catch (error) {
        console.error("Failed to mark chat messages as read:", error);
      }
    },
    [enabled, user],
  );

  useEffect(() => {
    if (!enabled || !user) {
      setMessages([]);
      setOnlineUsers([]);
      setUnreadCount(0);
      return;
    }

    void fetchMessages();
    void fetchOnlineUsers();
    void fetchUnreadCount();
  }, [enabled, fetchMessages, fetchOnlineUsers, fetchUnreadCount, user]);

  const token = enabled ? localStorage.getItem("token") : null;
  const wsUrl = enabled && user && token ? getWebSocketUrl(token) : null;

  useWebSocket(wsUrl, (payload) => {
    const event = payload as WebSocketEvent;
    const eventType = event.event ?? event.type;

    if (eventType === "NEW_CHAT_MESSAGE" && event.message) {
      setMessages((previous) => {
        const exists = previous.some((entry) => entry._id === event.message?._id);
        if (exists) {
          return previous;
        }
        return event.message ? [...previous, event.message] : previous;
      });

      if (event.message.senderId !== user?._id) {
        setUnreadCount((previous) => previous + 1);
      }
    } else if (eventType === "USER_ONLINE" && event.user) {
      setOnlineUsers((previous) => {
        const exists = previous.some((entry) => entry._id === event.user?._id);
        return event.user && !exists ? [...previous, event.user] : previous;
      });
    } else if (eventType === "USER_OFFLINE" && event.userId) {
      setOnlineUsers((previous) => previous.filter((entry) => entry._id !== event.userId));
    }
  });

  return {
    messages,
    onlineUsers,
    loading,
    unreadCount,
    sendMessage,
    markAsRead,
    refresh: fetchMessages,
  };
};
