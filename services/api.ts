// services/api.ts (updated import and re-export)
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

// Import instance from separate file (breaks cycle) - ensure named import
import { serverApiInstance } from "./serverInstance";

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

// Re-export for backward compatibility
export { serverApiInstance };

// Client-side API service (for client components)
export const clientApiServiceFull = {
  ...clientApiService,
  admin: adminClientApiService,
};

// Re-export adminClientApiService for direct imports in components
export { adminClientApiService };

export default serverApiService;