import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocketStore } from '../stores/socketStore';

interface Message {
  _id: string;
  conversationId: string;
  senderId: { _id: string; fullName: string };
  content: string;
  timestamp: string;
  createdAt: string | number | Date;
}

export const useChat = (conversationId: string, userId: string) => {
  const { socket, isConnected, error: socketError, setError: setSocketError, connect, disconnect } = useSocketStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState(socketError);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnected = useRef(false);
  const prevConversationId = useRef<string | null>(null);

  const handleTypingUpdate = useCallback(({ userId: typerId, isTyping }: { userId: string; isTyping: boolean }) => {
    setTypingUsers((prev) =>
      isTyping ? [...new Set([...prev, typerId])] : prev.filter((id) => id !== typerId)
    );
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      setError('Missing conversation ID or user ID');
      return;
    }

    if (!hasConnected.current) {
      connect(userId);
      hasConnected.current = true;
    }

    if (socket && isConnected) {
      if (prevConversationId.current && prevConversationId.current !== conversationId) {
        socket.emit('leaveConversation', prevConversationId.current);
      }
      socket.emit('joinConversation', conversationId, (joinError?: string) => {
        if (joinError) {
          console.error('Failed to join conversation:', joinError);
          setError(joinError);
        }
      });
      prevConversationId.current = conversationId;

      socket.on('chatHistory', (history: Message[]) => {
        setMessages(history.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.createdAt).toISOString(),
        })));
      });

      const newMessageHandler = (message: Message) => {
        if (message.conversationId !== conversationId) return;
        setMessages((prev) => {
          // Prevent duplicate messages
          if (prev.some((m) => m._id === message._id)) return prev;
          // Replace optimistic message if it exists
          if (message.senderId._id === userId) {
            const withoutOptimistic = prev.filter((m) => !m._id.startsWith(`optimistic-${conversationId}-`));
            return [...withoutOptimistic, {
              ...message,
              timestamp: new Date(message.createdAt).toISOString(),
            }];
          }
          const existingSender = prev.find((m) => m.senderId._id === message.senderId._id);
          return [...prev, {
            ...message,
            timestamp: new Date(message.createdAt).toISOString(),
            senderId: {
              ...message.senderId,
              fullName: existingSender?.senderId.fullName || message.senderId.fullName || "Unknown User",
            },
          }];
        });
      };

      socket.on('newMessage', newMessageHandler);
      socket.on('typing', handleTypingUpdate);

      return () => {
        socket.off('chatHistory');
        socket.off('newMessage', newMessageHandler);
        socket.off('typing');
      };
    }

    return () => {
      if (socket && !conversationId) {
        disconnect();
        hasConnected.current = false;
      }
    };
  }, [conversationId, userId, socket, isConnected, connect, disconnect, handleTypingUpdate]);

  const handleTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    socket.emit('typing', { conversationId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', { conversationId, isTyping: false });
    }, 3000);
  }, [conversationId, socket]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !conversationId || !socket || !isConnected || !userId) {
      setError('Cannot send message: not connected, invalid input, or user not authenticated');
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        socket.emit('sendMessage', { conversationId, content }, (sendError?: string) => {
          if (sendError) {
            reject(new Error(sendError));
          } else {
            resolve();
          }
        });
      });
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return false;
    }
  };

  useEffect(() => {
    if (socketError && socketError !== error) {
      setError(socketError);
    }
  }, [socketError]);

  return {
    messages,
    setMessages,
    error,
    isConnected,
    typingUsers,
    handleTyping,
    sendMessage,
    setError,
  };
};