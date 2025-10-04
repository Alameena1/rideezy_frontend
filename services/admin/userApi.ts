import axios from "axios";
import { adminApi } from "./adminApi";

interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "Active" | "Blocked";
  subscriptionStatus?: "subscribed" | "non-subscribed";
}

export const adminUserApi = {
  getUsers: async (query: PaginationQuery = {}) => {
    try {
      const response = await adminApi.get("/users", { params: query });
      console.log("Fetched Users:", response.data);
      return response.data; 
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch users");
      }
      throw new Error("An unknown error occurred");
    }
  },

  toggleUserStatus: async (userId: string, newStatus: "Active" | "Blocked") => {
    try {
      const response = await adminApi.patch(`/users/${userId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update user status");
      }
      throw new Error("An unknown error occurred");
    }
  },
   verifyGovId: async (userId: string, status: "Verified" | "Rejected", rejectionNote?: string) => {
    try {
      const response = await adminApi.post("/verify-gov-id", { userId, status, rejectionNote });
      console.log("Gov ID Verification:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to verify government ID");
      }
      throw new Error("An unknown error occurred");
    }
  },
};