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
  documentImage: string;
  mileage: number;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const getToken = () => Cookies.get("accessToken");
const getRefreshToken = () => Cookies.get("refreshToken");

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
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

    // Handle user blocked scenario
    if (
      error.response?.status === 403 &&
      error.response?.data?.message === "User is blocked"
    ) {
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
      window.location.href = "/user/login"; // Redirect to login page
      return Promise.reject(error);
    }

    // Existing logic for handling 401 (token expiration)
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
      }
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    Cookies.set("accessToken", response.data.accessToken, {
      expires: 1,
      secure: true,
      sameSite: "strict",
    });
    Cookies.set("refreshToken", response.data.refreshToken, {
      expires: 7,
      secure: true,
      sameSite: "strict",
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/user/profile");
    return response.data;
  },

  updateProfile: async (updatedData: UserProfile) => {
    const response = await api.put("/user/profile", updatedData);
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
      const vehicles = response.data?.data || [];
      if (!Array.isArray(vehicles)) {
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
    vehicleImage: string;
    documentImage: string;
    mileage: number;
  }) => {
    const response = await api.post("/vehicles", vehicleData);
    return response.data;
  },

  updateVehicle: async (
    vehicleId: string,
    vehicleData: {
      vehicleName: string;
      vehicleType: string;
      licensePlate: string;
      color?: string;
      insuranceNumber?: string;
      vehicleImage: string;
      documentImage: string;
      mileage: number;
    }
  ) => {
    const response = await api.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  },

  deleteVehicle: async (vehicleId: string) => {
    try {
      const response = await api.delete(`/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      throw error;
    }
  },

  startRide: async (data: {
    date: string;
    time: string;
    startPoint: string;
    endPoint: string;
    passengerCount: number;
    fuelPrice: number;
    vehicleId: string;
    fuelCost: number;
    distance: number;
    routeGeometry: string;
    costPerPerson: number;
  }) => {
    const response = await api.post("/rides/start", data);
    return response.data;
  },

  getRides: async () => {
    try {
      const response = await api.get("/rides/rides", {
        withCredentials: true,
      });
      console.log(response);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitGovId: async (data: {
    govId: {
      idNumber: string;
      documentUrl: string;
      verificationStatus: "Pending" | "Verified" | "Rejected";
    };
  }) => {
    const response = await api.put("/user/profile", data);
    return response.data;
  },
};

export default api;