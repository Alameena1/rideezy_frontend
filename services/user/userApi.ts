// services/user/userApi.ts
import {  serverApiInstance } from "../api";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  country: string;
  state: string;
  status?: "Active" | "Blocked"; // Add status for blocked user check
}

export const userApi = {
  getProfile: async (config: { headers?: { Authorization: string } } = {}) => {
    const response = await serverApiInstance.get("/user/profile", config); // Client-side
    return response.data;
  },
  getProfileServer: async (accessToken: string) => {
    const response = await serverApiInstance.get("/user/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
  updateProfile: async (updatedData: UserProfile) => {
    const response = serverApiInstance.put("/user/profile", updatedData);
    return (await response).data;
  },
  submitGovId: async (data: {
    govId: {
      idNumber: string;
      documentUrl: string;
      verificationStatus: "Pending" | "Verified" | "Rejected";
    };
  }) => {
    const response = await serverApiInstance.put("/user/profile", data);
    return response.data;
  },
  getUser: async (userId: string) => {
    try {
      const response = await serverApiInstance.get(`/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw error;
    }
  },
};