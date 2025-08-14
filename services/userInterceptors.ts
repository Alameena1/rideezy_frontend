import axios from "axios";
import Cookies from "js-cookie";
import router from "next/router";

const getToken = () => Cookies.get("accessToken");
const getRefreshToken = () => Cookies.get("refreshToken");

export const createUserApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL: baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  api.interceptors.request.use(
    (config) => {
      if (
        config.url?.includes("/auth/verify-otp") ||
        config.url?.includes("/auth/resend-otp") ||
        config.url?.includes("/auth/login") ||
        config.url?.includes("/auth/refresh-token")
      ) {
        return config;
      }

      const token = getToken();
      console.log("Request URL:", config.url, "Token:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("No accessToken found in cookies for", config.url);
      }
      return config;
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
          console.log("Refresh token:", refreshToken);
          if (!refreshToken) throw new Error("No refresh token found");

          const { data } = await axios.post(
            `${baseURL}/auth/refresh-token`,
            { refreshToken },
            { withCredentials: true }
          );
          console.log("New tokens:", data);

          Cookies.set("accessToken", data.accessToken, {
            expires: 1,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
          });
          if (data.refreshToken) {
            Cookies.set("refreshToken", data.refreshToken, {
              expires: 7,
              secure: process.env.NODE_ENV === "production",
              sameSite: "strict",
              path: "/",
            });
          }

          api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
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