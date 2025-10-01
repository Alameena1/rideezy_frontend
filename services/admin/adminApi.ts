// services/admin/adminApi.ts
import { createAdminApiInstance } from "../adminInterceptors";
import { adminAuthApi } from "./authApi";
import { adminUserApi } from "./userApi";
import { adminVehicleApi } from "./vehicleApi";
import { adminSubscriptionApi } from "./subscriptionApi";
import { adminRideApi, Ride } from "./rideApi";
import { adminDashboardApi } from "./dashboardApi";

// Update base URL to match backend's /admin route
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/admin";

export const adminApi = createAdminApiInstance(API_URL);

export const adminApiService = {
  auth: adminAuthApi,
  user: adminUserApi,
  vehicle: adminVehicleApi,
  subscription: adminSubscriptionApi,
  ride: adminRideApi,
  dashboard: adminDashboardApi,
};

export default adminApiService;