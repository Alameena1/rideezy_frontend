   import { createUserApiInstance } from "./userInterceptors";
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

   let apiInstance: ReturnType<typeof createUserApiInstance>;

   const getApiInstance = () => {
     if (!apiInstance) {
       const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
       apiInstance = createUserApiInstance(API_BASE_URL);
     }
     return apiInstance;
   };

   export const apiService = {
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

   export const api = getApiInstance();
   export default apiService; 