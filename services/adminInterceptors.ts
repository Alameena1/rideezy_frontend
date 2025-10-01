// services/adminInterceptors.ts (updated to break cycle)
import axios from "axios";
import Cookies from "js-cookie";

export const createAdminApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Local admin token getters (no import from auth.ts)
  const getAdminValidToken = () => Cookies.get("adminAuthToken");
  const getAdminRefreshToken = () => Cookies.get("refreshToken");

  api.interceptors.request.use(
    async (config) => {
      const unauthenticatedRoutes = ["/admin/login", "/admin/refresh-token", "/admin/logout"];
      if (config.url && unauthenticatedRoutes.some((route) => config.url!.includes(route))) {
        return config;
      }

      try {
        const token = getAdminValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      } catch (error) {
        console.error("Failed to get admin valid token:", error);
        return config;
      }
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
        Cookies.remove("adminAuthToken", { path: "/" });
        Cookies.remove("refreshToken", { path: "/" });
        return Promise.reject(error);
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/admin/login") &&
        !originalRequest.url?.includes("/admin/refresh-token") &&
        !originalRequest.url?.includes("/admin/logout")
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = getAdminRefreshToken();
          if (!refreshToken) throw new Error("No refresh token found");

          const response = await axios.post(
            `${baseURL}/admin/refresh-token`,
            { refreshToken },
            { headers: { "Content-Type": "application/json" } }
          );

          const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;

          Cookies.set("adminAuthToken", newAccessToken, {
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
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Admin refresh token failed:", refreshError);
          Cookies.remove("adminAuthToken", { path: "/" });
          Cookies.remove("refreshToken", { path: "/" });
          if (typeof window !== 'undefined') {
            window.location.href = "/admin/login";
          }
          return Promise.reject(refreshError);
        }
      }

      console.log("Admin Interceptor caught error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};