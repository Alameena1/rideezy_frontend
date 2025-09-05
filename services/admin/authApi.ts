import Cookies from "js-cookie";
import axios from "axios";
import { adminApi } from "./adminApi";

export const adminAuthApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await adminApi.post("/login", { email, password });
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
      const response = await adminApi.post("/logout");
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
      const refreshToken = Cookies.get("refreshToken");
      if (!refreshToken) throw new Error("No refresh token found");
      const response = await adminApi.post("/refresh-token", { refreshToken });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Token refresh failed");
      }
      throw new Error("An unknown error occurred");
    }
  },
};
