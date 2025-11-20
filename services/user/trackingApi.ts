import { serverApiInstance } from "../api";
import { TRACKING_ROUTES } from "../../constants/apiRoutes";

export const trackingApi = {
  startTracking: async (rideId: string, driverId: string, initialPosition: [number, number]) => {
    console.log("[TrackingAPI] Starting tracking for rideId:", rideId, "driverId:", driverId, "initialPosition:", initialPosition);
    try {
      const response = await serverApiInstance.post(
        TRACKING_ROUTES.START(rideId), 
        { driverId, initialPosition }, 
        { withCredentials: true }
      );
      console.log("[TrackingAPI] Start tracking response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[TrackingAPI] Error starting tracking:", {
        rideId,
        error: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  updateTrackingPosition: async (rideId: string, position: [number, number]) => {
    console.log("[TrackingAPI] Updating tracking position for rideId:", rideId, "position:", position);
    try {
      const response = await serverApiInstance.put(
        TRACKING_ROUTES.UPDATE_POSITION(rideId), 
        { position }, 
        { withCredentials: true }
      );
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
      const response = await serverApiInstance.get(
        TRACKING_ROUTES.GET_STATUS(rideId), 
        { withCredentials: true }
      );
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
      const response = await serverApiInstance.get(
        TRACKING_ROUTES.GET_POSITION(rideId), 
        { withCredentials: true }
      );
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
  },
  
  stopTracking: async (rideId: string) => {
    console.log("[TrackingAPI] Stopping tracking for rideId:", rideId);
    try {
      const response = await serverApiInstance.put(
        TRACKING_ROUTES.STOP(rideId), 
        {}, 
        { withCredentials: true }
      );
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