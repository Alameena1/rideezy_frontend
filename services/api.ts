"use client";
import axios from "axios";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  country: string;
  state: string;
}

const getToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/verify-otp") &&
      !originalRequest.url?.includes("/auth/resend-otp")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token found");

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh-token`,
          { refreshToken }
        );

        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/user/login";
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    localStorage.setItem("accessToken", response.data.accessToken);
    localStorage.setItem("refreshToken", response.data.refreshToken);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  updateProfile: async (updatedData: UserProfile) => {
    console.log("Updating profile with data:", updatedData);
    const response = await api.put("/user/profile", updatedData);
    console.log("Profile update response:", response);
    return response.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await api.post("/auth/verify-otp", data);
    return response.data;
  },

  resendOtp: async (data: { email: string }) => {
    const response = await api.post("/auth/resend-otp", data);
    return response.data;
  },

  getVehicles: async () => {
    const response = await api.get("/vehicles");
    console.log(response)
    return response; 
  },

  addVehicle: async (vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage?: string;
    documentImage?: string;
  }) => {
    console.log("api request");
    const response = await api.post("/vehicles", vehicleData);
    return response.data; 
  },
};

export default api;