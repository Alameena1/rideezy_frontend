import { adminApi } from "./adminApi";

export const adminVehicleApi = {
  getVehicles: async () => {
    try {
      const response = await adminApi.get("/vehicles");
      return response.data.vehicles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to fetch vehicles");
      }
      throw new Error("An unknown error occurred");
    }
  },

  updateVehicleStatus: async (vehicleId: string, status: "Approved" | "Rejected", note?: string) => {
    try {
      const response = await adminApi.patch(`/vehicles/${vehicleId}/status`, { status, note });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to update vehicle status");
      }
      throw new Error("An unknown error occurred");
    }
  },

  verifyGovId: async (userId: string, status: "Verified" | "Rejected", rejectionNote?: string) => {
    try {
      const response = await adminApi.post("/verify-gov-id", { userId, status, rejectionNote });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || "Failed to verify government ID");
      }
      throw new Error("An unknown error occurred");
    }
  },
};