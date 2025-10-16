"use client";

import axios from "axios";
import { createUserApiInstance } from "../userInterceptors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

let clientApiInstance: ReturnType<typeof createUserApiInstance> | null = null;

const getClientApiInstance = () => {
  if (!clientApiInstance) {
    clientApiInstance = createUserApiInstance(API_BASE_URL);
  }
  return clientApiInstance;
};

export const clientApi = getClientApiInstance();

export interface SubscribeResponse {
  success: boolean;
  message?: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  isSubscribed: boolean;
  message?: string;
}

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  message?: string;
}

export interface Ride {
  rideId: string;
}

export interface DashboardMetricsResponse {
  success: boolean;
  metrics: {
    totalUsers: number;
    totalRides: number;
    totalRevenue: number;
    subscribedUsers: number;
    nonSubscribedUsers: number;
  };
  userGrowth: Array<{ month: string; users: number }>;
  rideCount: Array<{ month: string; rides: number }>;
  revenueDistribution: Array<{ name: string; value: number }>;
}

export interface AdminLoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  message?: string;
}

// Chat specific interfaces
export interface Message {
  _id: string;
  conversationId: string;
  senderId: { _id: string; fullName: string; profilePicture?: string };
  content: string;
  messageType: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  isDeleted: boolean;
  timestamp: string;
  createdAt: string | number | Date;
}

export interface Conversation {
  _id: string;
  participants: Array<{ _id: string; fullName: string; profilePicture?: string }>;
  createdAt: string;
  rideId?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
}

export interface ChatImageUploadResponse {
  success: boolean;
  imageUrl: string;
  message?: string;
}

export interface DeleteMessageResponse {
  success: boolean;
  message: string;
  deletedMessage?: Message;
}

export const clientApiService = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      clientApi.api.post("/auth/login", credentials).then((res) => res.data),
    googleAuth: (payload: { fullName: string; email: string; image: string; idToken: string }) =>
      clientApi.api.post("/auth/google-auth", payload).then((res) => res.data),
    logout: (refreshToken: string) =>
      clientApi.api.post("/auth/logout", { token: refreshToken }).then((res) => res.data),
    refreshToken: (data: { refreshToken: string }) =>
      clientApi.api.post("/auth/refresh-token", data).then((res) => res.data),
    verifyOtp: (data: { email: string; otp: string }) =>
      clientApi.api.post("/api/auth/verify-otp", data).then((res) => res.data),
    resendOtp: (data: { email: string }) =>
      clientApi.api.post("/auth/resend-otp", data).then((res) => res.data),
    forgotPassword: (data: { email: string }) =>
      clientApi.api.post("/auth/forgot-password", data).then((res) => res.data),
    resetPassword: (data: { token: string; password: string }) =>
      clientApi.api.post("/auth/reset-password", data).then((res) => res.data),
  },
   user: {
  getProfile: () => clientApi.api.get("/api/user/profile").then((res) => res.data),
  updateProfile: (data: any) => clientApi.api.put("/api/user/profile", data).then((res) => res.data),
},
  notification: {
    getUserNotifications: (userId: string) =>
      clientApi.api.get(`/api/notifications/${userId}`).then((res) => res.data),
    markAsRead: (notificationId: string) =>
      clientApi.api.patch(`/api/notifications/${notificationId}/read`).then((res) => res.data),
    // New notification methods
    triggerRideJoinAcceptedNotification: (rideId: string, userId: string, passengerName: string) =>
      clientApi.api.post("/api/notifications/ride-join-accepted", { rideId, userId, passengerName }).then((res) => res.data),
    triggerRideJoinRejectedNotification: (rideId: string, userId: string, rejectedPassengerId: string, passengerName: string) =>
      clientApi.api.post("/api/notifications/ride-join-rejected", { rideId, userId, rejectedPassengerId, passengerName }).then((res) => res.data),
    triggerRideJoinNotification: (rideId: string, userId: string, joinedUserId: string) =>
      clientApi.api.post("/api/notifications/ride-join", { rideId, userId, joinedUserId }).then((res) => res.data),
    triggerRideCancellationNotification: (rideId: string, userId: string, message?: string) =>
      clientApi.api.post("/api/notifications/ride-cancel", { rideId, userId, message }).then((res) => res.data),
  },
  chat: {
    getConversation: (conversationId: string) =>
      clientApi.api.get(`/api/chat/conversations/${conversationId}`).then((res) => res.data),
    getMessages: (conversationId: string) =>
      clientApi.api.get(`/api/chat/conversations/${conversationId}/messages`).then((res) => res.data),
    createConversation: (participants: string[]) =>
      clientApi.api.post("/api/chat/conversations", { participants }).then((res) => res.data),
    sendMessage: (conversationId: string, content: string) =>
      clientApi.api.post(`/api/chat/conversations/${conversationId}/messages`, { content }).then((res) => res.data),
    sendImageMessage: (conversationId: string, formData: FormData) =>
      clientApi.api.post(`/api/chat/conversations/${conversationId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((res) => res.data),
    deleteMessage: (messageId: string) =>
      clientApi.api.delete(`/api/chat/messages/${messageId}`).then((res) => res.data),
    uploadChatImage: (formData: FormData) =>
      clientApi.api.post('/api/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then((res) => res.data),
    getUserConversations: (userId: string) =>
      clientApi.api.get(`/api/chat/users/${userId}/conversations`).then((res) => res.data),
    getOrCreateRideConversation: (data: { rideId: string; driverId: string; userId: string }) =>
      clientApi.api.post("/api/chat/ride-conversation", data).then((res) => res.data),
  },
  ride: {
    startRide: (data: {
      date: string;
      time: string;
      startPoint: string;
      endPoint: string;
      passengerCount: number;
      fuelPrice: number;
      vehicleId: string;
      fuelCost: number;
      distance: number;
      routeGeometry: string;
      platformFee?: number;
    }) => clientApi.api.post("/api/initiate-rides/start", data).then((res) => res.data),
getRides: ({ page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string } = {}) => 
    clientApi.api.get("/api/initiate-rides/rides", {
      params: { page, limit, search }
    }).then((res) => res.data),    editRide: (rideId: string, driverId: string, dto: any) =>
      clientApi.api.put(`/api/initiate-rides/${rideId}`, dto, { headers: { "Driver-Id": driverId } }).then((res) => res.data),
    cancelRide: (rideId: string) => clientApi.api.delete(`/api/initiate-rides/${rideId}`).then((res) => res.data),
    startTracking: (rideId: string, driverId: string) =>
      clientApi.api.put(`/api/initiate-rides/${rideId}/start-tracking`, {}, { headers: { "Driver-Id": driverId } }).then((res) => res.data),
getJoinedRides: ({ page = 1, limit = 5, search = '' }: { page?: number; limit?: number; search?: string } = {}) => 
    clientApi.api.get("/api/join-rides/joined", {
      params: { page, limit, search }
    }).then((res) => res.data),    findNearestRides: (data: { userLocation: string; destination: string }) =>
      clientApi.api.post("/api/join-rides/nearest", data).then((res) => res.data),
    joinRide: (rideId: string, passengerId: string, pickupLocation: string, dropoffLocation: string) =>
      clientApi.api.post("/api/join-rides/join", { rideId, passengerId, pickupLocation, dropoffLocation }).then((res) => res.data),
    handleJoinRequest: (rideId: string, driverId: string, passengerId: string, action: "accept" | "reject") =>
      clientApi.api.put(`/api/join-rides/${rideId}/requests/${passengerId}`, { driverId, action }).then((res) => res.data),
    createRidePaymentOrder: (rideId: string) =>
      clientApi.api.post("/api/join-rides/create-ride-order", { rideId }).then((res) => res.data),
    verifyAndJoinRide: (data: {
      rideId: string;
      pickupLocation: string;
      dropoffLocation: string;
      paymentId: string;
      orderId: string;
      signature: string;
    }) => clientApi.api.post("/api/join-rides/verify-and-join", data).then((res) => res.data),
    cancelJoinedRide: (rideId: string) => clientApi.api.delete(`/api/join-rides/joined/${rideId}`).then((res) => res.data),
    updateRide: (id: string, updates: { currentPosition?: [number, number]; passengerId: string; action: "picked" | "dropped" }, driverId: string) =>
      clientApi.api.put(`/api/initiate-rides/${id}/update`, updates, { headers: { "Driver-Id": driverId } }).then((res) => res.data),

    emergencyStopRide: (rideId: string, data: { reason: string; currentPosition: [number, number] }) =>
      clientApi.api.put(`/api/initiate-rides/${rideId}/emergency-stop`, data).then((res) => res.data),
  
  },
  wallet: {
  getWallet: (userId: string, page: number = 1, limit: number = 10, search: string = "", filter: string = "all") =>
    clientApi.api.get(`/api/wallet/transactions/${userId}`, { 
      params: { page, limit, search, filter } 
    }).then((res) => res.data),
  createOrder: (data: { userId: string; amount: number; currency: string }) =>
    clientApi.api.post("/api/wallet/create-deposit-order", data).then((res) => res.data),
  addFunds: (data: {
    userId: string;
    amount: number;
    paymentId: string;
    orderId: string;
    signature: string;
  }) => clientApi.api.post("/api/wallet/deposit", data).then((res) => res.data),
},
vehicle: {
  getVehicles: ({ page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string } = {}) => 
    clientApi.api.get("/api/vehicles", {
      params: {
        page,
        limit, 
        search
      }
    }).then((res) => res.data),
  
  addVehicle: (vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage: string;
    documentImage: string;
    mileage: number;
  }) => clientApi.api.post("/api/vehicles", vehicleData).then((res) => res.data),
  
  updateVehicle: (vehicleId: string, vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage: string;
    documentImage: string;
    mileage: number;
  }) => clientApi.api.put(`/api/vehicles/${vehicleId}`, vehicleData).then((res) => res.data),
  
  deleteVehicle: (vehicleId: string) => clientApi.api.delete(`/api/vehicles/${vehicleId}`).then((res) => res.data),
  
  reapplyVehicle: (vehicleId: string, vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage: string;
    documentImage: string;
    mileage: number;
  }) => clientApi.api.post(`/api/vehicles/${vehicleId}/reapply`, vehicleData).then((res) => res.data),
},
   tracking: {
    startTracking: (rideId: string, driverId: string, initialPosition: [number, number]) =>
      clientApi.api.post(`/api/tracking/${rideId}/start`, { driverId, initialPosition }).then((res) => res.data),
    updateTrackingPosition: (rideId: string, position: [number, number]) =>
      clientApi.api.put(`/api/tracking/${rideId}/position`, { position }).then((res) => res.data),
    getTrackingStatus: (rideId: string) => clientApi.api.get(`/api/tracking/${rideId}/status`).then((res) => res.data),
    getTrackingPosition: (rideId: string) => clientApi.api.get(`/api/tracking/${rideId}/position`).then((res) => res.data),
    stopTracking: (rideId: string) => clientApi.api.put(`/api/tracking/${rideId}/stop`, {}).then((res) => res.data),
  },
  subscription: {
getSubscriptionPlans: ({ page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string } = {}) => 
    clientApi.api.get("/api/subscriptions/plans", {
      params: { page, limit, search }
    }).then((res) => res.data),
        checkSubscription: (userId: string) => clientApi.api.get(`/api/subscriptions/check/${userId}`).then((res) => res.data),
    createOrder: (planId: string) => clientApi.api.post("/api/subscriptions/create-order", { planId }).then((res) => res.data),
    verifyAndSubscribe: (data: {
      userId: string;
      planId: string;
      paymentId: string;
      orderId: string;
      signature: string;
    }) => clientApi.api.post("/api/subscriptions/verify", data).then((res) => res.data),
    subscribeWithWallet: (data: { userId: string; planId: string }) =>
      clientApi.api.post("/api/subscriptions/subscribe-wallet", data).then((res) => res.data),
    getSubscriptionStatus: () => clientApi.api.get("/api/subscriptions/status").then((res) => res.data),
  },
  geo: {
    searchAddress: async (query: string) => {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      return response.data.filter((result: any) => result.address && result.address.state === 'Kerala');
    },
    reverseGeocode: async (lat: number, lng: number) => {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (response.data.address && response.data.address.state === 'Kerala') {
        return response.data;
      }
      throw new Error('Location not found in Kerala');
    },
    calculateRoute: (startPoint: string, endPoint: string) =>
      clientApi.api.post("/api/route", { startPoint, endPoint }).then((res) => res.data),
  },
  admin: {
    auth: {
      login: (email: string, password: string) =>
        clientApi.api.post("/admin/login", { email, password }).then((res) => res.data),
      logout: () => clientApi.api.post("/admin/logout").then((res) => res.data),
      refreshToken: (refreshToken: string) =>
        clientApi.api.post("/admin/refresh-token", { refreshToken }).then((res) => res.data),
    },
    user: {
      getUsers: (query: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc"; status?: "Active" | "Blocked"; subscriptionStatus?: "subscribed" | "non-subscribed" }) =>
        clientApi.api.get("/admin/users", { params: query }).then((res) => res.data),
      toggleUserStatus: (userId: string, newStatus: "Active" | "Blocked") =>
        clientApi.api.patch(`/admin/users/${userId}/status`, { status: newStatus }).then((res) => res.data),
      verifyGovId: (userId: string, status: "Verified" | "Rejected", rejectionNote?: string) =>
        clientApi.api.post("/admin/verify-gov-id", { userId, status, rejectionNote }).then((res) => res.data),
    },
    vehicle: {
      getVehicles: (query: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc"; status?: "Pending" | "Approved" | "Rejected"; vehicleType?: string }) =>
        clientApi.api.get("/admin/vehicles", { params: query }).then((res) => res.data),
      updateVehicleStatus: (vehicleId: string, status: "Approved" | "Rejected", note?: string) =>
        clientApi.api.patch(`/admin/vehicles/${vehicleId}/status`, { status, note }).then((res) => res.data),
    },
    subscription: {
      getSubscriptionPlans: () => clientApi.api.get("/admin/subscriptions").then((res) => res.data),
      createSubscriptionPlan: (planData: Partial<any>) =>
        clientApi.api.post("/admin/subscriptions", planData).then((res) => res.data),
      updateSubscriptionPlan: (planId: string, planData: Partial<any>) =>
        clientApi.api.patch(`/admin/subscriptions/${planId}`, planData).then((res) => res.data),
      deleteSubscriptionPlan: (planId: string) =>
        clientApi.api.delete(`/admin/subscriptions/${planId}`).then((res) => res.data),
      toggleSubscriptionPlanStatus: (planId: string, newStatus: "Active" | "Blocked") =>
        clientApi.api.patch(`/admin/subscriptions/${planId}/status`, { status: newStatus }).then((res) => res.data),
    },
    ride: {
      getRides: (query: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc"; status?: "Active" | "Completed" | "Cancelled" | "Blocked"; dateFrom?: string; dateTo?: string }) =>
        clientApi.api.get("/admin/rides", { params: query }).then((res) => res.data),
      getRideById: (rideId: string) => clientApi.api.get(`/admin/rides/${rideId}`).then((res) => res.data),
      cancelRide: (rideId: string) => clientApi.api.patch(`/admin/rides/${rideId}/cancel`, {}).then((res) => res.data),
      blockRide: (rideId: string) => clientApi.api.patch(`/admin/rides/${rideId}/block`, {}).then((res) => res.data),
      getUserById: (userId: string) => clientApi.api.get(`/admin/users/${userId}`).then((res) => res.data),
    },
    dashboard: {
      getDashboardMetrics: (params?: { startDate?: string; endDate?: string }) =>
        clientApi.api.get("/admin/dashboard-metrics", { params }).then((res) => res.data),
    },
  },
};

export const useApiInterceptors = clientApi.useTokenInterceptor;

export default clientApiService;