import { useCallback, useEffect, useState } from 'react';
import {
  getMessages,
  getUnreadCount,
  markMessagesAsRead,
} from '../services/chatService';
import { getWebSocketUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from './useWebSocket';

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

  const token = enabled ? localStorage.getItem('token') : null;
  const wsUrl = enabled && user && token ? getWebSocketUrl(token) : null;

  useWebSocket(wsUrl, data => {
    const event = data as {
      type?: string;
      message?: ChatNotificationMessage;
    };

    if (event.type !== 'NEW_CHAT_MESSAGE' || !event.message) return;

    setMessages(prev => {
      const next = [...prev, event.message as ChatNotificationMessage];
      return next.slice(-30);
    });

    if (isUnreadForUser(event.message as ChatNotificationMessage, user?._id)) {
      setUnreadCount(prev => prev + 1);
    }
  });

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
