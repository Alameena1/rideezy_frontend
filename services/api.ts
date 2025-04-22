import axios from "axios";
import Cookies from "js-cookie";

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  country: string;
  state: string;
}

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string;
  documentImage?: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const getToken = () => Cookies.get("accessToken");
const getRefreshToken = () => Cookies.get("refreshToken");

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
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
          { refreshToken },
          { withCredentials: true }
        );

        Cookies.set("accessToken", data.accessToken, { expires: 1, secure: true, sameSite: "strict" });
        if (data.refreshToken) {
          Cookies.set("refreshToken", data.refreshToken, { expires: 7, secure: true, sameSite: "strict" });
        }

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
        window.location.href = "/user/login";
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    Cookies.set("accessToken", response.data.accessToken, { expires: 1, secure: true, sameSite: "strict" });
    Cookies.set("refreshToken", response.data.refreshToken, { expires: 7, secure: true, sameSite: "strict" });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/user/profile");
    console.log("getProfile raw response:", response.data);
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

  getVehicles: async (): Promise<Vehicle[]> => {
    try {
      const response = await api.get("/vehicles");
      console.log("getVehicles raw response:", response.data);

      const vehicles = response.data?.data?.data || response.data?.data || [];
      if (!Array.isArray(vehicles)) {
        console.error("Expected an array of vehicles, got:", vehicles);
        return [];
      }
      return vehicles;
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      return [];
    }
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
    const response = await api.post("/vehicles", vehicleData);
    return response.data;
  },

  updateVehicle: async (vehicleId: string, vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage?: string;
    documentImage?: string;
  }) => {
    const response = await api.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  },
};

export default api;