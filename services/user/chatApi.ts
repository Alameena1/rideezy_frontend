// src/services/api/chatApi.ts
import { api } from "../api";

interface Message {
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

export const chatApi = {
  getConversation: async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      console.log("popopopoop",response)
      return {
        success: response.data.success,
        conversation: response.data.conversation,
      };
    } catch (error) {
      console.error(`Failed to fetch conversation ${conversationId}:`, error);
      throw error;
    }
  },

  getMessages: async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      return {
        success: response.data.success,
        messages: response.data.messages,
      };
    } catch (error) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  createConversation: async (participants: string[]) => {
    try {
      const response = await api.post("/chat/conversations", { participants });
      return {
        success: response.data.success,
        conversation: response.data.conversation,
      };
    } catch (error) {
      console.error("Failed to create conversation:", error);
      throw error;
    }
  },

  sendMessage: async (convId: string | undefined, conversationId: string, token: string | null, content: string) => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  },

  getUserConversations: async (userId: string) => {
    try {
      const response = await api.get(`/chat/users/${userId}/conversations`);
      return {
        success: response.data.success,
        conversations: response.data.conversations,
      };
    } catch (error) {
      console.error(`Failed to fetch conversations for user ${userId}:`, error);
      throw error;
    }
  },

  getOrCreateRideConversation: async (data: { rideId: string; driverId: string }) => {
    try {
      const response = await api.post("/chat/ride-conversation", data);
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