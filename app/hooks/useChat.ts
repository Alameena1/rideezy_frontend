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
  const hasConnected = useRef(false); // Track if connect has been called

  const handleTypingUpdate = useCallback(({ userId: typerId, isTyping }: { userId: string; isTyping: boolean }) => {
    setTypingUsers((prev) =>
      isTyping ? [...prev.filter((id) => id !== typerId), typerId] : prev.filter((id) => id !== typerId)
    );
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      setError('Missing conversation ID or user ID');
      return;
    }

    if (!hasConnected.current) {
      console.log('Initiating socket connection for user:', userId);
      connect(userId);
      hasConnected.current = true;
    }

    if (socket && isConnected) {
      socket.emit('joinConversation', conversationId, (joinError?: string) => {
        if (joinError) {
          console.error('Failed to join conversation:', joinError);
          setError(joinError);
        }
      });

      socket.on('chatHistory', (history: Message[]) => {
        setMessages(history.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.createdAt).toISOString(),
        })));
      });

      socket.on('newMessage', (message: Message) => {
        console.log('New message received from server:', message); // Debug log
        setMessages((prev) => {
          const isOptimistic = prev.some((m) => m._id.startsWith(`optimistic-${conversationId}-`) && m.content === message.content);
          if (isOptimistic) {
            return prev.map((m) =>
              m._id.startsWith(`optimistic-${conversationId}-`) && m.content === message.content
                ? {
                    ...message,
                    timestamp: new Date(message.createdAt).toISOString(),
                    senderId: m.senderId._id === userId ? { _id: userId, fullName: m.senderId.fullName } : message.senderId, // Preserve sender if it's the user
                  }
                : m
            );
          }
          // Avoid adding duplicate if message is from current user
          if (message.senderId._id === userId) {
            return prev;
          }
          // Attempt to populate fullName from existing messages if available
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
      });

      socket.on('typing', handleTypingUpdate);
    }

    return () => {
      if (socket) {
        socket.off('chatHistory');
        socket.off('newMessage');
        socket.off('typing');
        if (!conversationId) {
          console.log('Disconnecting socket on cleanup');
          disconnect();
          hasConnected.current = false;
        }
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