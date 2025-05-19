import { api } from "../api";

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
    const response = await api.post("/rides/start", data);
    return response.data;
  },

  getRides: async () => {
    try {
      const response = await api.get("/rides/rides", {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};