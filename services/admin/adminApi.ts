import { createAdminApiInstance } from "../adminInterceptors";
import { adminAuthApi } from "./authApi";
import { adminUserApi } from "./userApi";
import { adminVehicleApi } from "./vehicleApi";
import { adminSubscriptionApi } from "./subscriptionApi";

const API_URL = "http://localhost:3001/admin";
export const adminApi = createAdminApiInstance(API_URL);

export const adminApiService = {
  auth: adminAuthApi,
  user: adminUserApi,
  vehicle: adminVehicleApi,
  subscription: adminSubscriptionApi,
};

export default adminApiService;