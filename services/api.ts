import { createUserApiInstance } from "./userInterceptors";
import * as adminApi from "./admin/adminApi";
import { authApi } from "./user/authApi";
import { userApi } from "./user/userApi";
import { vehicleApi } from "./user/vehicleApi";
import { rideApi } from "./user/rideApi";
import { subscriptionApi } from "./user/subscriptionApi";
import { geoApi } from "./user/geoApi";
import { trackingApi } from "./user/trackingApi"; // New import

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
export const api = createUserApiInstance(API_BASE_URL);

export const apiService = {
  admin: adminApi.adminApiService,
  auth: authApi,
  user: userApi,
  vehicle: vehicleApi,
  ride: rideApi,
  subscription: subscriptionApi,
  geo: geoApi,
  tracking: trackingApi, // Add tracking API to apiService
};

export default apiService;