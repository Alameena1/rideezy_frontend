"use client";

import React, { createContext, useContext, useReducer, useCallback, useState } from 'react';
import { clientApiService } from '@/services/client/client-api';
import useAuth from '@/app/hooks/useAuth';
import { getPlaceNamesForRides } from '../utils/geocoding';

export interface Ride {
  _id: string;
  rideId?: string;
  driverId: string;
  vehicleId: string;
  date: string;
  time?: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  mileage?: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  status: "Pending" | "Started" | "Completed" | "Cancelled" | "EmergencyStopped";
  routeGeometry: string;
  currentPosition?: [number, number] | null;
  pendingRequests?: { passengerId: string; passengerName: string; pickupLocation: string; dropoffLocation: string; status: string }[];
}

interface PlaceName {
  startPlace: string;
  endPlace: string;
}

interface RideDetailsState {
  rides: Ride[];
  isLoading: boolean;
  error: string | null;
  expandedRide: string | null;
  editModalOpen: boolean;
  selectedRide: Ride | null;
  emergencyStopModalOpen: boolean;
  selectedRideForStop: Ride | null;
}

type RideDetailsAction =
  | { type: 'SET_RIDES'; payload: Ride[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EXPANDED_RIDE'; payload: string | null }
  | { type: 'SET_EDIT_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_RIDE'; payload: Ride | null }
  | { type: 'SET_EMERGENCY_STOP_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_RIDE_FOR_STOP'; payload: Ride | null }
  | { type: 'UPDATE_RIDE'; payload: { rideId: string; updates: Partial<Ride> } };

const initialState: RideDetailsState = {
  rides: [],
  isLoading: true,
  error: null,
  expandedRide: null,
  editModalOpen: false,
  selectedRide: null,
  emergencyStopModalOpen: false,
  selectedRideForStop: null,
};

function rideDetailsReducer(state: RideDetailsState, action: RideDetailsAction): RideDetailsState {
  switch (action.type) {
    case 'SET_RIDES':
      return { ...state, rides: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_EXPANDED_RIDE':
      return { ...state, expandedRide: action.payload };
    case 'SET_EDIT_MODAL_OPEN':
      return { ...state, editModalOpen: action.payload };
    case 'SET_SELECTED_RIDE':
      return { ...state, selectedRide: action.payload };
    case 'SET_EMERGENCY_STOP_MODAL_OPEN':
      return { ...state, emergencyStopModalOpen: action.payload };
    case 'SET_SELECTED_RIDE_FOR_STOP':
      return { ...state, selectedRideForStop: action.payload };
    case 'UPDATE_RIDE':
      return {
        ...state,
        rides: state.rides.map(ride =>
          ride._id === action.payload.rideId
            ? { ...ride, ...action.payload.updates }
            : ride
        ),
      };
    default:
      return state;
  }
}

interface RideDetailsContextType extends RideDetailsState {
  user: any; // Add user from useAuth
  placeNames: { [key: string]: PlaceName };
  fetchRides: () => Promise<void>;
  toggleRideExpansion: (rideId: string) => void;
  openEditModal: (ride: Ride) => void;
  closeEditModal: () => void;
  openEmergencyStopModal: (ride: Ride) => void;
  closeEmergencyStopModal: () => void;
  updateRide: (rideId: string, updates: Partial<Ride>) => void;
}

const RideDetailsContext = createContext<RideDetailsContextType | undefined>(undefined);

export function RideDetailsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(rideDetailsReducer, initialState);
  const [placeNames, setPlaceNames] = useState<{ [key: string]: PlaceName }>({});
  const { user, isAuthenticated } = useAuth();

 const fetchRides = useCallback(async () => {
  if (!user || !isAuthenticated) {
    dispatch({ type: 'SET_ERROR', payload: "Please log in to view your rides." });
    dispatch({ type: 'SET_LOADING', payload: false });
    return;
  }

  dispatch({ type: 'SET_LOADING', payload: true });
  dispatch({ type: 'SET_ERROR', payload: null });

  try {
    console.log("[RideDetails] Starting to fetch rides...");
    const response = await clientApiService.ride.getRides();
    console.log("[RideDetails] Raw API response:", response);

    let ridesData = [];
    
    // Updated response format handling for pagination
    if (response && response.success && response.data) {
      // New pagination format
      if (response.data.rides && Array.isArray(response.data.rides)) {
        ridesData = response.data.rides;
        console.log("[RideDetails] Using paginated rides format, found:", ridesData.length, "rides");
      } 
      // Old format - direct array in data
      else if (Array.isArray(response.data)) {
        ridesData = response.data;
        console.log("[RideDetails] Using direct array format, found:", ridesData.length, "rides");
      }
      // Array response
      else if (Array.isArray(response)) {
        ridesData = response;
        console.log("[RideDetails] Using array response format, found:", ridesData.length, "rides");
      }
      // Response with data array
      else if (response.data && Array.isArray(response.data.data)) {
        ridesData = response.data.data;
        console.log("[RideDetails] Using nested data array format, found:", ridesData.length, "rides");
      }
      // Response with rides array
      else if (response.rides && Array.isArray(response.rides)) {
        ridesData = response.rides;
        console.log("[RideDetails] Using rides array format, found:", ridesData.length, "rides");
      }
      else {
        console.warn("[RideDetails] Unexpected response format:", response);
        dispatch({ type: 'SET_ERROR', payload: "No rides found or invalid response format." });
        dispatch({ type: 'SET_RIDES', payload: [] });
        return;
      }
    } else {
      console.warn("[RideDetails] Invalid response structure:", response);
      dispatch({ type: 'SET_ERROR', payload: "No rides found or invalid response format." });
      dispatch({ type: 'SET_RIDES', payload: [] });
      return;
    }

    console.log("[RideDetails] Processed rides data:", ridesData);
    
    if (ridesData.length === 0) {
      console.log("[RideDetails] No rides found in the response");
      dispatch({ type: 'SET_RIDES', payload: [] });
      return;
    }

    const mappedRides: Ride[] = ridesData.map((ride: any) => ({
      _id: ride._id?.toString() || ride.id?.toString() || `temp-${Math.random()}`,
      rideId: ride.rideId || ride._id || "N/A",
      driverId: ride.driverId || "N/A",
      vehicleId: ride.vehicleId || "N/A",
      date: ride.date ? new Date(ride.date).toISOString().split("T")[0] : "N/A",
      time: ride.time && ride.time !== "N/A" ? ride.time : "N/A",
      startPoint: ride.startPoint || "N/A",
      endPoint: ride.endPoint || "N/A",
      distanceKm: ride.distanceKm || 0,
      mileage: ride.mileage || 0,
      fuelPrice: ride.fuelPrice || 0,
      passengerCount: ride.passengerCount || 0,
      totalFuelCost: ride.totalFuelCost || 0,
      costPerPerson: ride.costPerPerson || 0,
      totalPeople: ride.totalPeople || 0,
      passengers: ride.passengers || [],
      pickupPoints: ride.pickupPoints || [],
      dropoffPoints: ride.dropoffPoints || [],
      status: ride.status || "Pending",
      routeGeometry: ride.routeGeometry || "",
      currentPosition: ride.currentPosition || null,
      pendingRequests: ride.pendingRequests || [],
    }));

    console.log("[RideDetails] Mapped rides:", mappedRides);
    dispatch({ type: 'SET_RIDES', payload: mappedRides });

    // Fetch place names for all rides
    try {
      console.log("[RideDetails] Fetching place names for rides...");
      const newPlaceNames = await getPlaceNamesForRides(mappedRides);
      setPlaceNames(newPlaceNames);
      console.log("[RideDetails] Place names fetched successfully:", newPlaceNames);
    } catch (geocodeError) {
      console.error("[RideDetails] Error fetching place names:", geocodeError);
      // Set default place names using coordinates
      const defaultPlaceNames = mappedRides.reduce((acc, ride) => {
        acc[ride._id] = { 
          startPlace: ride.startPoint, 
          endPlace: ride.endPoint 
        };
        return acc;
      }, {} as { [key: string]: PlaceName });
      setPlaceNames(defaultPlaceNames);
    }

  } catch (error: any) {
    console.error("[RideDetails] Error fetching rides:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    
    let errorMessage = "Failed to fetch rides. Please try again.";
    
    if (error.response?.status === 401) {
      errorMessage = "Authentication failed. Please log in again.";
    } else if (error.response?.status === 404) {
      errorMessage = "No rides found for your account.";
    } else if (error.message?.includes("Network Error")) {
      errorMessage = "Network error. Please check your connection.";
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    dispatch({ type: 'SET_RIDES', payload: [] });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
}, [user, isAuthenticated]);

  const toggleRideExpansion = (rideId: string) => {
    dispatch({
      type: 'SET_EXPANDED_RIDE',
      payload: state.expandedRide === rideId ? null : rideId
    });
  };

  const openEditModal = (ride: Ride) => {
    dispatch({ type: 'SET_SELECTED_RIDE', payload: ride });
    dispatch({ type: 'SET_EDIT_MODAL_OPEN', payload: true });
  };

  const closeEditModal = () => {
    dispatch({ type: 'SET_EDIT_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_RIDE', payload: null });
  };

  const openEmergencyStopModal = (ride: Ride) => {
    dispatch({ type: 'SET_SELECTED_RIDE_FOR_STOP', payload: ride });
    dispatch({ type: 'SET_EMERGENCY_STOP_MODAL_OPEN', payload: true });
  };

  const closeEmergencyStopModal = () => {
    dispatch({ type: 'SET_EMERGENCY_STOP_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_RIDE_FOR_STOP', payload: null });
  };

  const updateRide = (rideId: string, updates: Partial<Ride>) => {
    dispatch({ type: 'UPDATE_RIDE', payload: { rideId, updates } });
  };

  const value: RideDetailsContextType = {
    ...state,
    user, // Include user from useAuth
    placeNames,
    fetchRides,
    toggleRideExpansion,
    openEditModal,
    closeEditModal,
    openEmergencyStopModal,
    closeEmergencyStopModal,
    updateRide,
  };

  return (
    <RideDetailsContext.Provider value={value}>
      {children}
    </RideDetailsContext.Provider>
  );
}

export function useRideDetails() {
  const context = useContext(RideDetailsContext);
  if (context === undefined) {
    throw new Error('useRideDetails must be used within a RideDetailsProvider');
  }
  return context;
}