import axios from "axios";
import Cookies from "js-cookie";
import router from "next/router";
import { getRefreshToken, getValidToken } from "../app/utils/auth"; // Adjust path to your auth.ts file

export const createUserApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL, // e.g., http://localhost:3001/api
    headers: {
      "Content-Type": "application/json",
    },
  });

  api.interceptors.request.use(
    async (config) => {
      // Skip adding Authorization header for unauthenticated routes
      const unauthenticatedRoutes = [
        "/auth/verify-otp",
        "/auth/resend-otp",
        "/auth/login",
        "/auth/signup",
        "/auth/refresh-token",
      ];
      if (config.url && unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
        return config;
      }

      try {
        const token = await getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      } catch (error) {
        console.error("Failed to get valid token:", error);
        return config; // Proceed without token to avoid blocking the request
      }
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      console.log("Interceptor error:", error.response?.status, error.response?.data, "URL:", error.config?.url);
      const originalRequest = error.config;

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/verify-otp") &&
        !originalRequest.url?.includes("/auth/resend-otp") &&
        !originalRequest.url?.includes("/auth/login") &&
        !originalRequest.url?.includes("/auth/refresh-token")
      ) {
        console.log("Attempting to refresh token...");
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) throw new Error("No refresh token found");

          const response = await axios.post(
            `${baseURL}/auth/refresh-token`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

          Cookies.set("accessToken", newAccessToken, {
            expires: 1,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
          });

          if (newRefreshToken) {
            Cookies.set("refreshToken", newRefreshToken, {
              expires: 7,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/",
            });
          }

          api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          console.log("Retrying original request:", originalRequest.url);
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          Cookies.remove("accessToken", { path: "/" });
          Cookies.remove("refreshToken", { path: "/" });
          router.push("/user/login");
          return Promise.reject(refreshError);
        }
      }

      console.log("Interceptor rejecting error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};