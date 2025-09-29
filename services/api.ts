// services/api.ts
import axios from "axios";
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

// Server-side API instance
const serverApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Server-side API service (for server components and API routes)
export const serverApiService = {
  admin: adminApiService,
  auth: authApi, // This now only contains server-side methods
  user: userApi,
  vehicle: vehicleApi,
  ride: rideApi,
  subscription: subscriptionApi,
  geo: geoApi,
  tracking: trackingApi,
  notification: notificationApi,
  chat: chatApi,
};

export const serverApiInstance = serverApi;

export default serverApiService;