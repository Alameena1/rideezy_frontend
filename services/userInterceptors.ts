"use client";

import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";

export const createUserApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  const useTokenInterceptor = () => {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    useEffect(() => {
      const requestInterceptor = api.interceptors.request.use(
        async (config) => {
          const unauthenticatedRoutes = [
            "/auth/verify-otp",
            "/auth/resend-otp",
            "/auth/login",
            "/auth/signup",
            "/auth/refresh-token",
            "/auth/google-auth",
          ];
          console.log("[Interceptor] Request URL:", config.url);
          if (!config.url) {
            console.warn("[Interceptor] config.url is undefined");
            return config;
          }
          if (unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
            console.log("[Interceptor] Skipping Authorization for:", config.url);
            return config;
          }

          if (status === "loading") {
            console.log("[Interceptor] Session is loading, skipping Authorization");
            return config;
          }
          if (status === "unauthenticated") {
            console.log("[Interceptor] User is unauthenticated, skipping Authorization");
            return config;
          }

          const accessToken = session?.user?.accessToken;
          console.log("[Interceptor] Access token:", accessToken ? "present" : "missing");
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            console.log("[Interceptor] Added Authorization header for:", config.url);
          } else {
            console.warn("[Interceptor] No access token available for:", config.url);
          }
          return config;
        },
        (error) => {
          console.error("[Interceptor] Request error:", error);
          return Promise.reject(error);
        }
      );

      const responseInterceptor = api.interceptors.response.use(
        (response) => response,
        async (error) => {
          console.log("[Interceptor] Response error:", {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
          });
          const originalRequest = error.config;

          const unauthenticatedRoutes = [
            "/auth/verify-otp",
            "/auth/resend-otp",
            "/auth/login",
            "/auth/signup",
            "/auth/refresh-token",
            "/auth/google-auth",
          ];

          // Handle blocked user
          if (
            error.response?.status === 403 &&
            error.response?.data?.message === "You have been blocked by the admin, please contact support"
          ) {
            console.log("[Interceptor] User is blocked, logging out");
            await signOut({ redirect: false });
            router.push("/user/login?error=You%20have%20been%20blocked%20by%20the%20admin%2C%20please%20contact%20support");
            return Promise.reject(error);
          }

          // Handle token expiration
          if (
            error.response?.status === 401 &&
            error.response?.data?.message === "Access token expired, please refresh" &&
            originalRequest &&
            !originalRequest._retry &&
            !unauthenticatedRoutes.some((route) => originalRequest.url.includes(route))
          ) {
            console.log("[Interceptor] Attempting to refresh token for:", originalRequest.url);
            originalRequest._retry = true;

            try {
              const refreshToken = session?.user?.refreshToken;
              console.log("[Interceptor] Refresh token:", refreshToken ? "present" : "missing");
              if (!refreshToken) {
                console.error("[Interceptor] No refresh token found");
                await signOut({ redirect: false });
                router.push("/user/login?error=No%20refresh%20token%20found");
                throw new Error("No refresh token found");
              }

              const response = await axios.post(
                `${baseURL}/auth/refresh-token`,
                { refreshToken },
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
              );

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
              console.log("[Interceptor] Refresh token response:", { newAccessToken, newRefreshToken });

              if (!newAccessToken) {
                console.error("[Interceptor] Refresh token response missing accessToken");
                await signOut({ redirect: false });
                router.push("/user/login?error=Invalid%20refresh%20token%20response");
                throw new Error("Invalid refresh token response");
              }

              await update({
                ...session,
                user: {
                  ...session?.user,
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken || session?.user?.refreshToken,
                },
              });

              api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              console.log("[Interceptor] Retrying original request:", originalRequest.url);
              return api(originalRequest);
            } catch (refreshError) {
              console.error("[Interceptor] Refresh token failed:", refreshError);
              await signOut({ redirect: false });
              router.push("/user/login?error=Failed%20to%20refresh%20token");
              return Promise.reject(refreshError);
            }
          }

          console.log("[Interceptor] Rejecting error:", error.response?.status, error.response?.data);
          return Promise.reject(error);
        }
      );

      return () => {
        api.interceptors.request.eject(requestInterceptor);
        api.interceptors.response.eject(responseInterceptor);
      };
    }, [session, status, update, router]);

    return api;
  };

  return { api, useTokenInterceptor };
};