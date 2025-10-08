// services/client/adminClientApi.ts
"use client";

import axios from "axios";
import Cookies from "js-cookie";
import { createAdminApiInstance } from "../adminInterceptors"; // Adjust path to your adminInterceptors file
// Assuming you have or extend auth utils for admin; if not, implement getAdminValidToken and getAdminRefreshToken

const API_BASE_URL =  "http://localhost:3001";

let adminClientApiInstance: ReturnType<typeof createAdminApiInstance> | null = null;

const getAdminClientApiInstance = () => {
  if (!adminClientApiInstance) {
    adminClientApiInstance = createAdminApiInstance(API_BASE_URL);
  }
  return adminClientApiInstance;
};

export const adminClientApi = getAdminClientApiInstance();

// Interfaces (reused/extended from your provided code)
export interface AdminLoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "Pending" | "Approved" | "Rejected" | "Active" | "Blocked" | "Completed" | "Cancelled";
  vehicleType?: string;
  subscriptionStatus?: "subscribed" | "non-subscribed";
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardMetricsResponse {
  success: boolean;
  metrics: {
    totalUsers: number;
    totalRides: number;
    totalRevenue: number;
    subscribedUsers: number;
    nonSubscribedUsers: number;
  };
  userGrowth: Array<{ month: string; users: number }>;
  rideCount: Array<{ month: string; rides: number }>;
  revenueDistribution: Array<{ name: string; value: number }>;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  status: "Active" | "Blocked";
  createdAt: string;
  updatedAt: string;
}

export interface Ride {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  distanceKm: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  status: string;
  createdAt: string;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  routeGeometry: string;
}

export interface User {
  _id: string;
  name: string;
}

// Adapted Auth API (using adminClientApi)
export const clientAdminAuthApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await adminClientApi.post("/admin/login", { email, password });
      console.log("Admin Login response:", response.data);
      // Assuming your interceptor or utils handle cookie setting on success
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Authentication failed");
      }
      throw new Error("An unknown error occurred");
    }
  },

  logout: async () => {
    try {
      const response = await adminClientApi.post("/admin/logout");
      console.log("Admin Logout response:", response.data);
      Cookies.remove("adminAuthToken", { path: "/" });
      Cookies.remove("refreshToken", { path: "/" });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Logout failed");
      }
      throw new Error("An unknown error occurred");
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = Cookies.get("refreshToken");
      if (!refreshToken) throw new Error("No refresh token found");
      const response = await adminClientApi.post("/admin/refresh-token", { refreshToken });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Token refresh failed");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Adapted User API (using adminClientApi)
export const clientAdminUserApi = {
  getUsers: async (query: PaginationQuery = {}) => {
    try {
      const response = await adminClientApi.get("/admin/users", { params: query });
      console.log("Fetched Admin Users:", response.data);
      return response.data; // { success: boolean, data: User[], pagination: {...} }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch users");
      }
      throw new Error("An unknown error occurred");
    }
  },

  toggleUserStatus: async (userId: string, newStatus: "Active" | "Blocked") => {
    try {
      const response = await adminClientApi.patch(`/admin/users/${userId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update user status");
      }
      throw new Error("An unknown error occurred");
    }
  },

  verifyGovId: async (userId: string, status: "Verified" | "Rejected", rejectionNote?: string) => {
    try {
      const response = await adminClientApi.post("/admin/verify-gov-id", { userId, status, rejectionNote });
      console.log("Admin Gov ID Verification:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to verify government ID");
      }
      throw new Error("An unknown error occurred");
    }
  },

  
  checkUserOngoingRides: async (userId: string): Promise<{ 
    success: boolean;
    hasOngoingRides: boolean; 
    ongoingRides: any[];
    message: string;
  }> => {
    try {
      const response = await adminClientApi.get(`/admin/users/${userId}/ongoing-rides`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to check user's ongoing rides");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Adapted Vehicle API (using adminClientApi)
export const clientAdminVehicleApi = {
  getVehicles: async (query: PaginationQuery = {}) => {
    try {
      const response = await adminClientApi.get("/admin/vehicles", { params: query });
      console.log("Fetched Admin Vehicles:", response.data);
      return response.data; // { success: boolean, data: Vehicle[], pagination: {...} }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch vehicles");
      }
      throw new Error("An unknown error occurred");
    }
  },

  updateVehicleStatus: async (vehicleId: string, status: "Approved" | "Rejected", note?: string) => {
    try {
      const response = await adminClientApi.patch(`/admin/vehicles/${vehicleId}/status`, { status, note });
      console.log("Updated Admin Vehicle Status:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update vehicle status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Adapted Subscription API (using adminClientApi)
export const clientAdminSubscriptionApi = {
    getSubscriptionPlans: async (query: PaginationQuery = {}): Promise<{ 
    data: SubscriptionPlan[]; 
    pagination: any 
  }> => {
    try {
      const response = await adminClientApi.get("/admin/subscriptions", { params: query });
      console.log("Admin Subscription Plans Response:", response.data);
      
      // Handle both response formats
      if (response.data && Array.isArray(response.data)) {
        // If it's a direct array, wrap it in the expected format
        return {
          data: response.data,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: response.data.length,
            hasNext: false,
            hasPrev: false,
          }
        };
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // If it's already in the paginated format
        return response.data;
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch subscription plans");
      }
      throw new Error("An unknown error occurred");
    }
  },


  createSubscriptionPlan: async (planData: Partial<SubscriptionPlan>) => {
    try {
      const response = await adminClientApi.post("/admin/subscriptions", planData);
      return response.data.plan;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to create subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  updateSubscriptionPlan: async (planId: string, planData: Partial<SubscriptionPlan>) => {
    try {
      const response = await adminClientApi.patch(`/admin/subscriptions/${planId}`, planData);
      return response.data.plan;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  deleteSubscriptionPlan: async (planId: string) => {
    try {
      const response = await adminClientApi.delete(`/admin/subscriptions/${planId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to delete subscription plan");
      }
      throw new Error("An unknown error occurred");
    }
  },

  toggleSubscriptionPlanStatus: async (planId: string, newStatus: "Active" | "Blocked") => {
    try {
      const response = await adminClientApi.patch(`/admin/subscriptions/${planId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update subscription plan status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Adapted Ride API (using adminClientApi)
export const clientAdminRideApi = {
  getRides: async (query: PaginationQuery = {}): Promise<{ success: boolean; data: Ride[]; pagination: any }> => {
    try {
      const response = await adminClientApi.get("/admin/rides", { params: query });
      return response.data; // { success: boolean, data: Ride[], pagination: {...} }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch rides");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getRideById: async (rideId: string): Promise<Ride> => {
    try {
      const response = await adminClientApi.get(`/admin/rides/${rideId}`);
      return response.data.ride;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch ride details");
      }
      throw new Error("An unknown error occurred");
    }
  },

  cancelRide: async (rideId: string): Promise<void> => {
    try {
      const response = await adminClientApi.patch(`/admin/rides/${rideId}/cancel`, {});
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to cancel ride");
      }
      throw new Error("An unknown error occurred");
    }
  },

  blockRide: async (rideId: string): Promise<void> => {
    try {
      const response = await adminClientApi.patch(`/admin/rides/${rideId}/block`, {});
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to block ride");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getUserById: async (userId: string): Promise<User> => {
    try {
      const response = await adminClientApi.get(`/admin/users/${userId}`);
      return response.data.user;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch user details");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Adapted Dashboard API (using adminClientApi)
export const clientAdminDashboardApi = {
  getDashboardMetrics: async (params?: { startDate?: string; endDate?: string }): Promise<DashboardMetricsResponse> => {
    try {
      const response = await adminClientApi.get("/admin/dashboard-metrics", { params });
      console.log("Admin Dashboard Metrics:", response.data);
      return {
        success: response.data.success,
        metrics: response.data.metrics,
        userGrowth: response.data.userGrowth,
        rideCount: response.data.rideCount,
        revenueDistribution: response.data.revenueDistribution,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch dashboard metrics");
      }
      throw new Error("An unknown error occurred");
    }
  },
};

// Main Admin Client API Service
export const adminClientApiService = {
  auth: clientAdminAuthApi,
  user: clientAdminUserApi,
  vehicle: clientAdminVehicleApi,
  subscription: clientAdminSubscriptionApi,
  ride: clientAdminRideApi,
  dashboard: clientAdminDashboardApi,
};

// Export interceptor hook (if your createAdminApiInstance exposes it; otherwise, omit or implement)
export const useAdminApiInterceptors = () => {
  // Placeholder: Implement if needed, similar to useApiInterceptors in clientApiService
  console.warn("useAdminApiInterceptors not fully implemented; extend as needed.");
};

export default adminClientApiService;