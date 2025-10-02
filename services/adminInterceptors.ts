// services/adminInterceptors.ts - UPDATED
import axios from "axios";
import { getSession } from "next-auth/react";

export const createAdminApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  api.interceptors.request.use(
    async (config) => {
      const unauthenticatedRoutes = ["/admin/login", "/admin/refresh-token", "/admin/logout"];
      
      // Skip auth for unauthenticated routes
      if (config.url && unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
        return config;
      }

      try {
        // Get session from NextAuth instead of cookies
        const session = await getSession();
        const accessToken = (session?.user as any)?.accessToken;

        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          console.log("🔐 Admin API: Using NextAuth token for request");
        } else {
          console.warn("⚠️ Admin API: No access token found in session");
        }
        
        return config;
      } catch (error) {
        console.error("Failed to get admin session:", error);
        return config;
      }
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle blocked user
      if (
        error.response?.status === 403 &&
        error.response?.data?.message === "Your account has been blocked. Contact support."
      ) {
        console.error("❌ Admin account blocked");
        return Promise.reject(error);
      }

      // Handle token refresh (using NextAuth)
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/admin/login") &&
        !originalRequest.url?.includes("/admin/refresh-token") &&
        !originalRequest.url?.includes("/admin/logout")
      ) {
        originalRequest._retry = true;

        try {
          console.log("🔄 Admin API: Token expired, attempting refresh...");
          
          const session = await getSession();
          const refreshToken = (session?.user as any)?.refreshToken;

          if (!refreshToken) {
            throw new Error("No refresh token found in session");
          }

          // Call your backend refresh endpoint
          const response = await axios.post(
            `${baseURL}/admin/refresh-token`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

          // Update the session (NextAuth will handle this)
          // Note: You might need to trigger a session update here
          
          // Retry original request with new token
          api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          console.log("✅ Admin API: Token refreshed successfully");
          return api(originalRequest);
        } catch (refreshError) {
          console.error("❌ Admin API: Token refresh failed:", refreshError);
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = "/admin/login";
          }
          return Promise.reject(refreshError);
        }
      }

      console.log("Admin API Error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};