import axios from "axios";
import Cookies from "js-cookie";

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
        config.url?.includes("/auth/resend-otp")
      ) {
        return config;
      }

      const token = getToken();
      console.log("Token being sent:", token);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("No accessToken found in cookies");
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status === 403 &&
        error.response?.data?.message === "Your account has been blocked. Contact support."
      ) {
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
        return Promise.reject(error);
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/verify-otp") &&
        !originalRequest.url?.includes("/auth/resend-otp") &&
        !originalRequest.url?.includes("/auth/login")
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) throw new Error("No refresh token found");

          const { data } = await axios.post(
            `${baseURL}/auth/refresh-token`,
            { refreshToken },
            { withCredentials: true }
          );

          Cookies.set("accessToken", data.accessToken, {
            expires: 1,
            secure: true,
            sameSite: "strict",
          });
          if (data.refreshToken) {
            Cookies.set("refreshToken", data.refreshToken, {
              expires: 7,
              secure: true,
              sameSite: "strict",
            });
          }

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          Cookies.remove("accessToken");
          Cookies.remove("refreshToken");
          window.location.href = "/user/login";
          return Promise.reject(refreshError);
        }
      }

      console.log("Interceptor caught error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};