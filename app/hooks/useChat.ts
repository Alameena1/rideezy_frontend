import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocketStore } from '../stores/socketStore';
import { useSession } from 'next-auth/react';
import { chatApi } from '../../services/user/chatApi';

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

export const useChat = (conversationId: string, userId: string) => {
  const { data: session } = useSession();
  const { socket, isConnected, error: socketError, setError: setSocketError, connect, disconnect } = useSocketStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState(socketError);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnected = useRef(false);
  const prevConversationId = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  const handleTypingUpdate = useCallback(({ userId: typerId, isTyping }: { userId: string; isTyping: boolean }) => {
    console.log('⌨️ Typing update:', { typerId, isTyping });
    setTypingUsers((prev) =>
      isTyping ? [...new Set([...prev, typerId])] : prev.filter((id) => id !== typerId)
    );
  }, []);

  // Prevent duplicate messages
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      if (messageIdsRef.current.has(message._id)) {
        console.log('🚫 Duplicate message prevented:', message._id);
        return prev;
      }
      
      messageIdsRef.current.add(message._id);
      console.log('📨 Adding message:', { id: message._id, content: message.content });
      
      // Replace optimistic message if it exists
      if (message.senderId._id === userId) {
        const withoutOptimistic = prev.filter((m) => !m._id.startsWith(`optimistic-`));
        return [...withoutOptimistic, message];
      }
      
      return [...prev, message];
    });
  }, [userId]);

  // Load messages via HTTP API as fallback - FIXED VERSION
  const loadMessagesViaAPI = useCallback(async (convId: string) => {
    try {
      console.log('📡 Loading messages via API for conversation:', convId);
      const response = await chatApi.getMessages(convId);
      console.log('📨 API Response:', response);
      
      if (response.success && response.messages) {
        console.log('✅ Messages loaded via API:', response.messages.length);
        
        // Clear existing messages and add new ones
        messageIdsRef.current.clear();
        response.messages.forEach((msg: Message) => {
          messageIdsRef.current.add(msg._id);
          console.log('➕ Adding message from API:', msg._id, msg.content);
        });
        
        // Set messages directly - FIX: This was missing proper state update
        const formattedMessages = response.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.createdAt).toISOString(),
        }));
        
        console.log('🔄 Setting messages state with:', formattedMessages.length, 'messages');
        setMessages(formattedMessages);
        setIsLoading(false);
        
        return true;
      } else {
        console.error('❌ API response not successful:', response);
        setIsLoading(false);
        return false;
      }
    } catch (apiError) {
      console.error('❌ Failed to load messages via API:', apiError);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    console.log('🔄 useChat effect running:', { 
      conversationId, 
      userId, 
      hasSession: !!session,
      socketConnected: isConnected,
      socketExists: !!socket
    });

    if (!conversationId || !userId || !session) {
      console.log('❌ Missing requirements:', { conversationId, userId, hasSession: !!session });
      setError('Missing conversation ID, user ID, or authentication');
      return;
    }

    const initializeChat = async () => {
      setIsLoading(true);
      console.log('🔄 Initializing chat...', { conversationId, userId });
      
      // Load messages via API first as fallback
      const apiLoaded = await loadMessagesViaAPI(conversationId);
      
      if (!apiLoaded) {
        console.log('❌ API failed to load messages, continuing with socket...');
      }

      if (!hasConnected.current) {
        console.log('🔌 Connecting socket...');
        await connect(userId);
        hasConnected.current = true;
      }

      if (socket && isConnected) {
        console.log('✅ Socket connected, setting up listeners...');
        
        // Leave previous conversation if different
        if (prevConversationId.current && prevConversationId.current !== conversationId) {
          console.log('🔄 Leaving previous conversation:', prevConversationId.current);
          socket.emit('leaveConversation', prevConversationId.current);
          messageIdsRef.current.clear();
        }
        
        // Join new conversation
        console.log('🎯 Joining conversation:', conversationId);
        socket.emit('joinConversation', conversationId, (joinError?: string) => {
          if (joinError) {
            console.error('❌ Failed to join conversation:', joinError);
            setError(joinError);
          } else {
            console.log('✅ Successfully joined conversation via socket');
          }
        });

        // Chat history event
        const chatHistoryHandler = (history: Message[]) => {
          console.log('📨 Received chat history via socket:', history.length, 'messages');
          
          if (history.length === 0) {
            console.log('📭 No messages in socket history');
            setIsLoading(false);
            return;
          }
          
          const uniqueHistory = history.filter(msg => !messageIdsRef.current.has(msg._id));
          console.log('🆕 Unique messages from socket:', uniqueHistory.length);
          
          uniqueHistory.forEach(msg => {
            messageIdsRef.current.add(msg._id);
            console.log('➕ Adding message from socket:', msg._id, msg.content);
          });
          
          if (uniqueHistory.length > 0) {
            setMessages(prev => {
              const newMessages = uniqueHistory.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.createdAt).toISOString(),
              }));
              
              console.log('🔄 Merging socket messages with existing:', prev.length, '->', prev.length + newMessages.length);
              return [...prev, ...newMessages];
            });
          }
          
          setIsLoading(false);
        };

        // New message event
        const newMessageHandler = (message: Message) => {
          console.log('📨 New message received:', { 
            id: message._id, 
            conversationId: message.conversationId,
            currentConversationId: conversationId,
            content: message.content
          });
          
          if (message.conversationId !== conversationId) {
            console.log('🚫 Message for different conversation, ignoring');
            return;
          }
          
          addMessage({
            ...message,
            timestamp: new Date(message.createdAt).toISOString(),
          });
        };

        // Message deleted event
        const messageDeletedHandler = (data: { messageId: string; conversationId: string }) => {
          console.log('🗑️ Message deleted:', data);
          if (data.conversationId !== conversationId) return;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId
                ? {
                    ...msg,
                    isDeleted: true,
                    content: 'This message was deleted',
                    imageUrl: undefined,
                    fileUrl: undefined,
                    fileName: undefined,
                  }
                : msg
            )
          );
        };

        // Set up event listeners
        socket.on('chatHistory', chatHistoryHandler);
        socket.on('newMessage', newMessageHandler);
        socket.on('messageDeleted', messageDeletedHandler);
        socket.on('typing', handleTypingUpdate);

        prevConversationId.current = conversationId;

        // Cleanup function
        return () => {
          console.log('🧹 Cleaning up socket listeners for conversation:', conversationId);
          socket.off('chatHistory', chatHistoryHandler);
          socket.off('newMessage', newMessageHandler);
          socket.off('messageDeleted', messageDeletedHandler);
          socket.off('typing', handleTypingUpdate);
        };
      } else {
        console.log('❌ Socket not ready, using API only:', { socket: !!socket, isConnected });
        setIsLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (socket && !conversationId) {
        console.log('🔌 Disconnecting socket due to no conversation');
        disconnect();
        hasConnected.current = false;
        messageIdsRef.current.clear();
      }
    };
  }, [conversationId, userId, socket, isConnected, connect, disconnect, handleTypingUpdate, session, addMessage, loadMessagesViaAPI]);

  // Rest of the functions remain the same...
  const handleTyping = useCallback(() => {
    if (!socket || !conversationId) {
      console.log('❌ Cannot send typing indicator:', { socket: !!socket, conversationId });
      return;
    }

    console.log('⌨️ Sending typing indicator');
    socket.emit('typing', { conversationId, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', { conversationId, isTyping: false });
      console.log('⌨️ Typing indicator cleared');
    }, 3000);
  }, [conversationId, socket]);

  const sendMessage = async (content: string, messageType: 'text' | 'image' | 'file' = 'text', imageUrl?: string, fileUrl?: string, fileName?: string) => {
    console.log('📤 Sending message:', { content, messageType, imageUrl: !!imageUrl });
    
    if (!content.trim() && messageType === 'text') {
      console.log('❌ Empty message content');
      return false;
    }
    
    if (!conversationId || !socket || !isConnected || !userId) {
      const errorMsg = 'Cannot send message: not connected, invalid input, or user not authenticated';
      console.error('❌', errorMsg, { conversationId, socket: !!socket, isConnected, userId });
      setError(errorMsg);
      return false;
    }

    try {
      // Create optimistic message
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optimisticMessage: Message = {
        _id: optimisticId,
        conversationId,
        senderId: { _id: userId, fullName: 'You' },
        content,
        messageType,
        imageUrl,
        fileUrl,
        fileName,
        isDeleted: false,
        timestamp: new Date().toISOString(),
        createdAt: new Date(),
      };
      
      console.log('➕ Adding optimistic message:', optimisticId);
      addMessage(optimisticMessage);

      await new Promise<void>((resolve, reject) => {
        console.log('📤 Emitting sendMessage via socket');
        socket.emit('sendMessage', { 
          conversationId, 
          content, 
          messageType,
          imageUrl,
          fileUrl,
          fileName
        }, (sendError?: string) => {
          if (sendError) {
            console.error('❌ Send message error:', sendError);
            reject(new Error(sendError));
          } else {
            console.log('✅ Message sent successfully');
            resolve();
          }
        });
      });
      return true;
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg._id.startsWith('optimistic-')));
      
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return false;
    }
  };

  const deleteMessage = async (messageId: string) => {
    console.log('🗑️ Deleting message:', messageId);
    
    if (!conversationId || !socket || !isConnected || !userId) {
      const errorMsg = 'Cannot delete message: not connected or user not authenticated';
      console.error('❌', errorMsg);
      setError(errorMsg);
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        socket.emit('deleteMessage', { messageId }, (deleteError?: string) => {
          if (deleteError) {
            console.error('❌ Delete message error:', deleteError);
            reject(new Error(deleteError));
          } else {
            console.log('✅ Message deleted successfully');
            resolve();
          }
        });
      });
      return true;
    } catch (err) {
      console.error('❌ Failed to delete message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      return false;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    console.log('📸 Uploading image:', file.name);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await chatApi.uploadChatImage(formData);
      
      if (!response.success || !response.imageUrl) {
        throw new Error(response.message || 'Failed to upload image');
      }

      console.log('✅ Image uploaded successfully:', response.imageUrl);
      return response.imageUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  useEffect(() => {
    if (socketError && socketError !== error) {
      console.log('🔴 Socket error propagated:', socketError);
      setError(socketError);
    }
  }, [socketError, error]);

  console.log('🔄 useChat state:', { 
    messagesCount: messages.length, 
    isLoading, 
    isConnected,
    error,
    typingUsersCount: typingUsers.length,
    messageIds: Array.from(messageIdsRef.current).slice(0, 5) // Show first 5 message IDs for debugging
  });

  return {
    messages,
    setMessages,
    error,
    isConnected,
    typingUsers,
    handleTyping,
    sendMessage,
    deleteMessage,
    uploadImage,
    setError,
    isLoading,
  };
};