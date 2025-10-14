"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Loader2, 
  Image as ImageIcon, 
  X, 
  MoreVertical,
  Trash2,
  ZoomIn,
  ExternalLink,
  ChevronDown,
  Menu
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import MainLayout from "@/app/comp/MainLayout";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";
import { useChat } from "../../hooks/useChat";
import { useSocketStore } from "../../stores/socketStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Message {
  _id: string;
  conversationId: string;
  senderId: { _id: string; fullName: string; profilePicture?: string };
  content: string;
  messageType: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  isDeleted: boolean;
  timestamp: string;
  createdAt: string | number | Date;
}

interface Participant {
  _id: string;
  fullName: string;
  profilePicture?: string;
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
  useApiInterceptors();
  const { data: session, status: sessionStatus } = useSession();

  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationId = searchParams?.get("conversationId") || '';
  const rideId = searchParams?.get("rideId") || '';
  const driverId = searchParams?.get("driverId") || '';
  
  const userId = (session?.user as any)?.id || '';

  const { 
    messages, 
    error: chatError, 
    isConnected, 
    typingUsers, 
    handleTyping, 
    sendMessage, 
    deleteMessage,
    uploadImage,
    setError: setChatError,
    isLoading: chatLoading
  } = useChat(conversationId, userId);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const autoScrollRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const { error: socketError, socket } = useSocketStore();

  // Improved auto-scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (viewport) {
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Use timeout to ensure DOM is updated
        scrollTimeoutRef.current = setTimeout(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: behavior
          });
          autoScrollRef.current = true;
          setShowScrollButton(false);
        }, 50);
      }
    }
  }, []);

  // Handle scroll events to detect when user scrolls up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    autoScrollRef.current = isNearBottom;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && autoScrollRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

  // Scroll to bottom when component first loads with messages
  useEffect(() => {
    if (messages.length > 0 && !chatLoading) {
      const timer = setTimeout(() => {
        scrollToBottom('auto');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chatLoading, messages.length, scrollToBottom]);

  // Manual scroll to bottom button
  const ScrollToBottomButton = () => {
    if (showScrollButton && messages.length > 0) {
      return (
        <Button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-24 right-4 md:right-6 h-10 w-10 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
          size="icon"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      );
    }
    return null;
  };

  useEffect(() => {
    if (sessionStatus === "loading") return;
    
    if (sessionStatus === "unauthenticated" || !userId) {
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
                lastMessage: lastMsg.messageType === 'image' ? '📷 Image' : lastMsg.content,
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
  }, [conversationId, rideId, driverId, userId, sessionStatus, router]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }

      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendImageMessage = async () => {
    if (!selectedImage || !userId) return;

    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(selectedImage);
      const success = await sendMessage('', 'image', imageUrl);
      
      if (success) {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        autoScrollRef.current = true;
        scrollToBottom('smooth');
      } else {
        setError("Failed to send image");
      }
    } catch (error) {
      console.error("Error sending image:", error);
      setError("Failed to send image: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const sendTextMessage = async () => {
    if (!messageInput.trim() || !userId) {
      return;
    }

    const content = messageInput;
    setMessageInput("");
    
    try {
      const success = await sendMessage(content, 'text');
      if (!success) {
        setError("Failed to send message");
      } else {
        autoScrollRef.current = true;
        scrollToBottom('smooth');
      }
    } catch (error) {
      setError("Failed to send message: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (!success) {
        setError("Failed to delete message");
      }
    } catch (error) {
      setError("Failed to delete message: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const openImagePreview = (imageUrl: string) => {
    setSelectedImageForPreview(imageUrl);
    setIsImagePreviewOpen(true);
  };

  const getContactName = () => {
    if (!conversation || !userId) return "Unknown Contact";
    const otherParticipant = conversation.participants.find((p) => p._id !== userId);
    return otherParticipant?.fullName || "Unknown Contact";
  };

  const getContactAvatar = () => {
    if (!conversation || !userId) return null;
    const otherParticipant = conversation.participants.find((p) => p._id !== userId);
    return otherParticipant?.profilePicture || null;
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

  // Mobile Conversations Sidebar
  const ConversationsSidebar = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Conversations</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
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
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? "bg-accent" : "hover:bg-accent/50"
                }`}
                onClick={() => {
                  router.push(`/user/chat?conversationId=${conv._id}`);
                  setShowConversations(false);
                }}
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={otherParticipant?.profilePicture} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {otherParticipant?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className={`font-medium text-sm truncate ${isUnread ? "font-bold" : ""}`}>
                      {otherParticipant?.fullName || "Unknown Contact"}
                    </h3>
                    <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{lastMessagePreview}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {typingUsers.includes(otherParticipant?._id || "") && (
                      <Badge variant="secondary" className="text-xs">
                        Typing...
                      </Badge>
                    )}
                    {isUnread && (
                      <Badge className="h-2 w-2 p-0 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  if (sessionStatus === "loading") {
    return (
      <MainLayout activeItem="Chat">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Chat">
      <div className="h-screen flex flex-col safe-area-inset-bottom">
        {/* Mobile Header */}
        <div className="md:hidden border-b bg-background p-4 flex items-center justify-between">
          <Sheet open={showConversations} onOpenChange={setShowConversations}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <ConversationsSidebar />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2 flex-1 justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={getContactAvatar()} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getContactName().charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{getContactName()}</span>
          </div>
          
          <div className="w-9"></div> {/* Spacer for balance */}
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Desktop Conversations Sidebar */}
          <div className="hidden md:flex md:w-1/3 lg:w-1/4 h-full">
            <Card className="flex flex-col w-full h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-muted-foreground text-center mt-4 p-4">
                    No conversations found. Start a new one!
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-4">
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
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                              isActive ? "bg-accent" : "hover:bg-accent/50"
                            }`}
                            onClick={() => router.push(`/user/chat?conversationId=${conv._id}`)}
                          >
                            <Avatar className="h-12 w-12 mr-3">
                              <AvatarImage src={otherParticipant?.profilePicture} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {otherParticipant?.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <h3 className={`font-medium text-sm truncate ${isUnread ? "font-bold" : ""}`}>
                                  {otherParticipant?.fullName || "Unknown Contact"}
                                </h3>
                                <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{lastMessagePreview}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {typingUsers.includes(otherParticipant?._id || "") && (
                                  <Badge variant="secondary" className="text-xs">
                                    Typing...
                                  </Badge>
                                )}
                                {isUnread && (
                                  <Badge className="h-2 w-2 p-0 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex flex-col w-full h-full rounded-none md:rounded-lg">
              {/* Desktop Header */}
              <CardHeader className="hidden md:flex border-b pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getContactAvatar()} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getContactName().charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{getContactName()}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={isConnected ? "default" : "secondary"}
                          className={`text-xs ${isConnected ? "bg-green-500" : "bg-yellow-500"}`}
                        >
                          {isConnected ? "Online" : "Connecting..."}
                        </Badge>
                        {typingUsers.some(id => id !== userId) && (
                          <Badge variant="outline" className="text-xs">
                            Typing...
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {/* Main Chat Content */}
              <div className="flex-1 flex flex-col min-h-0">
                {displayError && (
                  <div className="bg-destructive/10 text-destructive p-3 flex items-center justify-between shrink-0">
                    <span className="text-sm">{displayError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        setChatError(null);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div className="border-b p-4 bg-muted/50 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Send Image</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeSelectedImage}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded-md cursor-pointer"
                          onClick={() => openImagePreview(imagePreview)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-1 -right-1 h-6 w-6 p-0 bg-background/80 rounded-full"
                          onClick={() => openImagePreview(imagePreview)}
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          {selectedImage?.name}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={sendImageMessage}
                            disabled={isUploading}
                            size="sm"
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Send Image
                          </Button>
                          <Button
                            variant="outline"
                            onClick={removeSelectedImage}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 relative min-h-0">
                  <ScrollArea
                    ref={scrollAreaRef}
                    className="h-full w-full"
                    onScroll={handleScroll}
                  >
                    <div className="p-4">
                      {chatLoading ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-muted-foreground">Loading messages...</span>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <div className="text-center text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No messages yet</p>
                            <p className="text-sm">Start the conversation!</p>
                            {!isConnected && (
                              <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800">
                                Connecting to chat...
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pb-4">
                          {messages.map((msg) => (
                            <div
                              key={msg._id}
                              className={`flex ${msg.senderId._id === userId ? "justify-end" : "justify-start"}`}
                            >
                              <div className="flex flex-col max-w-[85%]">
                                {msg.senderId._id !== userId && (
                                  <span className="text-xs text-muted-foreground mb-1">
                                    {msg.senderId.fullName}
                                  </span>
                                )}
                                <div
                                  className={`relative group rounded-2xl p-3 ${
                                    msg.senderId._id === userId 
                                      ? "bg-primary text-primary-foreground rounded-br-md" 
                                      : "bg-muted rounded-bl-md"
                                  }`}
                                >
                                  {/* Message Menu for user's own messages */}
                                  {!msg.isDeleted && msg.senderId._id === userId && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                                            msg.senderId._id === userId 
                                              ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" 
                                              : "bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/30"
                                          }`}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteMessage(msg._id)}
                                          className="text-destructive cursor-pointer flex items-center gap-2"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}

                                  {/* Message Content */}
                                  {msg.isDeleted ? (
                                    <div className="italic text-muted-foreground text-sm">
                                      This message was deleted
                                    </div>
                                  ) : msg.messageType === 'image' && msg.imageUrl ? (
                                    <div className="space-y-2">
                                      <div className="relative">
                                        <img
                                          src={msg.imageUrl}
                                          alt="Shared image"
                                          className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => openImagePreview(msg.imageUrl!)}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/50 hover:bg-background/70 rounded-full"
                                          onClick={() => openImagePreview(msg.imageUrl!)}
                                        >
                                          <ZoomIn className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      {msg.content && (
                                        <p className="text-sm mt-2">{msg.content}</p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm break-words">{msg.content}</p>
                                  )}
                                  
                                  <span className={`text-xs block mt-2 ${
                                    msg.senderId._id === userId ? "text-primary-foreground/70" : "text-muted-foreground"
                                  }`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Scroll to bottom button */}
                  <ScrollToBottomButton />
                </div>

                {/* Message Input - Fixed at bottom with safe area for mobile */}
                <div className="border-t p-4 bg-background shrink-0 safe-area-inset-bottom">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTypingWrapper();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendTextMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      disabled={!isConnected || !userId || isUploading}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendTextMessage}
                      disabled={!isConnected || !messageInput.trim() || !userId || isUploading}
                      size="default"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-background/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the shared image
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <img
              src={selectedImageForPreview || ''}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImagePreviewOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Chat;