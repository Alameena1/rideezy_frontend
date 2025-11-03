"use client";

import React, { createContext, useContext, useReducer, useCallback, useState, useRef, useEffect } from 'react';
import { clientApiService } from '@/services/client/client-api';
import useAuth from '@/app/hooks/useAuth';
import { getPlaceNamesForRides } from '../utils/rideUtils';

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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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
  pagination: PaginationInfo;
  searchTerm: string;
  itemsPerPage: number;
}

type RideDetailsAction =
  | { type: 'SET_RIDES'; payload: { rides: Ride[]; pagination: PaginationInfo } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EXPANDED_RIDE'; payload: string | null }
  | { type: 'SET_EDIT_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_RIDE'; payload: Ride | null }
  | { type: 'SET_EMERGENCY_STOP_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_RIDE_FOR_STOP'; payload: Ride | null }
  | { type: 'SET_PAGINATION'; payload: PaginationInfo }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_ITEMS_PER_PAGE'; payload: number }
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
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  searchTerm: '',
  itemsPerPage: 5,
};

function rideDetailsReducer(state: RideDetailsState, action: RideDetailsAction): RideDetailsState {
  switch (action.type) {
    case 'SET_RIDES':
      return { 
        ...state, 
        rides: action.payload.rides,
        pagination: action.payload.pagination
      };
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
    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_ITEMS_PER_PAGE':
      return { ...state, itemsPerPage: action.payload };
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
  user: any;
  placeNames: { [key: string]: PlaceName };
  fetchRides: (page?: number, limit?: number, search?: string) => Promise<void>;
  toggleRideExpansion: (rideId: string) => void;
  openEditModal: (ride: Ride) => void;
  closeEditModal: () => void;
  openEmergencyStopModal: (ride: Ride) => void;
  closeEmergencyStopModal: () => void;
  updateRide: (rideId: string, updates: Partial<Ride>) => void;
  setSearchTerm: (term: string) => void;
  setItemsPerPage: (items: number) => void;
  handlePageChange: (page: number) => void;
}

const RideDetailsContext = createContext<RideDetailsContextType | undefined>(undefined);

export function RideDetailsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(rideDetailsReducer, initialState);
  const [placeNames, setPlaceNames] = useState<{ [key: string]: PlaceName }>({});
  const { user, isAuthenticated } = useAuth();
  
  const stateRef = useRef(state);
  const userRef = useRef(user);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const initialFetchDone = useRef(false);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    userRef.current = user;
    isAuthenticatedRef.current = isAuthenticated;
  }, [user, isAuthenticated]);

  // FIXED: Auto-fetch rides with better authentication handling
  useEffect(() => {
    const initializeRides = async () => {
      if (!initialFetchDone.current && !fetchInProgress.current) {
        console.log("[RideDetails] Initializing rides fetch...");
        initialFetchDone.current = true;
        await fetchRides(1, state.itemsPerPage, "");
      }
    };

    // Try to fetch regardless of authentication status
    // The API service will handle authentication errors
    initializeRides();
  }, []); // Empty dependency array

  // FIXED: fetchRides with better error handling
  const fetchRides = useCallback(async (page: number = 1, limit: number = stateRef.current.itemsPerPage, search: string = stateRef.current.searchTerm) => {
    if (fetchInProgress.current) {
      console.log("[RideDetails] Fetch already in progress, skipping...");
      return;
    }

    fetchInProgress.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      console.log("[RideDetails] Fetching rides with pagination:", { page, limit, search });
      
      const response = await clientApiService.ride.getRides({ page, limit, search });
      console.log("[RideDetails] Paginated API response:", response);

      let ridesData = [];
      let paginationData = stateRef.current.pagination;
      
      if (response && response.success && response.data) {
        if (response.data.rides && Array.isArray(response.data.rides)) {
          ridesData = response.data.rides;
          
          if (response.data.pagination) {
            paginationData = {
              currentPage: response.data.pagination.currentPage || page,
              totalPages: response.data.pagination.totalPages || 1,
              totalCount: response.data.pagination.totalCount || ridesData.length,
              hasNextPage: response.data.pagination.hasNextPage || false,
              hasPrevPage: response.data.pagination.hasPrevPage || false,
            };
          }
          
          console.log("[RideDetails] Using paginated format, found:", ridesData.length, "rides");
        } 
        else if (Array.isArray(response.data)) {
          ridesData = response.data;
          paginationData = {
            currentPage: 1,
            totalPages: 1,
            totalCount: ridesData.length,
            hasNextPage: false,
            hasPrevPage: false,
          };
          console.log("[RideDetails] Using direct array format, found:", ridesData.length, "rides");
        }
        else {
          console.warn("[RideDetails] Unexpected response format:", response);
          dispatch({ type: 'SET_ERROR', payload: "No rides found or invalid response format." });
          dispatch({ 
            type: 'SET_RIDES', 
            payload: { rides: [], pagination: paginationData } 
          });
          fetchInProgress.current = false;
          return;
        }
      } else {
        console.warn("[RideDetails] Invalid response structure:", response);
        dispatch({ type: 'SET_ERROR', payload: "No rides found or invalid response format." });
        dispatch({ 
          type: 'SET_RIDES', 
          payload: { rides: [], pagination: paginationData } 
        });
        fetchInProgress.current = false;
        return;
      }

      console.log("[RideDetails] Processed rides data:", ridesData);
      console.log("[RideDetails] Pagination data:", paginationData);
      
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
      dispatch({ 
        type: 'SET_RIDES', 
        payload: { rides: mappedRides, pagination: paginationData } 
      });

      // Fetch place names for all rides with better error handling
      try {
        console.log("[RideDetails] Fetching place names for rides...");
        const newPlaceNames = await getPlaceNamesForRides(mappedRides);
        setPlaceNames(newPlaceNames);
        console.log("[RideDetails] Place names fetched successfully:", newPlaceNames);
      } catch (geocodeError) {
        console.error("[RideDetails] Error fetching place names, using coordinates as fallback:", geocodeError);
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
        errorMessage = "Please log in to view your rides.";
      } else if (error.response?.status === 404) {
        errorMessage = "No rides found for your account.";
      } else if (error.message?.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ 
        type: 'SET_RIDES', 
        payload: { rides: [], pagination: stateRef.current.pagination } 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      fetchInProgress.current = false;
    }
  }, []);

  // FIXED: updateRide with useCallback to prevent recreation
  const updateRide = useCallback((rideId: string, updates: Partial<Ride>) => {
    dispatch({ type: 'UPDATE_RIDE', payload: { rideId, updates } });
  }, []);

  const toggleRideExpansion = useCallback((rideId: string) => {
    dispatch({
      type: 'SET_EXPANDED_RIDE',
      payload: state.expandedRide === rideId ? null : rideId
    });
  }, [state.expandedRide]);

  const openEditModal = useCallback((ride: Ride) => {
    dispatch({ type: 'SET_SELECTED_RIDE', payload: ride });
    dispatch({ type: 'SET_EDIT_MODAL_OPEN', payload: true });
  }, []);

  const closeEditModal = useCallback(() => {
    dispatch({ type: 'SET_EDIT_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_RIDE', payload: null });
  }, []);

  const openEmergencyStopModal = useCallback((ride: Ride) => {
    dispatch({ type: 'SET_SELECTED_RIDE_FOR_STOP', payload: ride });
    dispatch({ type: 'SET_EMERGENCY_STOP_MODAL_OPEN', payload: true });
  }, []);

  const closeEmergencyStopModal = useCallback(() => {
    dispatch({ type: 'SET_EMERGENCY_STOP_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_RIDE_FOR_STOP', payload: null });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const setItemsPerPage = useCallback((items: number) => {
    dispatch({ type: 'SET_ITEMS_PER_PAGE', payload: items });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    fetchRides(page, state.itemsPerPage, state.searchTerm);
  }, [fetchRides, state.itemsPerPage, state.searchTerm]);

  const value: RideDetailsContextType = {
    ...state,
    user,
    placeNames,
    fetchRides,
    toggleRideExpansion,
    openEditModal,
    closeEditModal,
    openEmergencyStopModal,
    closeEmergencyStopModal,
    updateRide,
    setSearchTerm,
    setItemsPerPage,
    handlePageChange,
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