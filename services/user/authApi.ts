// services/user/authApi.ts
import { serverApiInstance } from "../api";

export const authApi = {
  // Server-side methods (for server components and API routes)
  login: async (email: string, password: string, credentials: { email: string; password: string; }) => {
    const response = await serverApiInstance.post("/auth/login", credentials);
    return response.data;
  },
  googleAuthServer: async (payload: { fullName: string; email: string; image: string; idToken: string }) => {
    const response = await serverApiInstance.post("/auth/google-auth", payload);
    return response.data;
  },
  verifyOtpServer: async (data: { email: string; otp: string }) => {
    const response = await serverApiInstance.post("/auth/verify-otp", data);
    return response.data;
  },
  resendOtpServer: async (data: { email: string }) => {
    const response = await serverApiInstance.post("/auth/resend-otp", data);
    return response.data;
  },
  forgotPasswordServer: async (data: { email: string }) => {
    const response = await serverApiInstance.post("/auth/forgot-password", data);
    return response.data;
  },
  resetPasswordServer: async (data: { token: string; password: string }) => {
    const response = await serverApiInstance.post("/auth/reset-password", data);
    return response.data;
  },
};

