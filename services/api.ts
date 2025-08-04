import { createUserApiInstance } from "./userInterceptors";
import * as adminApi from "./admin/adminApi";
import { authApi } from "./user/authApi";
import { userApi } from "./user/userApi";
import { vehicleApi } from "./user/vehicleApi";
import { rideApi } from "./user/rideApi";
import { subscriptionApi } from "./user/subscriptionApi";
import { geoApi } from "./user/geoApi";
import { trackingApi } from "./user/trackingApi";
import {notificationApi} from './user/notificationApi'

// Lazy initialization of api
let apiInstance: ReturnType<typeof createUserApiInstance>;

const getApiInstance = () => {
  if (!apiInstance) {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
    apiInstance = createUserApiInstance(API_BASE_URL);
  }
  return apiInstance;
};

export const apiService = {
  admin: adminApi.adminApiService,
  auth: authApi,
  user: userApi,
  vehicle: vehicleApi,
  ride: rideApi,
  subscription: subscriptionApi,
  geo: geoApi,
  tracking: trackingApi,
  notification: notificationApi, 
};

import("./user/notificationApi").then((module) => {
  apiService.notification = module.notificationApi;
});

export const api = getApiInstance();
export default apiService;