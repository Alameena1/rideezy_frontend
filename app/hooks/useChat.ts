import { useState, useEffect, useRef } from "react";
import apiService from "@/services/api";
import io, { Socket } from "socket.io-client";
import { getToken } from "@/app/utils/auth";
import { Message } from "react-hook-form";

export const useChat = (conversationId: string, userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!conversationId || !userId) return;

    socketRef.current = io("http://localhost:3001", {
      auth: { token: getToken(), userId },
    });

    socketRef.current.emit("joinConversation", conversationId, (error?: string) => {
      if (error) setError(error);
    });

    // Socket event handlers
    const handlers = {
      chatHistory: (history: Message[]) => setMessages(history),
      newMessage: (message: Message) => setMessages((prev) => [...prev, message]),
      typing: ({ userId: typerId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
        setTypingUsers((prev) => 
          typing ? [...prev.filter(id => id !== typerId), typerId] 
                 : prev.filter(id => id !== typerId)
        );
      },
      error: (msg: string) => setError(msg),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socketRef.current?.on(event, handler);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [conversationId, userId]);

  const handleTyping = () => {
    if (!socketRef.current || !conversationId) return;

    setIsTyping(true);
    socketRef.current.emit("typing", { conversationId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit("typing", { conversationId, isTyping: false });
    }, 3000);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !conversationId) return;
    
    try {
      const response = await apiService.chat.sendMessage(conversationId, content);
      if (response.success) {
        setIsTyping(false);
        socketRef.current?.emit("typing", { conversationId, isTyping: false });
        return true;
      }
    } catch (error) {
      setError("Failed to send message");
      console.error(error);
      return false;
    }
  };

  return {
    messages,
    error,
    typingUsers,
    handleTyping,
    sendMessage,
    setError,
  };
};