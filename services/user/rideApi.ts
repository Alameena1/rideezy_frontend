import { api } from "../api";
import { EditRideDto } from "../../types/ride.types";

export interface Ride {
  _id: string;
  rideId: string;
  startPoint: string;
  endPoint: string;
  date: string;
  time: string;
  passengerCount: number;
  totalPeople: number;
  distanceKm: number;
  costPerPerson: number;
  routeGeometry: string;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  status: string;
  vehicleId: string;
  driverId: string;
  totalFuelCost: number;
  fuelPrice: number;
  mileage: number;
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  createdAt: string;
  updatedAt: string;
}

export const rideApi = {
  startRide: async (data: {
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
  }) => {
    try {
      const response = await api.post("/rides/start", data);
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error starting ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to start ride");
    }
  },

  getRides: async () => {
    try {
      const response = await api.get("/rides/rides", {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error fetching rides:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch rides");
    }
  },

  getJoinedRides: async () => {
    try {
      const response = await api.get("/rides/joined", {
        withCredentials: true,
      });
      console.log("[rideApi] Get joined rides response:", response);
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.from(response.data?.data || []);
      return { data, error: null };
    } catch (error: any) {
      console.error("[rideApi] Error fetching joined rides:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch joined rides");
    }
  },

  findNearestRides: async (data: { userLocation: string; destination: string }) => {
    try {
      const response = await api.post("/rides/nearest", data, {
        withCredentials: true,
      });
      return response.data.data as Ride[];
    } catch (error: any) {
      console.error("[rideApi] Error finding nearest rides:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to find nearest rides");
    }
  },

  joinRide: async (data: { rideId: string; pickupLocation: string; dropoffLocation: string }) => {
    try {
      const response = await api.post("/rides/join", data, {
        withCredentials: true,
      });
      return response.data.data as Ride;
    } catch (error: any) {
      console.error("[rideApi] Error joining ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to join ride");
    }
  },

  createRidePaymentOrder: async (rideId: string) => {
    try {
      const response = await api.post("/rides/create-ride-order", { rideId }, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error creating ride payment order:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create payment order for ride");
    }
  },

  verifyAndJoinRide: async (data:
    {
      rideId: string;
      pickupLocation: string;
      dropoffLocation: string;
      paymentId: string;
      orderId: string;
      signature: string;
    }) => {
    try {
      const response = await api.post("/rides/verify-and-join", data, {
        withCredentials: true,
      });
      return response.data.data as Ride;
    } catch (error: any) {
      console.error("[rideApi] Error verifying and joining ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to verify payment and join ride");
    }
  },

  editRide: async (rideId: string, driverId: string, dto: EditRideDto) => {
    try {
      const response = await api.put(`/rides/${rideId}`, dto, {
        withCredentials: true,
        headers: { "Driver-Id": driverId },
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error editing ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to edit ride");
    }
  },

  startTracking: async (rideId: string, driverId: string) => {
    try {
      const response = await api.put(`/rides/${rideId}/start-tracking`, {}, {
        withCredentials: true,
        headers: { "Driver-Id": driverId },
      });
      console.log("[rideApi] Start tracking response:", response);
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error starting tracking:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to start tracking");
    }
  },

  cancelRide: async (rideId: string) => {
    try {
      const response = await api.delete(`/rides/${rideId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error cancelling ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to cancel ride");
    }
  },

  cancelJoinedRide: async (rideId: string) => {
    try {
      const response = await api.delete(`/rides/joined/${rideId}`, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error cancelling joined ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to cancel joined ride");
    }
  },

  updateRide: async (id: string, updates: { currentPosition?: [number, number], passengerId: string; action: "picked" | "dropped" }, driverId: string) => {
  try {
    console.log("[rideApi] Sending updateRide request:", {
      url: `/rides/${id}/update`,
      updates,
      driverId,
    });
    const response = await api.put(`/rides/${id}/update`, updates, {
      withCredentials: true,
      headers: { "Driver-Id": driverId }, 
    });
    console.log("[rideApi] Update ride response:", response.data);
    return response.data.data as Ride;
  } catch (error: any) {
    console.error("[rideApi] Error updating ride:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.message || "Failed to update ride");
  }
},
};