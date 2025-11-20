import { adminApi } from "./adminApi";
import axios from "axios";

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
      const response = await adminApi.get("/admin/subscriptions"); // Added /admin prefix
      console.log("Subscription Plans Response:", response);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch subscription plans");
      }
      throw new Error("An unknown error occurred");
    }
  },

  createSubscriptionPlan: async (planData: Partial<SubscriptionPlan>) => {
    try {
      const response = await adminApi.post("/admin/subscriptions", planData); // Added /admin prefix
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
      const response = await adminApi.patch(`/admin/subscriptions/${planId}`, planData); // Added /admin prefix
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
      const response = await adminApi.delete(`/admin/subscriptions/${planId}`); // Added /admin prefix
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
      const response = await adminApi.patch(`/admin/subscriptions/${planId}/status`, { status: newStatus }); // Added /admin prefix
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update subscription plan status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};