"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";
import io, { Socket } from "socket.io-client";
import { useSearchParams, useRouter } from "next/navigation";
import { getAccessToken, getValidToken, refreshToken } from "@/app/utils/auth"; // Updated imports
import MainLayout from "@/app/comp/MainLayout";
import apiService from "@/services/api";
import useAuth from "@/app/hooks/useAuth";

interface Message {
  createdAt: string | number | Date;
  _id: string;
  conversationId: string;
  senderId: { _id: string; name: string };
  content: string;
  timestamp: string;
}

interface Conversation {
  _id: string;
  participants: string[];
  createdAt: string;
  rideId?: string;
}

const Chat: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get("conversationId");
  const rideId = searchParams.get("rideId");
  const driverId = searchParams.get("driverId");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?._id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Function to handle token refresh and socket reconnection
  const reconnectSocket = async () => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }

      const token = await getValidToken(); 
      const convId = conversationId || conversation?._id;

      if (!convId || !userId) {
        setError("Missing conversation ID or user ID");
        return;
      }

      socketRef.current = io("http://localhost:3001", {
        auth: { token, userId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on("connect", () => {
        setIsSocketConnected(true);
        socketRef.current?.emit("joinConversation", convId, (error?: string) => {
          if (error) {
            setError(error);
            socketRef.current?.disconnect();
            setIsSocketConnected(false);
          }
        });
      });

      socketRef.current.on("disconnect", () => {
        setIsSocketConnected(false);
      });

      socketRef.current.on("connect_error", async (err) => {
        console.error("Socket connection error:", err);
        if (err.message.includes("jwt expired") || err.message.includes("invalid token")) {
          try {
            await refreshToken();
            reconnectSocket(); // Retry with fresh token
          } catch (refreshError) {
            setError("Session expired. Please log in again.");
            router.push("/user/login");
          }
        } else {
          setError("Failed to connect to chat server.");
        }
      });

      socketRef.current.on("chatHistory", (history: Message[]) => {
        setMessages(
          history.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.createdAt).toISOString(),
          }))
        );
      });

      socketRef.current.on("newMessage", (message: Message) => {
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            timestamp: new Date(message.createdAt).toISOString(),
          },
        ]);
      });

      socketRef.current.on("typing", ({ userId: typerId, isTyping }: { userId: string; isTyping: boolean }) => {
        setTypingUsers((prev) => {
          if (isTyping && !prev.includes(typerId)) {
            return [...prev, typerId];
          }
          if (!isTyping) {
            return prev.filter((id) => id !== typerId);
          }
          return prev;
        });
      });

      socketRef.current.on("error", (msg: string) => {
        setError(msg);
      });
    } catch (error) {
      console.error("Socket reconnection failed:", error);
      setError("Failed to connect to chat server");
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !userId) {
      setError("Please log in to access the chat.");
      router.push("/user/login");
      return;
    }

    const fetchData = async () => {
      try {
        let convId = conversationId;

        if (rideId && driverId && !conversationId) {
          const response = await apiService.chat.getOrCreateRideConversation({ rideId, driverId });
          if (response.success) {
            convId = response.conversation._id;
            setConversation(response.conversation);
          } else {
            setError("Failed to start conversation with driver.");
            return;
          }
        }

        if (!convId) {
          setError("Conversation ID is missing.");
          return;
        }

        if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
          setError("Invalid conversation ID format.");
          return;
        }

        const convResponse = await apiService.chat.getConversation(convId);
        if (convResponse.success) {
          setConversation(convResponse.conversation);
        } else {
          setError(convResponse.message || "Failed to fetch conversation.");
          if (convResponse.status === 401) {
            try {
              await refreshToken();
              fetchData(); // Retry with fresh  token
            } catch (error) {
              setError("Session expired. Please log in again.");
              router.push("/user/login");
            }
          }
        }

        const msgResponse = await apiService.chat.getMessages(convId);
        if (msgResponse.success) {
          setMessages(
            msgResponse.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.createdAt).toISOString(),
            }))
          );
        } else {
          setError(msgResponse.message || "Failed to fetch messages.");
        }

        const convsResponse = await apiService.chat.getUserConversations(userId);
        if (convsResponse.success) {
          setConversations(convsResponse.conversations);
        } else {
          setError("Failed to fetch user conversations.");
        }
      } catch (err) {
        setError("Failed to load chat data.");
        console.error("Chat fetch error:", err);
      }
    };

    fetchData();
  }, [conversationId, rideId, driverId, userId, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!conversation?._id && !conversationId) return;
    if (!userId) return;

    reconnectSocket();

    return () => {
      socketRef.current?.disconnect();
      setIsSocketConnected(false);
    };
  }, [conversationId, conversation?._id, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = () => {
    if (!socketRef.current || (!conversationId && !conversation?._id)) return;

    const convId = conversationId || conversation?._id;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("typing", { conversationId: convId, isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current?.emit("typing", { conversationId: convId, isTyping: false });
      }, 3000);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !socketRef.current || (!conversationId && !conversation?._id) || !userId) return;

    const convId = conversationId || conversation?._id;

    try {
      const token = await getValidToken(); 
      const response = await apiService.chat.sendMessage(convId, messageInput, token);
      if (response.success) {
        setMessageInput("");
        setIsTyping(false);
        socketRef.current.emit("typing", { conversationId: convId, isTyping: false });
      } else {
        setError("Failed to send message.");
      }
    } catch (error) {
      console.error("Send message error:", error);
      if ((error as any).response?.status === 401) {
        try {
          await refreshToken();
          sendMessage(); // Retry with fresh token
        } catch (refreshError) {
          setError("Session expired. Please log in again.");
          router.push("/user/login");
        }
      } else {
        setError("Failed to send message.");
      }
    }
  };

  const getContactName = () => {
    if (!conversation || !userId) return "Contact";

    const otherParticipant = conversation.participants.find((p) => p !== userId);
    if (!otherParticipant) return "Contact";

    const contactMessage = messages.find((msg) => msg.senderId._id === otherParticipant);
    return contactMessage?.senderId.name || "Contact";
  };

  return (
    <MainLayout activeItem="Chat">
      <div className="container mx-auto p-4 flex h-[calc(100vh-200px)]">
        <div className="w-1/4 bg-gray-100 p-4 rounded-l-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Chats</h2>
          <div className="space-y-2">
            {conversations.map((conv) => {
              const otherParticipant = conv.participants.find((p) => p !== userId);
              const contactMessage = messages.find((msg) => msg.senderId._id === otherParticipant);
              const contactName = contactMessage?.senderId.name || "Contact";
              return (
                <div
                  key={conv._id}
                  className={`flex items-center p-2 rounded-md shadow-sm hover:bg-gray-200 cursor-pointer ${
                    (conversationId || conversation?._id) === conv._id ? "bg-gray-300" : "bg-white"
                  }`}
                  onClick={() => router.push(`/user/chat?conversationId=${conv._id}`)}
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                    <MessageCircle className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{contactName}</h3>
                    <p className="text-xs text-gray-500">
                      {typingUsers.includes(otherParticipant || "") ? "Typing..." : "Active now"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-3/4 ml-4">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {getContactName()}
                {!isSocketConnected && (
                  <span className="text-xs text-yellow-600 ml-2">(Connecting...)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {error && (
                <div className="text-red-500 mb-2 flex items-center">
                  {error}
                  <Button variant="link" onClick={() => setError("")} className="ml-2 text-sm">
                    Clear
                  </Button>
                </div>
              )}
              <ScrollArea className="h-[calc(100%-100px)] mb-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`mb-2 ${msg.senderId._id === userId ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`inline-block p-2 rounded-lg ${
                          msg.senderId._id === userId ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <div className="font-medium">{msg.senderId.name}</div>
                        {msg.content}
                        <div className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  disabled={!isSocketConnected}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!isSocketConnected || !messageInput.trim()}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Chat;