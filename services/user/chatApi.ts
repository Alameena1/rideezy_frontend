// services/client/chatApi.ts
import { clientApi } from "../client-api";

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
      console.log("Fetching conversation:", conversationId);
      const response = await clientApi.api.get(`/chat/conversations/${conversationId}`);
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

  getMessages: async (conversationId: string) => {
    try {
      console.log("Fetching messages for conversation:", conversationId);
      const response = await clientApi.api.get(`/chat/conversations/${conversationId}/messages`);
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

  createConversation: async (participants: string[]) => {
    try {
      console.log("Creating conversation with participants:", participants);
      const response = await clientApi.api.post("/chat/conversations", { participants });
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

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const response = await clientApi.api.post(`/chat/conversations/${conversationId}/messages`, { content });
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
      console.log("Fetching conversations for user:", userId);
      const response = await clientApi.api.get(`/chat/users/${userId}/conversations`);
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

  getOrCreateRideConversation: async (data: { rideId: string; driverId: string; userId: string }) => {
    try {
      console.log("Getting or creating ride conversation:", data);
      const response = await clientApi.api.post("/chat/ride-conversation", data);
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