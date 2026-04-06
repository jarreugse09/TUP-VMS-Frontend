import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMessages,
  getUnreadCount,
  markMessagesAsRead,
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

interface ChatNotificationMessage {
  _id: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  recipientId?: string | null;
  message: string;
  isRead?: boolean;
  createdAt: string;
}

const isUnreadForUser = (message: ChatNotificationMessage, currentUserId?: string) => {
  if (!currentUserId) return false;
  if (message.senderId === currentUserId) return false;
  return !message.isRead;
};

export const useChatNotifications = (enabled: boolean = true) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatNotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!enabled || !user) return;
    try {
      setLoading(true);
      const data = await getMessages();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch chat notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  const fetchUnread = useCallback(async () => {
    if (!enabled || !user) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread chat count:', error);
    }
  }, [enabled, user]);

  const markVisibleMessagesAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!messageIds.length) return;
      try {
        await markMessagesAsRead(messageIds);
        setMessages(prev =>
          prev.map(message =>
            messageIds.includes(message._id)
              ? { ...message, isRead: true }
              : message,
          ),
        );
        setUnreadCount(prev => Math.max(0, prev - messageIds.length));
      } catch (error) {
        console.error('Failed to mark chat notifications as read:', error);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:5000/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'NEW_CHAT_MESSAGE') return;

        setMessages(prev => {
          const next = [...prev, data.message];
          return next.slice(-30);
        });

        if (isUnreadForUser(data.message, user._id)) {
          setUnreadCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Failed to parse chat notification websocket message:', error);
      }
    };

    ws.onerror = error => {
      console.error('Chat notification websocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    fetchMessages();
    fetchUnread();
  }, [enabled, fetchMessages, fetchUnread]);

  return {
    messages,
    unreadCount,
    loading,
    markVisibleMessagesAsRead,
    refresh: fetchMessages,
  };
};
