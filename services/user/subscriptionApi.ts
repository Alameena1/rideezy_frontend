import { serverApiInstance } from "../api";
import { SUBSCRIPTION_ROUTES } from "../../constants/apiRoutes";

export interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  maxStartingRides: number;
  maxJoiningRides: number;
  status: "Active" | "Blocked";
  isDeleted: boolean;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  isSubscribed: boolean;
  subscription?: {
    plan: {
      _id: string;
      name: string;
      price: number;
      durationMonths: number;
      description: string;
    };
    originalPrice: number;
    startDate: string;
    endDate: string;
  };
}

export interface OrderResponse {
  message: string;
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
}

export interface SubscribeResponse {
  success: boolean;
  message?: string;
  user: any;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Array<{
    path: string[];
    message: string;
  }>;
}

export const subscriptionApi = {
  getSubscriptionPlans: async (): Promise<{ success: boolean; data: SubscriptionPlan[] }> => {
    try {
      const response = await serverApiInstance.get(SUBSCRIPTION_ROUTES.PLANS);
      return response.data;
    } catch (error: any) {
      console.error("Failed to fetch subscription plans:", error.response?.status, error.response?.data);
      throw error;
    }
  },

  checkSubscription: async (userId: string): Promise<SubscriptionStatusResponse> => {
    try {
      const response = await serverApiInstance.get(SUBSCRIPTION_ROUTES.CHECK(userId));
      return response.data;
    } catch (error: any) {
      console.error(`Failed to check subscription for user ${userId}:`, error.response?.status, error.response?.data);
      throw error;
    }
  },

  createOrder: async (planId: string): Promise<OrderResponse> => {
    try {
      const response = await serverApiInstance.post(SUBSCRIPTION_ROUTES.CREATE_ORDER, { planId });
      return response.data;
    } catch (error: any) {
      console.error("Failed to create Razorpay order:", error.response?.status, error.response?.data);
      
      if (error.response?.data?.errors) {
        const validationError = error.response.data as ErrorResponse;
        throw new Error(validationError.message || "Validation failed");
      }
      
      throw error;
    }
  },

  verifyAndSubscribe: async (data: {
    userId: string;
    planId: string;
    paymentId: string;
    orderId: string;
    signature: string;
  }): Promise<SubscribeResponse> => {
    try {
      const response = await serverApiInstance.post(SUBSCRIPTION_ROUTES.VERIFY, data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to verify and subscribe:", error.response?.status, error.response?.data);
      
      if (error.response?.data?.errors) {
        const validationError = error.response.data as ErrorResponse;
        throw new Error(validationError.message || "Validation failed");
      }
      
      throw error;
    }
  },

  subscribeWithWallet: async (data: { userId: string; planId: string }): Promise<SubscribeResponse> => {
    try {
      const response = await serverApiInstance.post(SUBSCRIPTION_ROUTES.SUBSCRIBE_WALLET, data);
      return response.data;
    } catch (error: any) {
      console.error("Failed to subscribe with wallet:", error.response?.status, error.response?.data);
      
      if (error.response?.data?.errors) {
        const validationError = error.response.data as ErrorResponse;
        throw new Error(validationError.message || "Validation failed");
      }
      
      throw error;
    }
  },

  getSubscriptionStatus: async (): Promise<{ success: boolean; isSubscribed: boolean }> => {
    try {
      const response = await serverApiInstance.get(SUBSCRIPTION_ROUTES.STATUS, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch subscription status");
    }
  },
};