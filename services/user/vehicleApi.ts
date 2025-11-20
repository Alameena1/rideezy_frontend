import { serverApiInstance } from "../api";
import { VEHICLE_ROUTES } from "../../constants/apiRoutes";

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
  note?: string;
}

export const vehicleApi = {
  getVehicles: async (): Promise<Vehicle[]> => {
    try {
      const response = await serverApiInstance.get(VEHICLE_ROUTES.GET_ALL);
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
    const response = await serverApiInstance.post(VEHICLE_ROUTES.CREATE, vehicleData);
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
    const response = await serverApiInstance.put(VEHICLE_ROUTES.UPDATE(vehicleId), vehicleData);
    return response.data;
  },

  deleteVehicle: async (vehicleId: string) => {
    try {
      const response = await serverApiInstance.delete(VEHICLE_ROUTES.DELETE(vehicleId));
      return response.data;
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      throw error;
    }
  },

  reapplyVehicle: async (
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
    try {
      const response = await serverApiInstance.post(VEHICLE_ROUTES.REAPPLY(vehicleId), vehicleData);
      return response.data;
    } catch (error) {
      console.error("Failed to reapply vehicle:", error);
      throw error;
    }
  },
};