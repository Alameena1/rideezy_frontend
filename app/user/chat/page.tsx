"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import useAuth  from "@/app/hooks/useAuth"; 
import MainLayout from "@/app/comp/MainLayout";
import apiService from "@/services/api";
import { useChat } from "../../hooks/useChat";
import { useSocketStore } from "../../stores/socketStore";

interface Message {
  _id: string;
  conversationId: string;
  senderId: { _id: string; fullName: string };
  content: string;
  timestamp: string;
  createdAt: string | number | Date;
}

interface Participant {
  _id: string;
  fullName: string;
}

interface Conversation {
  _id: string;
  participants: Participant[];
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

  const { messages, setMessages, error: chatError, isConnected, typingUsers, handleTyping, sendMessage, setError: setChatError } = useChat(
    conversationId || '',
    userId || ''
  );

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { error: socketError } = useSocketStore();

  useEffect(() => {
    if (socketError || chatError) {
      setError(socketError || chatError);
    }
  }, [socketError, chatError]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !userId) {
      setError("Please log in to access the chat.");
      router.push("/user/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        let convId = conversationId;

        const convsResponse = await apiService.chat.getUserConversations(userId);
        if (!convsResponse.success) {
          setError(convsResponse.message || "Failed to fetch user conversations.");
          setIsLoading(false);
          return;
        }
        setConversations(convsResponse.conversations);

        if (rideId && driverId && !conversationId) {
          const existingConversation = convsResponse.conversations.find(
            (conv: { rideId: string; participants: any[] }) =>
              conv.rideId === rideId &&
              conv.participants.some((p) => p._id === userId) &&
              conv.participants.some((p) => p._id === driverId)
          );
          if (existingConversation) {
            convId = existingConversation._id;
            router.replace(`/user/chat?conversationId=${convId}`);
          }
        }

        if (rideId && driverId && !convId) {
          const response = await apiService.chat.getOrCreateRideConversation({ rideId, driverId });
          if (!response.success) {
            setError(response.message || "Failed to start conversation with driver.");
            setIsLoading(false);
            return;
          }
          convId = response.conversation._id;
          setConversation(response.conversation);
          router.replace(`/user/chat?conversationId=${convId}`);
        }

        if (!convId) {
          setError("No conversation selected. Please select a conversation or start a new one.");
          setIsLoading(false);
          return;
        }

        if (!/^[0-9a-fA-F]{24}$/.test(convId)) {
          setError("Invalid conversation ID format.");
          setIsLoading(false);
          return;
        }

        const convResponse = await apiService.chat.getConversation(convId);
        if (!convResponse.success) {
          setError(convResponse.message || "Failed to fetch conversation.");
          if (convResponse.status === 401) {
            router.push("/user/login");
          }
          setIsLoading(false);
          return;
        }
        setConversation(convResponse.conversation);
      } catch (err) {
        setError("Failed to load chat data: " + (err instanceof Error ? err.message : "Unknown error"));
        console.error("Chat fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId, rideId, driverId, userId, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleTypingWrapper = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      handleTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  }, [isTyping, handleTyping]);

  const sendMessageWrapper = async () => {
    if (!messageInput.trim() || !userId) {
      console.log('Cannot send message: message empty or userId missing', { userId, messageInput });
      return;
    }

    const convId = conversationId || conversation?._id || '';
    const optimisticMessage: Message = {
      _id: `optimistic-${convId}-${Date.now()}`,
      conversationId: convId,
      senderId: { _id: userId, fullName: user?.fullName || "You" },
      content: messageInput,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };
    console.log('Adding optimistic message:', optimisticMessage); // Debug log
    setMessages((prev) => [...prev, optimisticMessage]);

    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput("");
      setIsTyping(false);
    } else {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
    }
  };

  const getContactName = () => {
    if (!conversation || !userId) return "Unknown Contact";
    const otherParticipant = conversation.participants.find((p) => p._id !== userId);
    return otherParticipant?.fullName || "Unknown Contact";
  };

  const getOtherParticipantId = (conv: Conversation) => {
    const otherParticipant = conv.participants.find((p) => p._id !== userId);
    return otherParticipant?._id || "";
  };

  const getLastMessagePreview = (convId: string) => {
    const convMessages = messages.filter((msg) => msg.conversationId === convId);
    const lastMessage = [...convMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return lastMessage
      ? lastMessage.content.length > 20
        ? `${lastMessage.content.substring(0, 20)}...`
        : lastMessage.content
      : "No messages yet";
  };

  const getLastMessageTime = (convId: string) => {
    const convMessages = messages.filter((msg) => msg.conversationId === convId);
    const lastMessage = [...convMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return lastMessage
      ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
  };

  return (
    <MainLayout activeItem="Chat">
      <div className="container mx-auto p-4 flex h-[calc(100vh-150px)] min-h-[600px]">
        <div className="w-1/3 bg-gray-100 p-4 rounded-l-lg shadow-md overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Chats</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-gray-500 text-center mt-4">No conversations found. Start a new one!</div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const otherParticipant = conv.participants.find((p) => p._id !== userId);
                  const lastMessage = getLastMessagePreview(conv._id);
                  const lastMessageTime = getLastMessageTime(conv._id);
                  const isActive = (conversationId || conversation?._id) === conv._id;

                  return (
                    <div
                      key={conv._id}
                      className={`flex items-center p-3 rounded-md hover:bg-gray-200 cursor-pointer transition-colors ${
                        isActive ? "bg-gray-300" : "bg-white"
                      }`}
                      onClick={() => router.push(`/user/chat?conversationId=${conv._id}`)}
                    >
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        <MessageCircle className="h-6 w-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-sm truncate">
                            {otherParticipant?.fullName || "Unknown Contact"}
                          </h3>
                          <span className="text-xs text-gray-400">{lastMessageTime}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{lastMessage}</p>
                        {typingUsers.includes(otherParticipant?._id || "") && (
                          <span className="text-xs text-green-500">Typing...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="w-2/3 ml-4 flex flex-col h-full">
          <Card className="flex flex-col h-full">
            <CardHeader className="border-b p-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold">{getContactName()}</span>
                {!isConnected && (
                  <span className="text-xs text-yellow-600 ml-2">(Connecting...)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {error && (
                <div className="bg-red-100 text-red-500 p-2 flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError("")}
                    className="text-red-500 hover:bg-red-200"
                  >
                    Clear
                  </Button>
                </div>
              )}

              <ScrollArea className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex ${msg.senderId._id === userId ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.senderId._id === userId ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                          } break-words`}
                        >
                          <div className="font-medium text-sm">
                            {msg.senderId._id === userId ? "You" : msg.senderId.fullName || "Unknown User"}
                          </div>
                          <p className="text-sm">{msg.content}</p>
                          <div className="text-xs opacity-80 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTypingWrapper();
                    }}
                    onKeyPress={(e) => e.key === "Enter" && sendMessageWrapper()}
                    placeholder="Type a message..."
                    disabled={!isConnected || !userId}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessageWrapper}
                    disabled={!isConnected || !messageInput.trim() || !userId}
                    className="w-24"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Chat;