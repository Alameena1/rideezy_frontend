import { serverApiInstance } from "../api";
import { USER_ROUTES } from "../../constants/apiRoutes";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  country: string;
  state: string;
  status?: "Active" | "Blocked";
}

export const userApi = {
  getProfile: async (config: { headers?: { Authorization: string } } = {}) => {
    const response = await serverApiInstance.get(USER_ROUTES.PROFILE, config);
    return response.data;
  },
  
  getProfileServer: async (accessToken: string) => {
    const response = await serverApiInstance.get(USER_ROUTES.PROFILE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
  
  updateProfile: async (updatedData: UserProfile) => {
    const response = serverApiInstance.put(USER_ROUTES.UPDATE_PROFILE, updatedData);
    return (await response).data;
  },
  
  submitGovId: async (data: {
    govId: {
      idNumber: string;
      documentUrl: string;
      verificationStatus: "Pending" | "Verified" | "Rejected";
    };
  }) => {
    const response = await serverApiInstance.put(USER_ROUTES.SUBMIT_GOV_ID, data);
    return response.data;
  },
  
  getUser: async (userId: string) => {
    try {
      const response = await serverApiInstance.get(USER_ROUTES.GET_USER(userId));
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw error;
    }
  },
};