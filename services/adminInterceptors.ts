import axios from "axios";
import Cookies from "js-cookie";

export const createAdminApiInstance = (baseURL: string) => {
  const api = axios.create({
    baseURL: baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  api.interceptors.request.use(
    (config) => {
      const token = Cookies.get("adminAuthToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Added Authorization header for admin:", token);
      } else {
        console.log("No adminAuthToken found in cookies");
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
        Cookies.remove("adminAuthToken");
        Cookies.remove("refreshToken");
        return Promise.reject(error);
      }

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/login")
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = Cookies.get("refreshToken");
          if (!refreshToken) throw new Error("No refresh token found");

          const { data } = await axios.post(
            `${baseURL}/refresh`,
            { refreshToken },
            { withCredentials: true }
          );

          Cookies.set("adminAuthToken", data.accessToken, {
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
          Cookies.remove("adminAuthToken");
          Cookies.remove("refreshToken");
          window.location.href = "/admin/login";
          return Promise.reject(refreshError);
        }
      }

      console.log("Interceptor caught error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return api;
};