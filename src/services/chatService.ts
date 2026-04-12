import api from "./api";

export interface ChatReplyPreview {
  _id: string;
  senderName: string;
  message: string;
  isSystemMessage: boolean;
}

export interface ChatMessage {
  _id: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  recipientId: string | null;
  content: string;
  message: string;
  readBy: string[];
  groupId: string | null;
  isRead: boolean;
  replyTo: ChatReplyPreview | null;
  isSystemMessage: boolean;
  mentions: string[];
  threadId: string | null;
  replyCount: number;
  deletedAt: string | null;
  createdAt: string;
}

interface GetMessagesOptions {
  threadId?: string;
}

interface SendMessagePayload {
  content: string;
  replyTo?: string;
  threadId?: string;
  mentions?: string[];
}

export const getMessages = async (options: GetMessagesOptions = {}) => {
  const response = await api.get("/chat/messages", { params: options });
  return response.data.data as ChatMessage[];
};

export const sendMessage = async (payload: SendMessagePayload) => {
  const response = await api.post("/chat/messages", payload);
  return response.data.data as ChatMessage;
};

export const getOnlineUsers = async () => {
  const response = await api.get("/chat/online-users");
  return response.data.data;
};

export const getUnreadCount = async () => {
  const response = await api.get("/chat/unread-count");
  return response.data.data.count as number;
};

export const markMessagesAsRead = async (messageIds?: string[]) => {
  const response = await api.post("/chat/mark-read", messageIds?.length ? { messageIds } : {});
  return response.data;
};

export const markMessageAsUnread = async (messageId: string) => {
  const response = await api.post("/chat/mark-unread", { messageId });
  return response.data;
};

export const deleteMessage = async (messageId: string) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};
