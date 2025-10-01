"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";
import MainLayout from "@/app/comp/MainLayout";
import { clientApiService } from "@/services/client/client-api"; // Fixed import
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
  lastMessageTime?: string | number | Date;
  lastMessage?: string;
  _id: string;
  participants: Participant[];
  createdAt: string;
  rideId?: string;
  unreadCount?: number;
}

const Chat: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams.get("conversationId");
  const rideId = searchParams.get("rideId");
  const driverId = searchParams.get("driverId");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?._id;

  const { 
    messages, 
    setMessages, 
    error: chatError, 
    isConnected, 
    typingUsers, 
    handleTyping, 
    sendMessage, 
    setError: setChatError 
  } = useChat(conversationId || '', userId || '');

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [prevConversationId, setPrevConversationId] = useState<string | null>(null);

  const { error: socketError, socket } = useSocketStore();

  // Set up API interceptors for authenticated requests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { clientApi } = require('@/services/client-api');
      clientApi.useTokenInterceptor();
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !userId) {
      setError("Please log in to access the chat.");
      router.push("/user/login");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let convId = conversationId;

        // Fetch user conversations
        const convsResponse = await clientApiService.chat.getUserConversations(userId);
        if (!convsResponse.success) {
          setError(convsResponse.message || "Failed to fetch user conversations.");
          setIsLoading(false);
          return;
        }
        
        const convs = convsResponse.conversations as Conversation[];
        const uniqueConvs = Array.from(new Map(convs.map(c => [c._id, c])).values());
        
        // Fetch last message for each conversation to populate lastMessage and lastMessageTime
        const updatedConvs = await Promise.all(uniqueConvs.map(async (conv) => {
          try {
            const msgResponse = await clientApiService.chat.getMessages(conv._id);
            if (msgResponse.success && msgResponse.messages && msgResponse.messages.length > 0) {
              const lastMsg = msgResponse.messages.sort((a: Message, b: Message) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              return { 
                ...conv, 
                lastMessage: lastMsg.content, 
                lastMessageTime: lastMsg.createdAt 
              };
            }
            return conv;
          } catch (error) {
            console.error(`Error fetching messages for conversation ${conv._id}:`, error);
            return conv;
          }
        }));
        
        setConversations(updatedConvs);

        // Handle ride conversation creation
        if (rideId && driverId && !conversationId) {
          const existingConversation = updatedConvs.find(
            (conv: Conversation) =>
              conv.rideId === rideId &&
              conv.participants.some((p) => p._id === userId) &&
              conv.participants.some((p) => p._id === driverId)
          );
          
          if (existingConversation) {
            convId = existingConversation._id;
            router.replace(`/user/chat?conversationId=${convId}`);
          }
        }

        // Create new ride conversation if needed
        if (rideId && driverId && !convId) {
          const response = await clientApiService.chat.getOrCreateRideConversation({ 
            rideId, 
            driverId, 
            userId 
          });
          
          if (!response.success) {
            setError(response.message || "Failed to start conversation with driver.");
            setIsLoading(false);
            return;
          }
          
          convId = response.conversation?._id || response.conversation;
          setConversation(response.conversation);
          const newConvs = [...updatedConvs.filter(c => c._id !== convId), response.conversation];
          setConversations(newConvs);
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

        // Fetch conversation details
        const convResponse = await clientApiService.chat.getConversation(convId);
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
        console.error("Error fetching chat data:", err);
        setError("Failed to load chat data: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [conversationId, rideId, driverId, userId, isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (socket) {
      const newMessageHandler = (message: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        
        setConversations((prev) => {
          const updatedConversations = prev.map((conv) =>
            conv._id === message.conversationId
              ? { 
                  ...conv, 
                  lastMessage: message.content, 
                  lastMessageTime: message.createdAt 
                }
              : conv
          );
          
          const uniqueUpdated = Array.from(
            new Map(updatedConversations.map((c) => [c._id, c])).values()
          );
          
          return uniqueUpdated.sort((a, b) =>
            (b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : new Date(b.createdAt).getTime()) -
            (a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : new Date(a.createdAt).getTime())
          );
        });
        
        if (message.conversationId !== conversationId) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv._id === message.conversationId ? { 
                ...conv, 
                unreadCount: (conv.unreadCount || 0) + 1 
              } : conv
            )
          );
        }
      };

      socket.on("newMessage", newMessageHandler);

      return () => {
        socket.off("newMessage", newMessageHandler);
      };
    }
  }, [socket, conversationId, setMessages]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: conversationId !== prevConversationId || messages.length === 1 ? 'auto' : 'smooth',
          });
        });
      }
    }
    
    if (conversationId && conversationId !== prevConversationId) {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
      setPrevConversationId(conversationId);
    }
  }, [messages, conversationId, prevConversationId]);

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
      return;
    }

    const convId = conversationId || conversation?._id || '';
    if (!convId) {
      setError("No conversation selected");
      return;
    }

    const optimisticMessage: Message = {
      _id: `optimistic-${convId}-${Date.now()}`,
      conversationId: convId,
      senderId: { _id: userId, fullName: user?.fullName || "You" },
      content: messageInput,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const success = await sendMessage(messageInput);
      if (success) {
        setMessageInput("");
        setIsTyping(false);
        
        // Update conversations with new last message
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === convId
              ? {
                  ...conv,
                  lastMessage: messageInput,
                  lastMessageTime: new Date().toISOString(),
                }
              : conv
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
        setError("Failed to send message");
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      setError("Failed to send message: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const getContactName = () => {
    if (!conversation || !userId) return "Unknown Contact";
    const otherParticipant = conversation.participants.find((p) => p._id !== userId);
    return otherParticipant?.fullName || "Unknown Contact";
  };

  const getTimeAgo = (dateStr: string | number | Date) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays}d ago` : diffHours > 0 ? `${diffHours}h ago` : "Just now";
  };

  // Combine errors from different sources
  const displayError = error || chatError || socketError;

  return (
    <MainLayout activeItem="Chat">
      <div className="container mx-auto p-4 flex flex-col md:flex-row h-[calc(100vh-150px)] min-h-[600px]">
        {/* Conversations List */}
        <div className="w-full md:w-1/3 bg-gray-100 p-4 rounded-l-lg shadow-md overflow-hidden flex flex-col mb-4 md:mb-0 md:mr-4">
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
                  const lastMessagePreview = conv.lastMessage
                    ? conv.lastMessage.length > 20
                      ? `${conv.lastMessage.substring(0, 20)}...`
                      : conv.lastMessage
                    : "No messages yet";
                  const lastMessageTime = conv.lastMessageTime
                    ? getTimeAgo(conv.lastMessageTime)
                    : "";
                  const isActive = (conversationId || conversation?._id) === conv._id;
                  const isUnread = conv.unreadCount && conv.unreadCount > 0;

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
                          <h3 className={`font-medium text-sm truncate ${isUnread ? "font-bold" : ""}`}>
                            {otherParticipant?.fullName || "Unknown Contact"}
                            {isUnread && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>}
                          </h3>
                          <span className="text-xs text-gray-400">{lastMessageTime}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{lastMessagePreview}</p>
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

        {/* Chat Messages */}
        <div className="w-full md:w-2/3 flex flex-col h-full">
          <Card className="flex flex-col h-full">
            <CardHeader className="border-b p-4 flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold">{getContactName()}</span>
              </CardTitle>
              {!isConnected && (
                <span className="text-xs text-yellow-600">(Connecting...)</span>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {displayError && (
                <div className="bg-red-100 text-red-500 p-2 flex items-center justify-between">
                  <span>{displayError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setChatError(null);
                    }}
                    className="text-red-500 hover:bg-red-200"
                  >
                    Clear
                  </Button>
                </div>
              )}

              <ScrollArea 
                ref={scrollRef} 
                className="flex-1 p-4 overflow-y-auto" 
                style={{ maxHeight: "calc(100vh - 300px)" }}
              >
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

              {/* Message Input */}
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