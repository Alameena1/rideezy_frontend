import axios, { AxiosInstance } from "axios";

// services/serverInstance.ts (moved here to avoid cycles)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

export const serverApiInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Import API services
import { adminApiService } from "./admin/adminApi";
import { authApi } from "./user/authApi";
import { userApi } from "./user/userApi";
import { vehicleApi } from "./user/vehicleApi";
import { rideApi } from "./user/rideApi";
import { subscriptionApi } from "./user/subscriptionApi";
import { geoApi } from "./user/geoApi";
import { trackingApi } from "./user/trackingApi";
import { notificationApi } from "./user/notificationApi";
import { chatApi } from "./user/chatApi";

// Client-side imports
import { clientApiService } from "./client/client-api";
import { adminClientApiService } from "./client/adminClientApi";

// Server-side API service (for server components and API routes)
export const serverApiService = {
  admin: adminApiService,
  auth: authApi,
  user: userApi,
  vehicle: vehicleApi,
  ride: rideApi,
  subscription: subscriptionApi,
  geo: geoApi,
  tracking: trackingApi,
  notification: notificationApi,
  chat: chatApi,
};

// Client-side API service (for client components)
export const clientApiServiceFull = {
  ...clientApiService,
  admin: adminClientApiService,
};

// Re-export for backward compatibility - FIXED: Export all client services
export { adminClientApiService, clientApiService };

export default serverApiService;