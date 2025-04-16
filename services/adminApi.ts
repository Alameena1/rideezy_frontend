import axios from "axios";

const API_URL = "http://localhost:5000/admin";
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  response => response,
  
  async error => {
    
    console.log("Interceptor caught error:", error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      try {
        console.log("Attempting to refresh token...");
        await adminApi.refreshToken();
        console.log("Token refreshed, retrying request...");
        return axiosInstance(error.config);
      } catch (refreshError) {
        console.error("Refresh failed:", refreshError.response?.data);
        window.location.href = "/admin/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post("/login", { email, password });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Authentication failed");
      }
      throw new Error("An unknown error occurred");
    }
  },

  refreshToken: async () => {
    try {
      const response = await axiosInstance.post("/refresh", {});
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Token refresh failed");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getUsers: async () => {
    try {
      const response = await axiosInstance.get("/users");
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
      const response = await axiosInstance.patch(`/users/${userId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update user status");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getVehicles: async () => {
    try {
      const response = await axiosInstance.get("/vehicles");
      const { vehicles } = response.data; // Destructure the vehicles array
      return vehicles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch vehicles");
      }
      throw new Error("An unknown error occurred");
    }
  },

  // New method to update vehicle status (to support approve/reject functionality)
  updateVehicleStatus: async (vehicleId: string, status: "Approved" | "Rejected", note?: string) => {
    try {
      const response = await axiosInstance.patch(`/vehicles/${vehicleId}/status`, { status, note });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update vehicle status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};