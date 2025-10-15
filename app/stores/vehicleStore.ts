import { create } from "zustand";
import { clientApiService } from "@/services/client/client-api";
import { useSocketStore } from "./socketStore";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insurance?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Expired' | 'Pending';
  };
  pollution?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Expired' | 'Pending';
  };
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string;
  documentImage: string;
  mileage: number;
  seatCapacity: number;
  imageUrl: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  note?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface VehicleStore {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  searchTerm: string;
  fetchVehicles: (page?: number, limit?: number, search?: string) => Promise<void>;
  addVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  updateVehicle: (vehicleId: string, updatedVehicle: Partial<Vehicle>) => Promise<void>;
  setSearchTerm: (search: string) => void;
  setupSocketListeners: () => void;
  addPendingVehicle: (vehicleId: string) => void;
  clearPendingVehicle: (vehicleId: string) => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => {
  const pendingVehicles = new Set<string>();

  return {
    vehicles: [],
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
    searchTerm: '',
    
    fetchVehicles: async (page: number = 1, limit: number = 10, search: string = '') => {
      set({ isLoading: true, error: null });
      try {
        const response = await clientApiService.vehicle.getVehicles({ 
          page, 
          limit, 
          search 
        });
        
        console.log("API Response:", response);
        
        if (response?.success && response.data) {
          const vehiclesData = response.data.vehicles || [];
          const paginationData = response.data.pagination || {};
          
          console.log("Vehicles data:", vehiclesData);
          console.log("Pagination data:", paginationData);
          
          const fetchedVehicles = Array.isArray(vehiclesData)
            ? vehiclesData.map((vehicle: any) => ({
                ...vehicle,
                imageUrl: vehicle.vehicleImage || "/placeholder.svg?height=200&width=300",
              }))
            : [];
          
          set({ 
            vehicles: fetchedVehicles,
            pagination: {
              currentPage: paginationData.currentPage || 1,
              totalPages: paginationData.totalPages || 0,
              totalCount: paginationData.totalCount || 0,
              hasNextPage: paginationData.hasNextPage || false,
              hasPrevPage: paginationData.hasPrevPage || false,
            },
            searchTerm: search
          });
          
          console.log("Updated store with vehicles:", fetchedVehicles.length);
        } else {
          set({ error: "Failed to fetch vehicles. Please try again." });
        }
      } catch (error: any) {
        console.error("Error fetching vehicles:", error);
        set({ error: error.response?.data?.message || "Failed to fetch vehicles. Please try again." });
      } finally {
        set({ isLoading: false });
      }
    },
    
    addVehicle: (vehicle: Vehicle) => {
      set((state) => {
        if (state.vehicles.some((v) => v._id === vehicle._id)) {
          console.log("[useVehicleStore] Vehicle already exists, skipping add:", vehicle._id);
          return state;
        }
        console.log("[useVehicleStore] Adding vehicle:", vehicle._id);
        return { vehicles: [...state.vehicles, vehicle] };
      });
      pendingVehicles.delete(vehicle._id);
    },
    
    deleteVehicle: async (vehicleId: string) => {
      try {
        await clientApiService.vehicle.deleteVehicle(vehicleId);
        set((state) => ({
          vehicles: state.vehicles.filter((vehicle) => vehicle._id !== vehicleId),
        }));
      } catch (error: any) {
        set({ error: error.response?.data?.message || "Failed to delete vehicle. Please try again." });
      }
    },
    
    updateVehicle: async (vehicleId: string, updatedVehicle: Partial<Vehicle>) => {
      try {
        await clientApiService.vehicle.updateVehicle(vehicleId, updatedVehicle);
        set((state) => ({
          vehicles: state.vehicles.map((vehicle) =>
            vehicle._id === vehicleId ? { ...vehicle, ...updatedVehicle } : vehicle
          ),
        }));
      } catch (error: any) {
        set({ error: error.response?.data?.message || "Failed to update vehicle. Please try again." });
      }
    },
    
    setSearchTerm: (search: string) => {
      set({ searchTerm: search });
    },
    
    addPendingVehicle: (vehicleId: string) => {
      console.log("[useVehicleStore] Adding pending vehicle:", vehicleId);
      pendingVehicles.add(vehicleId);
    },
    
    clearPendingVehicle: (vehicleId: string) => {
      console.log("[useVehicleStore] Clearing pending vehicle:", vehicleId);
      pendingVehicles.delete(vehicleId);
    },
    
    setupSocketListeners: () => {
      const { socket } = useSocketStore.getState();
      if (socket) {
        socket.on("vehicle_updated", (updatedVehicle: Vehicle) => {
          console.log("[Socket] Vehicle updated:", updatedVehicle._id);
          get().updateVehicle(updatedVehicle._id, updatedVehicle);
        });
        
        socket.on("vehicle_added", (newVehicle: Vehicle) => {
          console.log("[Socket] Vehicle added event:", newVehicle._id);
          if (pendingVehicles.has(newVehicle._id)) {
            console.log("[Socket] Skipping duplicate vehicle_added event for:", newVehicle._id);
            return;
          }
          get().addVehicle(newVehicle);
        });
        
        socket.on("vehicle_deleted", (vehicleId: string) => {
          console.log("[Socket] Vehicle deleted:", vehicleId);
          get().deleteVehicle(vehicleId);
        });
      }
    },
  };
});