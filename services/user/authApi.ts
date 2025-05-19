import Cookies from "js-cookie";
import { api } from "../api";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    Cookies.set("accessToken", response.data.accessToken, {
      expires: 1,
      secure: true,
      sameSite: "strict",
    });
    Cookies.set("refreshToken", response.data.refreshToken, {
      expires: 7,
      secure: true,
      sameSite: "strict",
    });
    return response.data;
  },

  logout: async () => {
    const refreshToken = Cookies.get("refreshToken");
    if (!refreshToken) throw new Error("No refresh token found");
    try {
      await api.post("/auth/logout", { refreshToken });
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await api.post("/auth/verify-otp", data);
    return response.data;
  },

  resendOtp: async (data: { email: string }) => {
    const response = await api.post("/auth/resend-otp", data);
    return response.data;
  },
};