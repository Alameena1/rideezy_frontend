import { createAdminApiInstance } from "../unifiedInterceptor";

// Import API services
import { adminAuthApi } from "./authApi";
import { adminUserApi } from "./userApi";
import { adminVehicleApi } from "./vehicleApi";
import { adminSubscriptionApi } from "./subscriptionApi";
import { adminRideApi } from "./rideApi";
import { adminDashboardApi } from "./dashboardApi";

// For client-side usage (with React hooks)
const { api: clientAdminApi, useTokenInterceptor } = createAdminApiInstance();

// For server-side usage (import from the separate file)
export { adminApi } from "./adminApiWithToken";

export const adminApiService = {
  auth: adminAuthApi,
  user: adminUserApi,
  vehicle: adminVehicleApi,
  subscription: adminSubscriptionApi,
  ride: adminRideApi,
  dashboard: adminDashboardApi,
};

// Export client-side API and interceptor
export { clientAdminApi, useTokenInterceptor };
export default adminApiService;