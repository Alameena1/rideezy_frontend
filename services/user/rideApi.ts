import { serverApiInstance } from "../serverInstance";
import { RIDE_ROUTES } from "../../constants/apiRoutes";
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
  pendingRequests?: { passengerId: string; passengerName: string; pickupLocation: string; dropoffLocation: string; pickupPlaceName?: string; dropoffPlaceName?: string; status: string; requestedAt: Date }[];
}

export const rideApi = {
  // INITIATE RIDE ENDPOINTS
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
      const response = await serverApiInstance.post(RIDE_ROUTES.START_RIDE, data);
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error starting ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to start ride");
    }
  },

  getRides: async () => {
    try {
      const response = await serverApiInstance.get(RIDE_ROUTES.GET_RIDES, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error fetching rides:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch rides");
    }
  },

  editRide: async (rideId: string, driverId: string, dto: EditRideDto) => {
    try {
      const response = await serverApiInstance.put(RIDE_ROUTES.EDIT_RIDE(rideId), dto, {
        withCredentials: true,
        headers: { "Driver-Id": driverId },
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error editing ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to edit ride");
    }
  },

  cancelRide: async (rideId: string) => {
    try {
      const response = await serverApiInstance.delete(RIDE_ROUTES.CANCEL_RIDE(rideId), {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error cancelling ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to cancel ride");
    }
  },

  startTracking: async (rideId: string, driverId: string) => {
    try {
      const response = await serverApiInstance.put(RIDE_ROUTES.START_TRACKING(rideId), {}, {
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

  // JOIN RIDE ENDPOINTS
  getJoinedRides: async () => {
    try {
      const response = await serverApiInstance.get(RIDE_ROUTES.GET_JOINED_RIDES, {
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
      const response = await serverApiInstance.post(RIDE_ROUTES.FIND_NEAREST_RIDES, data, {
        withCredentials: true,
      });
      return response.data.data as Ride[];
    } catch (error: any) {
      console.error("[rideApi] Error finding nearest rides:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to find nearest rides");
    }
  },

  joinRide: async (
    rideId: string,
    passengerId: string,
    pickupLocation: string,
    dropoffLocation: string
  ) => {
    try {
      console.log("[rideApi] Initiating joinRide with:", {
        rideId,
        passengerId,
        pickupLocation,
        dropoffLocation,
      });

      const response = await serverApiInstance.post(
        RIDE_ROUTES.JOIN_RIDE,
        {
          rideId,
          passengerId,
          pickupLocation,
          dropoffLocation,
        },
        { withCredentials: true }
      );

      console.log("[rideApi] Join ride response:", response.data);
      return response;
    } catch (error: any) {
      console.error("[rideApi] Error joining ride:", error);
      throw new Error(error.response?.data?.message || "Failed to join ride");
    }
  },

  handleJoinRequest: async (rideId: string, driverId: string, passengerId: string, action: "accept" | "reject") => {
    try {
      const ridesResponse = await serverApiInstance.get(RIDE_ROUTES.GET_RIDES, { withCredentials: true });
      const ride = ridesResponse.data.data?.find((r: Ride) => r.rideId === rideId);

      if (!ride) {
        throw new Error(`Ride with rideId ${rideId} not found`);
      }

      const response = await serverApiInstance.put(
        RIDE_ROUTES.HANDLE_JOIN_REQUEST(ride._id, passengerId),
        {
          driverId,
          action,
          pickupPlaceName: ride.pendingRequests?.find((p: { passengerId: string }) => p.passengerId === passengerId)?.pickupPlaceName || "Unknown",
          dropoffPlaceName: ride.pendingRequests?.find((p: { passengerId: string }) => p.passengerId === passengerId)?.dropoffPlaceName || "Unknown",
        },
        {
          withCredentials: true,
          headers: { "Driver-Id": driverId },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error handling join request:", error);
      throw new Error(error.response?.data?.message || `Failed to ${action} join request`);
    }
  },

  createRidePaymentOrder: async (rideId: string) => {
    try {
      const response = await serverApiInstance.post(RIDE_ROUTES.CREATE_RIDE_PAYMENT_ORDER, { rideId }, {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error creating ride payment order:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create payment order for ride");
    }
  },

  verifyAndJoinRide: async (data: {
    rideId: string;
    pickupLocation: string;
    dropoffLocation: string;
    paymentId: string;
    orderId: string;
    signature: string;
  }) => {
    try {
      const response = await serverApiInstance.post(RIDE_ROUTES.VERIFY_AND_JOIN, data, {
        withCredentials: true,
      });
      return response.data.data as Ride;
    } catch (error: any) {
      console.error("[rideApi] Error verifying and joining ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to verify payment and join ride");
    }
  },

  cancelJoinedRide: async (rideId: string) => {
    try {
      const response = await serverApiInstance.delete(RIDE_ROUTES.CANCEL_JOINED_RIDE(rideId), {
        withCredentials: true,
      });
      return response.data;
    } catch (error: any) {
      console.error("[rideApi] Error cancelling joined ride:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to cancel joined ride");
    }
  },

  updateRide: async (id: string, updates: { currentPosition?: [number, number]; passengerId: string; action: "picked" | "dropped" }, driverId: string) => {
    try {
      console.log("[rideApi] Sending updateRide request:", {
        url: RIDE_ROUTES.UPDATE_RIDE(id),
        updates,
        driverId,
      });
      const response = await serverApiInstance.put(RIDE_ROUTES.UPDATE_RIDE(id), updates, {
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