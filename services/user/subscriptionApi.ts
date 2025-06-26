import { api } from "../api";

export const subscriptionApi = {
  getSubscriptionPlans: async () => {
    try {
      const response = await api.get("/subscriptions/plans");
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch subscription plans:", error.response?.status, error.response?.data);
      throw error;
    }
  },

  checkSubscription: async (userId: string) => {
    try {
      const response = await api.get(`/subscriptions/check/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to check subscription for user ${userId}:`, error.response?.status, error.response?.data);
      throw error;
    }
  },

  createOrder: async (planId: string) => {
    try {
      const response = await api.post("/subscriptions/create-order", { planId });
      return response.data;
    } catch (error: any) {
      console.error("Failed to create Razorpay order:", error.response?.status, error.response?.data);
      throw error;
    }
  },

  verifyAndSubscribe: async (data: {
    userId: string;
    planId: string;
    paymentId: string;
    orderId: string;
    signature: string;
  }) => {
    try {
      const response = await api.post("/subscriptions/verify-and-subscribe", data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to verify and subscribe:", error.response?.status, error.response?.data);
      throw error;
    }
  },

 getSubscriptionStatus: async () => {
    try {
      const response = await api.get("/subscriptions/status", {
        withCredentials: true,
      });
      return response.data; // Returns { success: true, isSubscribed: boolean }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch subscription status");
    }
  },
};