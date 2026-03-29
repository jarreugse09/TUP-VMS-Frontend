import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  List,
  Avatar,
  Typography,
  Space,
  Badge,
  Empty,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  MessageOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { getUsersByRole } from '../services/chatService';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Search } = Input;

interface ChatUser {
  _id: string;
  firstName: string;
  surname: string;
  role: string;
  email: string;
}

const Chat = () => {
  const { user } = useAuth();
  const { messages, onlineUsers, loading, sendMessage } = useChat();
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchChatUsers();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChatUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await getUsersByRole(['TUP', 'Security']);
      setChatUsers(users);
    } catch (error) {
      console.error('Failed to fetch chat users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'TUP') {
      return <UserOutlined style={{ color: '#1890ff' }} />;
    }
    return <SecurityScanOutlined style={{ color: '#52c41a' }} />;
  };

  const getRoleColor = (role: string) => {
    return role === 'TUP' ? '#1890ff' : '#52c41a';
  };

  const getRoleTag = (role: string) => {
    if (role === 'TUP') {
      return <Tag color="blue">Admin</Tag>;
    }
    return <Tag color="green">Security</Tag>;
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some((u: any) => u._id === userId);
  };

  const filteredUsers = chatUsers.filter((chatUser: ChatUser) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      chatUser.firstName.toLowerCase().includes(search) ||
      chatUser.surname.toLowerCase().includes(search) ||
      chatUser.email.toLowerCase().includes(search) ||
      chatUser.role.toLowerCase().includes(search)
    );
  });

  const filteredMessages = selectedUser
    ? messages.filter(
        (msg: any) =>
          msg.senderId === selectedUser._id ||
          msg.recipientId === selectedUser._id ||
          !msg.recipientId,
      )
    : messages;

  const getLastMessage = (userId: string) => {
    const userMessages = messages.filter(
      (msg: any) => msg.senderId === userId || msg.recipientId === userId,
    );
    if (userMessages.length === 0) return null;
    return userMessages[userMessages.length - 1];
  };

  const getUnreadCount = (userId: string) => {
    return messages.filter(
      (msg: any) =>
        msg.senderId === userId && msg.recipientId === user?._id && !msg.isRead,
    ).length;
  };

  // Mobile view: show either contact list or chat
  if (isMobileView) {
    if (selectedUser) {
      // Show chat view on mobile
      return (
        <div
          style={{
            height: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Mobile Chat Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedUser(null)}
              style={{ padding: '4px 8px' }}
            />
            <Avatar
              size={36}
              icon={getRoleIcon(selectedUser.role)}
              style={{ backgroundColor: getRoleColor(selectedUser.role) }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong style={{ fontSize: 14, display: 'block' }}>
                {selectedUser.firstName} {selectedUser.surname}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {getRoleTag(selectedUser.role)}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {isUserOnline(selectedUser._id) ? 'Online' : 'Offline'}
                </Text>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 16,
              background: '#f5f5f5',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : filteredMessages.length === 0 ? (
              <Empty
                description={`No messages with ${selectedUser.firstName} yet`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              filteredMessages.map((msg: any) => {
                const isOwnMessage = msg.senderId === user?._id;
                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                        gap: 8,
                      }}
                    >
                      <Avatar
                        size={32}
                        icon={getRoleIcon(msg.senderRole)}
                        style={{
                          backgroundColor: getRoleColor(msg.senderRole),
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                            marginBottom: 4,
                            justifyContent: isOwnMessage
                              ? 'flex-end'
                              : 'flex-start',
                          }}
                        >
                          <Text strong style={{ fontSize: 12 }}>
                            {msg.senderName}
                          </Text>
                          <Tooltip
                            title={dayjs(msg.createdAt).format(
                              'MMMM DD, YYYY HH:mm:ss',
                            )}
                          >
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {dayjs(msg.createdAt).format('HH:mm')}
                            </Text>
                          </Tooltip>
                          {isOwnMessage && (
                            <CheckCircleOutlined
                              style={{
                                fontSize: 10,
                                color: msg.isRead ? '#52c41a' : '#8c8c8c',
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            background: isOwnMessage ? '#1890ff' : '#fff',
                            color: isOwnMessage ? '#fff' : '#000',
                            padding: '8px 12px',
                            borderRadius: isOwnMessage
                              ? '16px 16px 4px 16px'
                              : '16px 16px 16px 4px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #f0f0f0',
              background: '#fff',
              flexShrink: 0,
            }}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${selectedUser.firstName}...`}
                style={{ flex: 1, borderRadius: '20px 0 0 20px' }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!newMessage.trim()}
                style={{ borderRadius: '0 20px 20px 0' }}
              />
            </Space.Compact>
          </div>
        </div>
      );
    }

    // Show contact list on mobile
    return (
      <div
        style={{
          height: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Space>
              <MessageOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0 }}>
                Messages
              </Title>
            </Space>
            <Search
              placeholder="Search contacts..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Space>
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Empty
              description={
                searchText ? 'No contacts found' : 'No contacts available'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 24 }}
            />
          ) : (
            <List
              dataSource={filteredUsers}
              renderItem={(chatUser: ChatUser) => {
                const isOnline = isUserOnline(chatUser._id);
                const lastMessage = getLastMessage(chatUser._id);
                const unreadCount = getUnreadCount(chatUser._id);
                return (
                  <List.Item
                    onClick={() => setSelectedUser(chatUser)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'transparent',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar
                          size={44}
                          icon={getRoleIcon(chatUser.role)}
                          style={{
                            backgroundColor: getRoleColor(chatUser.role),
                          }}
                        />
                        {isOnline && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: '#52c41a',
                              border: '2px solid #fff',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            strong
                            style={{
                              fontSize: 13,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {chatUser.firstName} {chatUser.surname}
                          </Text>
                          {unreadCount > 0 && (
                            <Badge count={unreadCount} size="small" />
                          )}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 11,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {lastMessage
                              ? lastMessage.message
                              : isOnline
                                ? 'Online'
                                : 'Offline'}
                          </Text>
                          {getRoleTag(chatUser.role)}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        {/* Online Count */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          <Space>
            <Badge status="success" />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}{' '}
              online
            </Text>
          </Space>
        </div>
      </div>
    );
  }

  // Desktop view: show both contact list and chat
  return (
    <div
      style={{
        height: 'calc(100vh - 100px)',
        display: 'flex',
        gap: 0,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Contact List Sidebar */}
      <div
        style={{
          width: 320,
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Space>
              <MessageOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0 }}>
                Messages
              </Title>
            </Space>
            <Search
              placeholder="Search contacts..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Space>
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Empty
              description={
                searchText ? 'No contacts found' : 'No contacts available'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: 24 }}
            />
          ) : (
            <List
              dataSource={filteredUsers}
              renderItem={(chatUser: ChatUser) => {
                const isSelected = selectedUser?._id === chatUser._id;
                const isOnline = isUserOnline(chatUser._id);
                const lastMessage = getLastMessage(chatUser._id);
                const unreadCount = getUnreadCount(chatUser._id);
                return (
                  <List.Item
                    onClick={() => setSelectedUser(chatUser)}
                    style={{
                      padding: '12px 20px',
                      cursor: 'pointer',
                      background: isSelected ? '#e6f7ff' : 'transparent',
                      borderLeft: isSelected
                        ? '3px solid #1890ff'
                        : '3px solid transparent',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar
                          size={48}
                          icon={getRoleIcon(chatUser.role)}
                          style={{
                            backgroundColor: getRoleColor(chatUser.role),
                          }}
                        />
                        {isOnline && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 2,
                              right: 2,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#52c41a',
                              border: '2px solid #fff',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Text strong style={{ fontSize: 14 }}>
                            {chatUser.firstName} {chatUser.surname}
                          </Text>
                          {unreadCount > 0 && (
                            <Badge count={unreadCount} size="small" />
                          )}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                            }}
                          >
                            {lastMessage
                              ? lastMessage.message
                              : isOnline
                                ? 'Online'
                                : 'Offline'}
                          </Text>
                          {getRoleTag(chatUser.role)}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        {/* Online Count */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #f0f0f0',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          <Space>
            <Badge status="success" />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}{' '}
              online
            </Text>
          </Space>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {selectedUser ? (
            <Space>
              <Avatar
                size={40}
                icon={getRoleIcon(selectedUser.role)}
                style={{ backgroundColor: getRoleColor(selectedUser.role) }}
              />
              <div>
                <Text strong style={{ fontSize: 15, display: 'block' }}>
                  {selectedUser.firstName} {selectedUser.surname}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getRoleTag(selectedUser.role)}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {isUserOnline(selectedUser._id) ? 'Online' : 'Offline'}
                  </Text>
                </div>
              </div>
            </Space>
          ) : (
            <Space>
              <TeamOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
              <Text type="secondary">Select a contact to start chatting</Text>
            </Space>
          )}
          <Badge count={onlineUsers.length} showZero color="green" />
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            background: '#f5f5f5',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Empty
              description={
                selectedUser
                  ? `No messages with ${selectedUser.firstName} yet`
                  : 'No messages yet'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            filteredMessages.map((msg: any) => {
              const isOwnMessage = msg.senderId === user?._id;
              return (
                <div
                  key={msg._id}
                  style={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                      gap: 10,
                    }}
                  >
                    <Avatar
                      size={36}
                      icon={getRoleIcon(msg.senderRole)}
                      style={{
                        backgroundColor: getRoleColor(msg.senderRole),
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          marginBottom: 6,
                          justifyContent: isOwnMessage
                            ? 'flex-end'
                            : 'flex-start',
                        }}
                      >
                        <Text strong style={{ fontSize: 13 }}>
                          {msg.senderName}
                        </Text>
                        <Tooltip
                          title={dayjs(msg.createdAt).format(
                            'MMMM DD, YYYY HH:mm:ss',
                          )}
                        >
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(msg.createdAt).format('HH:mm')}
                          </Text>
                        </Tooltip>
                        {isOwnMessage && (
                          <CheckCircleOutlined
                            style={{
                              fontSize: 12,
                              color: msg.isRead ? '#52c41a' : '#8c8c8c',
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          background: isOwnMessage ? '#1890ff' : '#fff',
                          color: isOwnMessage ? '#fff' : '#000',
                          padding: '10px 14px',
                          borderRadius: isOwnMessage
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #f0f0f0',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedUser
                  ? `Message ${selectedUser.firstName}...`
                  : 'Type a message...'
              }
              style={{ flex: 1, borderRadius: '20px 0 0 20px' }}
              size="large"
              disabled={!selectedUser}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!newMessage.trim() || !selectedUser}
              size="large"
              style={{ borderRadius: '0 20px 20px 0' }}
            >
              Send
            </Button>
          </Space.Compact>
        </div>
      </div>
    </div>
  );
};

export default Chat;
