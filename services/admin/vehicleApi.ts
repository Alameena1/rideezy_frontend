import axios from "axios";
import { adminApi } from "./adminApi";

interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "Pending" | "Approved" | "Rejected";
  vehicleType?: string;
}

export const adminVehicleApi = {
  getVehicles: async (query: PaginationQuery = {}) => {
    try {
      const response = await adminApi.get("/admin/vehicles", { params: query }); // Added /admin prefix
      console.log("Fetched Vehicles:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch vehicles");
      }
      throw new Error("An unknown error occurred");
    }
  },

  updateVehicleStatus: async (vehicleId: string, status: "Approved" | "Rejected", note?: string) => {
    try {
      const response = await adminApi.patch(`/admin/vehicles/${vehicleId}/status`, { status, note }); // Added /admin prefix
      console.log("Updated Vehicle Status:", response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update vehicle status");
      }
      throw new Error("An unknown error occurred");
    }
  },
};