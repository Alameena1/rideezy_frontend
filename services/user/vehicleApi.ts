import { api } from "../api";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string;
  documentImage: string;
  mileage: number;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const vehicleApi = {
  getVehicles: async (): Promise<Vehicle[]> => {
    try {
      const response = await api.get("/vehicles");
      const vehicles = response.data?.data || [];
      if (!Array.isArray(vehicles)) {
        return [];
      }
      return vehicles;
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      return [];
    }
  },

  addVehicle: async (vehicleData: {
    vehicleName: string;
    vehicleType: string;
    licensePlate: string;
    color?: string;
    insuranceNumber?: string;
    vehicleImage: string;
    documentImage: string;
    mileage: number;
  }) => {
    const response = await api.post("/vehicles", vehicleData);
    return response.data;
  },

  updateVehicle: async (
    vehicleId: string,
    vehicleData: {
      vehicleName: string;
      vehicleType: string;
      licensePlate: string;
      color?: string;
      insuranceNumber?: string;
      vehicleImage: string;
      documentImage: string;
      mileage: number;
    }
  ) => {
    const response = await api.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  },

  deleteVehicle: async (vehicleId: string) => {
    try {
      const response = await api.delete(`/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      throw error;
    }
  },
};