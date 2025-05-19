import { api } from "../api";

export const subscriptionApi = {
  getSubscriptionPlans: async () => {
    try {
      console.log("lppppppppppppppppppppppppp")
      const response = await api.get("/subscriptions/plans");
      console.log("resssssssss", response);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch subscription plans:", error);
      throw error;
    }
  },

  checkSubscription: async (userId: string) => {
    try {
      const response = await api.get(`/subscriptions/check/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to check subscription for user ${userId}:`, error);
      throw error;
    }
  },

  createOrder: async (planId: string) => {
    try {
      const response = await api.post("/subscriptions/create-order", { planId });
      return response.data;
    } catch (error) {
      console.error("Failed to create Razorpay order:", error);
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
    } catch (error) {
      console.error("Failed to verify and subscribe:", error);
      throw error;
    }
  },


};