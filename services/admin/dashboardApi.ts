import axios from "axios";
import { adminApi } from "./adminApi";

export interface DashboardMetrics {
  metrics: {
    totalUsers: number;
    subscribedUsers: number;
    nonSubscribedUsers: number;
    totalRides: number;
    totalRevenue: number;
  };
  userGrowth: { month: string; users: number }[];
  rideCount: { month: string; rides: number }[];
  revenueDistribution: { name: string; value: number }[];
}

export const adminDashboardApi = {
  getDashboardMetrics: async (params?: { startDate?: string; endDate?: string }): Promise<DashboardMetrics> => {
    try {
      const response = await adminApi.get("/dashboard-metrics", { params }); // Updated endpoint
      return {
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