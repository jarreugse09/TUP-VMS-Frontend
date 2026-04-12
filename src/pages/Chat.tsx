import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  MessageOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import api from '../services/api';
import {
  ChatMessage,
  deleteMessage,
  getMessages,
  markMessageAsUnread,
} from '../services/chatService';

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text, Title } = Typography;
const SECURITY_SUBROLES = ['security_staff', 'security_head', 'superadmin', 'top_management'];
const MNL = 'Asia/Manila';

interface AuthUser {
  _id?: string;
  firstName?: string;
  surname?: string;
  subRole?: string;
}

interface Participant {
  _id: string;
  firstName: string;
  surname: string;
  subRole?: string;
}

interface ContextMenuState {
  message: ChatMessage;
  x: number;
  y: number;
}

const Chat = () => {
  const { user } = useAuth();
  const currentUser = user as AuthUser | null;
  const { messages, loading, unreadCount, sendMessage, markAsRead, refresh } = useChat();
  const [draft, setDraft] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [visible, setVisible] = useState(!document.hidden);
  const longPressRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const lastNotifiedMessageId = useRef<string | null>(null);

  const rootMessages = useMemo(
    () => messages.filter((entry) => !entry.threadId),
    [messages],
  );

  const mentionQuery = useMemo(() => {
    const match = draft.match(/@([a-zA-Z\s]*)$/);
    return match ? match[1].trim().toLowerCase() : null;
  }, [draft]);

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }

    return participants.filter((entry) => {
      const fullName = `${entry.firstName} ${entry.surname}`.toLowerCase();
      return fullName.includes(mentionQuery);
    });
  }, [mentionQuery, participants]);

  const scrollMessagesToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollThreadToBottom = () => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchParticipants = async () => {
    setParticipantsLoading(true);
    try {
      const response = await api.get('/users');
      const raw = Array.isArray(response.data) ? response.data : [];
      const filtered = raw.filter((entry: Participant) => SECURITY_SUBROLES.includes(entry.subRole || ''));
      setParticipants(filtered);
    } catch {
      setParticipants([]);
      message.error('Unable to load chat participants.');
    } finally {
      setParticipantsLoading(false);
    }
  };

  const fetchThreadMessages = async (rootId: string) => {
    setThreadLoading(true);
    try {
      const data = await getMessages({ threadId: rootId });
      setThreadMessages(data);
    } catch {
      setThreadMessages([]);
      message.error('Unable to load thread messages.');
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    void fetchParticipants();
    void markAsRead();
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [rootMessages.length]);

  useEffect(() => {
    scrollThreadToBottom();
  }, [threadMessages.length]);

  useEffect(() => {
    if (activeThread) {
      void fetchThreadMessages(activeThread._id);
    }
  }, [activeThread?._id]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    const handleVisibility = () => {
      setVisible(!document.hidden);
      if (!document.hidden) {
        void markAsRead();
      }
    };
    const handleClickAway = () => setContextMenu(null);

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('click', handleClickAway);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('click', handleClickAway);
    };
  }, [markAsRead]);

  useEffect(() => {
    const latest = rootMessages[rootMessages.length - 1];
    if (!latest || latest.senderId === currentUser?._id || visible) {
      return;
    }
    if (lastNotifiedMessageId.current === latest._id) {
      return;
    }

    lastNotifiedMessageId.current = latest._id;
    const body = `${latest.senderName}: ${(latest.content || latest.message).slice(0, 80)}`;

    if (Notification.permission === 'granted') {
      new Notification('VMS Security Chat', {
        body,
        icon: '/favicon.ico',
      });
    } else {
      message.info(body);
    }
  }, [currentUser?._id, rootMessages, visible]);

  const openContextMenu = (chatMessage: ChatMessage, x: number, y: number) => {
    setContextMenu({ message: chatMessage, x, y });
  };

  const handleLongPressStart = (chatMessage: ChatMessage) => {
    if (!isMobile) {
      return;
    }

    longPressRef.current = window.setTimeout(() => {
      openContextMenu(chatMessage, window.innerWidth / 2 - 90, window.innerHeight / 2 - 80);
    }, 450);
  };

  const clearLongPress = () => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }

    await sendMessage({
      content,
      replyTo: replyTarget?._id,
      threadId: activeThread?._id,
      mentions: selectedMentionIds,
    });

    setDraft('');
    setReplyTarget(null);
    setSelectedMentionIds([]);
    if (activeThread) {
      await fetchThreadMessages(activeThread._id);
    }
  };

  const handleSelectMention = (participant: Participant) => {
    const fullName = `${participant.firstName} ${participant.surname}`;
    setDraft((previous) => previous.replace(/@([a-zA-Z\s]*)$/, `@${fullName} `));
    setSelectedMentionIds((previous) => (
      previous.includes(participant._id) ? previous : [...previous, participant._id]
    ));
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setContextMenu(null);
      await refresh();
      if (activeThread) {
        await fetchThreadMessages(activeThread._id);
      }
      message.success('Message deleted.');
    } catch {
      message.error('Unable to delete message.');
    }
  };

  const handleMarkUnread = async (messageId: string) => {
    try {
      await markMessageAsUnread(messageId);
      setContextMenu(null);
      message.success('Message marked as unread.');
    } catch {
      message.error('Unable to mark message as unread.');
    }
  };

  const openThread = async (chatMessage: ChatMessage) => {
    setActiveThread(chatMessage);
    setContextMenu(null);
    await fetchThreadMessages(chatMessage._id);
  };

  const renderMessage = (chatMessage: ChatMessage) => {
    const isOwn = chatMessage.senderId === currentUser?._id;
    const isMentioned = chatMessage.mentions.includes(String(currentUser?._id || ''));
    const isDeleted = Boolean(chatMessage.deletedAt);
    const bubbleClass = chatMessage.isSystemMessage
      ? 'w-full rounded-xl border border-red-200 bg-red-50 p-4 text-red-900'
      : isOwn
        ? 'rounded-2xl rounded-br-md bg-teal-600 p-3 text-white'
        : 'rounded-2xl rounded-bl-md bg-gray-100 p-3 text-gray-900';

    return (
      <div
        key={chatMessage._id}
        className={`flex ${chatMessage.isSystemMessage ? 'justify-stretch' : isOwn ? 'justify-end' : 'justify-start'}`}
        onContextMenu={(event) => {
          event.preventDefault();
          openContextMenu(chatMessage, event.clientX, event.clientY);
        }}
        onTouchStart={() => handleLongPressStart(chatMessage)}
        onTouchEnd={clearLongPress}
      >
        <div className={`max-w-3xl ${chatMessage.isSystemMessage ? 'w-full' : 'max-w-[85%]'}`}>
          <div className={`mb-1 flex items-center gap-2 text-xs ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <Text strong>{chatMessage.isSystemMessage ? '🚨 HAWKEYE ALERT' : chatMessage.senderName}</Text>
            <Text type="secondary">{dayjs(chatMessage.createdAt).tz(MNL).format('MMM D, YYYY hh:mm A')}</Text>
            <Text type="secondary">Read by {Math.max(chatMessage.readBy.length - 1, 0)}</Text>
            {isMentioned && <Tag color="gold">Mentioned you</Tag>}
          </div>
          <div className={bubbleClass}>
            {chatMessage.replyTo && (
              <div className="mb-2 rounded-lg border-l-4 border-gray-300 bg-white/70 p-2 text-xs text-gray-700">
                <div className="font-semibold">{chatMessage.replyTo.senderName}</div>
                <div className="truncate">{chatMessage.replyTo.message}</div>
              </div>
            )}
            {isDeleted ? (
              <Text italic type="secondary">This message was deleted.</Text>
            ) : (
              <div className="whitespace-pre-wrap break-words">{chatMessage.content || chatMessage.message}</div>
            )}
          </div>
          {chatMessage.replyCount > 0 && !chatMessage.threadId && (
            <button
              type="button"
              className="mt-1 text-xs text-sky-700"
              onClick={() => void openThread(chatMessage)}
            >
              {chatMessage.replyCount} repl{chatMessage.replyCount === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const threadPanel = activeThread && (
    <div className={`${isMobile ? 'fixed inset-0 z-50 bg-white' : 'w-80 border-l border-gray-200 bg-white'} flex flex-col`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <Text strong>Thread</Text>
          <div className="text-xs text-gray-500">{activeThread.senderName}</div>
        </div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => setActiveThread(null)}
        />
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-1 text-xs text-gray-500">{activeThread.senderName}</div>
          <div className="whitespace-pre-wrap break-words">{activeThread.content || activeThread.message}</div>
        </div>
        {threadLoading ? (
          <Card loading />
        ) : threadMessages.length === 0 ? (
          <Empty description="No replies yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-3">
            {threadMessages.map(renderMessage)}
          </div>
        )}
        <div ref={threadEndRef} />
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={[]} allowedSubRoles={SECURITY_SUBROLES}>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
            <div className="flex items-center gap-3">
              <MessageOutlined className="text-lg text-red-600" />
              <div>
                <Title level={4} style={{ margin: 0 }}>Security General</Title>
                <Text type="secondary">Group chat for security operations and Hawkeye alerts</Text>
              </div>
            </div>
            <Space>
              <Badge count={participantsLoading ? 0 : participants.length} color="blue" />
              <Badge count={unreadCount} />
              <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>Refresh</Button>
            </Space>
          </div>

          <div className="flex min-h-[70vh]">
            <div className="flex flex-1 flex-col">
              <div className="flex-1 overflow-y-auto bg-stone-50 p-4">
                {loading ? (
                  <Card loading />
                ) : rootMessages.length === 0 ? (
                  <Empty description="No chat messages yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <List
                    dataSource={rootMessages}
                    renderItem={(entry) => (
                      <List.Item className="!border-none !px-0">
                        {renderMessage(entry)}
                      </List.Item>
                    )}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 bg-white p-4">
                {replyTarget && (
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <div>
                      Replying to @{replyTarget.senderName}: {(replyTarget.content || replyTarget.message).slice(0, 60)}
                    </div>
                    <Button type="text" onClick={() => setReplyTarget(null)}>X</Button>
                  </div>
                )}

                {mentionOptions.length > 0 && (
                  <div className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    {mentionOptions.map((participant) => (
                      <button
                        type="button"
                        key={participant._id}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() => handleSelectMention(participant)}
                      >
                        <span>{participant.firstName} {participant.surname}</span>
                        <Tag>{participant.subRole}</Tag>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Input.TextArea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                    placeholder="Message security_general. Type @ to mention someone."
                    onFocus={() => void markAsRead()}
                    onPressEnter={(event) => {
                      if (!event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Text type="secondary">
                      {activeThread ? `Posting in thread for ${activeThread.senderName}` : 'Posting in security_general'}
                    </Text>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      disabled={!draft.trim()}
                      onClick={() => void handleSend()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {!isMobile && threadPanel}
          </div>
        </div>

        {isMobile && threadPanel}

        {contextMenu && (
          <div
            className="fixed z-[1000] w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                setReplyTarget(contextMenu.message);
                setContextMenu(null);
              }}
            >
              Reply
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => void openThread(contextMenu.message)}
            >
              Create Thread
            </button>
            <button
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => void handleMarkUnread(contextMenu.message._id)}
            >
              Mark Unread
            </button>
            {!contextMenu.message.isSystemMessage && contextMenu.message.senderId === currentUser?._id && (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50"
                onClick={() => void handleDeleteMessage(contextMenu.message._id)}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default Chat;
