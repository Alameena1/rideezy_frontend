import axios from "axios";
import Cookies from "js-cookie";

const API_URL = "http://localhost:3001/admin";
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add a request interceptor to include the Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('adminAuthToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added Authorization header:', token);
    } else {
      console.log('No adminAuthToken found in cookies');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log("Interceptor caught error:", error.response?.status, error.response?.data);
    if (error.response?.status === 401 && error.config.url !== "/login") {
      try {
        console.log("Attempting to refresh token...");
        await adminApi.refreshToken();
        console.log("Token refreshed, retrying request...");
        return axiosInstance(error.config);
      } catch (refreshError) {
        console.error("Refresh failed:", refreshError.response?.data);
        Cookies.remove("adminAuthToken");
        Cookies.remove("refreshToken");
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
      console.log("Login response:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Authentication failed");
      }
      throw new Error("An unknown error occurred");
    }
  },

  logout: async () => {
    try {
      const response = await axiosInstance.post("/logout");
      console.log("Logout response:", response.data);
      Cookies.remove("adminAuthToken");
      Cookies.remove("refreshToken");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Logout failed");
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
      return response.data.vehicles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch vehicles");
      }
      throw new Error("An unknown error occurred");
    }
  },

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

  verifyGovId: async (userId: string, status: "Verified" | "Rejected", rejectionNote?: string) => {
    try {
      const response = await axiosInstance.post("/verify-gov-id", { userId, status, rejectionNote });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to verify government ID");
      }
      throw new Error("An unknown error occurred");
    }
  },
};