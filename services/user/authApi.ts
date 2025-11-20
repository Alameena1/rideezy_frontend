import { serverApiInstance } from "../api";
import { AUTH_ROUTES } from "../../constants/apiRoutes";

export const authApi = {
  login: async (email: string, password: string, credentials: { email: string; password: string; }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.LOGIN, credentials);
    return response.data;
  },
  
  googleAuthServer: async (payload: { fullName: string; email: string; image: string; idToken: string }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.GOOGLE_AUTH, payload);
    return response.data;
  },
  
  verifyOtpServer: async (data: { email: string; otp: string }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.VERIFY_OTP, data);
    return response.data;
  },
  
  resendOtpServer: async (data: { email: string }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.RESEND_OTP, data);
    return response.data;
  },
  
  forgotPasswordServer: async (data: { email: string }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.FORGOT_PASSWORD, data);
    return response.data;
  },
  
  resetPasswordServer: async (data: { token: string; password: string }) => {
    const response = await serverApiInstance.post(AUTH_ROUTES.RESET_PASSWORD, data);
    return response.data;
  },
};