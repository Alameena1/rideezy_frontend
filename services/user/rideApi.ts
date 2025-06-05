import { api } from "../api";

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
  passengers: string[];
  status: string;
  vehicleId: string;
  driverId: string;
  totalFuelCost: number;
  fuelPrice: number;
  mileage: number;
  pickupPoints: { passengerId: string; location: string }[];
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
    costPerPerson: number;
  }) => {
    try {
      const response = await api.post("/rides/start", data);
      return response.data;
    } catch (error: any) {
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
      throw new Error(error.response?.data?.message || "Failed to fetch rides");
    }
  },

  findNearestRides: async (data: { userLocation: string; destination: string }) => {
    try {
      const response = await api.post("/rides/nearest", data, {
        withCredentials: true,
      });
      return response.data.data as Ride[];
    } catch (error: any) {
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
      const response = await api.post("/rides/verify-and-join", data, {
        withCredentials: true,
      });
      return response.data.data as Ride;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to verify payment and join ride");
    }
  },
};