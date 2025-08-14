import Cookies from "js-cookie";
import { api } from "../api";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    Cookies.set("accessToken", response.data.accessToken, {
      expires: 1,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    Cookies.set("refreshToken", response.data.refreshToken, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return response.data;
  },

  logout: async () => {
    const refreshToken = Cookies.get("refreshToken");
    if (!refreshToken) throw new Error("No refresh token found");
    try {
      await api.post("/auth/logout", { refreshToken });
      Cookies.remove("accessToken", { path: "/" });
      Cookies.remove("refreshToken", { path: "/" });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },

  refreshToken: async (data: { refreshToken: string }) => { 
    console.log("Sending refresh token request:", data);
    const response = await api.post("/auth/refresh-token", data);
    console.log("Refresh token response:", response.data);
    return response.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await api.post("/auth/verify-otp", data);
    return response.data;
  },

  resendOtp: async (data: { email: string }) => {
    const response = await api.post("/auth/resend-otp", data);
    return response.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const response = await api.post("/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },
};