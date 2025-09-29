// services/user/trackingApi.ts
import { serverApiInstance } from "../api";

export const trackingApi = {
  

startTracking: async (rideId: string, driverId: string, initialPosition: [number, number]) => {
  console.log("[TrackingAPI] Starting tracking for rideId:", rideId, "driverId:", driverId, "initialPosition:", initialPosition);
  try {
    const response = await serverApiInstance.post(`/tracking/${rideId}/start`, {
      driverId,
      initialPosition,
    }, { withCredentials: true });
    console.log("[TrackingAPI] Start tracking response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("[TrackingAPI] Error starting tracking:", {
      rideId,
      error: error.response?.data,
      status: error.response?.status,
    });
    throw error; // Throw original error to preserve response
  }
},

  updateTrackingPosition: async (rideId: string, position: [number, number]) => {
    console.log("[TrackingAPI] Updating tracking position for rideId:", rideId, "position:", position);
    try {
      const response = await serverApiInstance.put(`/tracking/${rideId}/position`, { position }, { withCredentials: true });
      console.log("[TrackingAPI] Update tracking position response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[TrackingAPI] Error updating tracking position:", {
        rideId,
        error: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(error.response?.data?.message || "Failed to update tracking position");
    }
  },

getTrackingStatus: async (rideId: string) => {
    console.log("[TrackingAPI] Requesting tracking status for rideId:", rideId);
    try {
      const response = await serverApiInstance.get(`/tracking/${rideId}/status`, { withCredentials: true });
      console.log("[TrackingAPI] Get tracking status response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[TrackingAPI] Error fetching tracking status:", {
        rideId,
        error: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
  getTrackingPosition: async (rideId: string) => {
    console.log("[TrackingAPI] Fetching tracking position for rideId:", rideId);
    try {
      const response = await serverApiInstance.get(`/tracking/${rideId}/position`, { withCredentials: true });
      console.log("[TrackingAPI] Get tracking position response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[TrackingAPI] Error fetching tracking position:", {
        rideId,
        error: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  }, // Added comma here
  stopTracking: async (rideId: string) => {
    console.log("[TrackingAPI] Stopping tracking for rideId:", rideId);
    try {
      const response = await serverApiInstance.put(`/tracking/${rideId}/stop`, {}, { withCredentials: true });
      console.log("[TrackingAPI] Stop tracking response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[TrackingAPI] Error stopping tracking:", {
        rideId,
        error: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },
};