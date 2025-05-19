import { api } from "../api";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  country: string;
  state: string;
}

export const userApi = {
  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  updateProfile: async (updatedData: UserProfile) => {
    const response = await api.put("/user/profile", updatedData);
    return response.data;
  },

  submitGovId: async (data: {
    govId: {
      idNumber: string;
      documentUrl: string;
      verificationStatus: "Pending" | "Verified" | "Rejected";
    };
  }) => {
    const response = await api.put("/user/profile", data);
    return response.data;
  },

  getUser: async (userId: string) => {
    try {
      const response = await api.get(`/user/${userId}`);
      console.log("response", response);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw error;
    }
  },
};