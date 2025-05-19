import { adminApi } from "./adminApi";

export const adminUserApi = {
  getUsers: async () => {
    try {
      const response = await adminApi.get("/users");
      return response.data.users;
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
};