import { clientApi } from "../client/client-api";

export interface Message {
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

export interface Conversation {
  _id: string;
  participants: Array<{ _id: string; fullName: string; profilePicture?: string }>;
  createdAt: string;
  rideId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  conversation?: Conversation;
  conversations?: Conversation[];
  messages?: Message[];
  imageUrl?: string;
  deletedMessage?: Message;
}

export const chatApi = {
  getConversation: async (conversationId: string): Promise<ChatResponse> => {
    try {
      console.log("Fetching conversation:", conversationId);
      const response = await clientApi.api.get(`/api/chat/conversations/${conversationId}`);
      console.log("getConversation response:", response);
      return {
        success: response.data.success,
        conversation: response.data.conversation,
      };
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
  },

  getMessages: async (conversationId: string): Promise<ChatResponse> => {
    try {
      console.log("Fetching messages for conversation:", conversationId);
      const response = await clientApi.api.get(`/api/chat/conversations/${conversationId}/messages`);
      console.log("getMessages response:", response);
      return {
        success: response.data.success,
        messages: response.data.messages,
      };
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  createConversation: async (participants: string[]): Promise<ChatResponse> => {
    try {
      console.log("Creating conversation with participants:", participants);
      const response = await clientApi.api.post("/api/chat/conversations", { participants });
      console.log("createConversation response:", response);
      return {
        success: response.data.success,
        conversation: response.data.conversation,
      };
    } catch (error) {
      console.error("Failed to create conversation:", error);
      throw error;
    }
  },

  sendMessage: async (conversationId: string, content: string): Promise<ChatResponse> => {
    try {
      const response = await clientApi.api.post(`/api/chat/conversations/${conversationId}/messages`, { content });
      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  },

  sendImageMessage: async (conversationId: string, formData: FormData): Promise<ChatResponse> => {
    try {
      console.log("Sending image message to conversation:", conversationId);
      const response = await clientApi.api.post(`/api/chat/conversations/${conversationId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("sendImageMessage response:", response);
      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Failed to send image message:", error);
      throw error;
    }
  },

  deleteMessage: async (messageId: string): Promise<ChatResponse> => {
    try {
      console.log("Deleting message:", messageId);
      const response = await clientApi.api.delete(`/api/chat/messages/${messageId}`);
      console.log("deleteMessage response:", response);
      return {
        success: response.data.success,
        message: response.data.message,
        deletedMessage: response.data.deletedMessage,
      };
    } catch (error) {
      console.error("Failed to delete message:", error);
      throw error;
    }
  },

  uploadChatImage: async (formData: FormData): Promise<ChatResponse> => {
    try {
      console.log("Uploading chat image");
      // FIXED: Added /api prefix to match backend route
      const response = await clientApi.api.post('/api/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("uploadChatImage response:", response);
      return {
        success: response.data.success,
        imageUrl: response.data.imageUrl,
      };
    } catch (error) {
      console.error("Failed to upload chat image:", error);
      throw error;
    }
  },

  getUserConversations: async (userId: string): Promise<ChatResponse> => {
    try {
      console.log("Fetching conversations for user:", userId);
      const response = await clientApi.api.get(`/api/chat/users/${userId}/conversations`);
      console.log("getUserConversations response:", response.data);
      return {
        success: response.data.success,
        conversations: response.data.conversations,
      };
    } catch (error) {
      console.error(`Failed to fetch conversations for user ${userId}:`, error);
      throw error;
    }
  },

  getOrCreateRideConversation: async (data: { rideId: string; driverId: string; userId: string }): Promise<ChatResponse> => {
    try {
      console.log("Getting or creating ride conversation:", data);
      const response = await clientApi.api.post("/api/chat/ride-conversation", data);
      console.log("getOrCreateRideConversation response:", response);
      return {
        success: response.data.success,
        conversation: response.data.conversation,
      };
    } catch (error) {
      console.error("Failed to get or create ride conversation:", error);
      throw error;
    }
  },
};

export default chatApi;