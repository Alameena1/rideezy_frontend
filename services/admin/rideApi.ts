import { adminApi } from "./adminApi";
import axios from "axios";

export interface Ride {
  _id: string;
  rideID: string;
  driverID: string;
  vehicleID: string;
  date: string;
  time: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  status: string;
  createdAt: string;
  passengers: string[];
  pickupPoints: { passengerId: string; location: string }[];
  routeGeometry: string;
}

export interface User {
  _id: string;
  name: string;
}

export const adminRideApi = {
  getRides: async (): Promise<Ride[]> => {
    try {
      const response = await adminApi.get("/rides");
      return response.data.rides;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch rides");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getRideById: async (rideId: string): Promise<Ride> => {
    try {
      const response = await adminApi.get(`/rides/${rideId}`);
      return response.data.ride;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch ride details");
      }
      throw new Error("An unknown error occurred");
    }
  },

  cancelRide: async (rideId: string): Promise<void> => {
    try {
      const response = await adminApi.patch(`/rides/${rideId}/cancel`, {});
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to cancel ride");
      }
      throw new Error("An unknown error occurred");
    }
  },

  blockRide: async (rideId: string): Promise<void> => {
    try {
      const response = await adminApi.patch(`/rides/${rideId}/block`, {});
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to block ride");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getUserById: async (userId: string): Promise<User> => {
    try {
      const response = await adminApi.get(`/users/${userId}`);
      return response.data.user;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch user details");
      }
      throw new Error("An unknown error occurred");
    }
  },
};