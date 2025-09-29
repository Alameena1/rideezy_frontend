"use client";

import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Cookies from "js-cookie";

export const createUserApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  const useTokenInterceptor = () => {
    const { data: session, update } = useSession();
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

          let accessToken = session?.user?.accessToken;
          if (!accessToken) {
            accessToken = Cookies.get("accessToken");
          }

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

          if (
            error.response?.status === 401 &&
            originalRequest &&
            originalRequest.url &&
            !originalRequest._retry &&
            !unauthenticatedRoutes.some((route) => originalRequest.url.includes(route))
          ) {
            console.log("[Interceptor] Attempting to refresh token for:", originalRequest.url);
            originalRequest._retry = true;

            try {
              let refreshToken = session?.user?.refreshToken;
              if (!refreshToken) {
                refreshToken = Cookies.get("refreshToken");
              }

              if (!refreshToken) {
                console.error("[Interceptor] No refresh token found");
                router.push("/user/login");
                throw new Error("No refresh token found");
              }

              const response = await axios.post(
                `${baseURL}/auth/refresh-token`,
                { refreshToken },
                { headers: { "Content-Type": "application/json" } }
              );

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

              if (!newAccessToken) {
                console.error("[Interceptor] Refresh token response missing accessToken");
                router.push("/user/login");
                throw new Error("Invalid refresh token response");
              }

              // Update cookies
              Cookies.set("accessToken", newAccessToken, {
                expires: 1,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });
              Cookies.set("refreshToken", newRefreshToken || refreshToken, {
                expires: 7,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });

              // Update next-auth session
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
              router.push("/user/login");
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
    }, [session, update, router]);

    return api;
  };

  return { api, useTokenInterceptor };
};