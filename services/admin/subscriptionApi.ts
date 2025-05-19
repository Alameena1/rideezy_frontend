import { adminApi } from "./adminApi";

export interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  status: "Active" | "Blocked";
  createdAt: string;
  updatedAt: string;
}

export const adminSubscriptionApi = {
  getSubscriptionPlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const response = await adminApi.get("/subscriptions");
      return response.data.plans;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch subscription plans");
      }
      throw new Error("An unknown error occurred");
    }
  },

  createSubscriptionPlan: async (planData: Partial<SubscriptionPlan>) => {
    try {
      const response = await adminApi.post("/subscriptions", planData);
      return response.data.plan;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to create subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  updateSubscriptionPlan: async (planId: string, planData: Partial<SubscriptionPlan>) => {
    try {
      const response = await adminApi.patch(`/subscriptions/${planId}`, planData);
      return response.data.plan;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  deleteSubscriptionPlan: async (planId: string) => {
    try {
      const response = await adminApi.delete(`/subscriptions/${planId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to delete subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  toggleSubscriptionPlanStatus: async (planId: string, newStatus: "Active" | "Blocked") => {
    try {
      const response = await adminApi.patch(`/subscriptions/${planId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update subscription plan status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};