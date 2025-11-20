import axios from "axios";
import { adminApi } from "./adminApi";

export interface Ride {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  distanceKm: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  status: string;
  createdAt: string;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  routeGeometry: string;
}

export interface User {
  _id: string;
  name: string;
}

interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "Active" | "Completed" | "Cancelled" | "Blocked";
  dateFrom?: string;
  dateTo?: string;
}

export const adminRideApi = {
  getRides: async (query: PaginationQuery = {}): Promise<{ success: boolean; data: Ride[]; pagination: any }> => {
    try {
      const response = await adminApi.get("/admin/rides", { params: query }); // Added /admin prefix
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch rides");
      }
      throw new Error("An unknown error occurred");
    }
  },

  getRideById: async (rideId: string): Promise<Ride> => {
    try {
      const response = await adminApi.get(`/admin/rides/${rideId}`); // Added /admin prefix
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
      const response = await adminApi.patch(`/admin/rides/${rideId}/cancel`, {}); // Added /admin prefix
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
      const response = await adminApi.patch(`/admin/rides/${rideId}/block`, {}); // Added /admin prefix
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
      const response = await adminApi.get(`/admin/users/${userId}`); // Added /admin prefix
      return response.data.user;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch user details");
      }
      throw new Error("An unknown error occurred");
    }
  },
};