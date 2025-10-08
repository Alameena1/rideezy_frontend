"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/app/hooks/useAuth";
import { clientApiService } from "@/services/client/client-api";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Route,
  MapPin,
  Calendar,
  Clock,
  Users,
  Car,
  Navigation,
  DollarSign,
  Fuel,
  Edit3,
  X,
  AlertTriangle,
  Play,
  Square,
  UserCheck,
  UserX
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as L from "leaflet";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "../../comp/MainLayout";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import Swal from "sweetalert2";

interface Ride {
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

export default function RideDetails() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [placeNames, setPlaceNames] = useState<{ [key: string]: PlaceName }>({});
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [pickupActions, setPickupActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [dropoffActions, setDropoffActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [pausedPassengerIds, setPausedPassengerIds] = useState<{ [rideId: string]: string[] }>({});
  const [simulationPaused, setSimulationPaused] = useState<{ [rideId: string]: boolean }>({});
  const [emergencyStopModalOpen, setEmergencyStopModalOpen] = useState(false);
  const [selectedRideForStop, setSelectedRideForStop] = useState<Ride | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [isStopping, setIsStopping] = useState(false);

  // Add all the missing ref declarations
  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const vehicleMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const animationIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const lastPositions = useRef<{ [key: string]: [number, number] | null }>({});
  const placeNameCache = useRef<{ [key: string]: string }>({});

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet")
        .then((module) => {
          setLeafletLoaded(module.default);
          console.log("[RideDetails] Leaflet loaded successfully");
        })
        .catch((err) => {
          console.error("[RideDetails] Failed to load Leaflet:", err);
          setError("Failed to load map library. Please try again.");
        });
    }
  }, []);

  useEffect(() => {
    // Only fetch rides if user is authenticated
    if (user && isAuthenticated) {
      fetchRidesWithRetry();
    } else if (!authLoading) {
      setError("Please log in to view your rides.");
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  const calculateHaversineDistance = (coord1: [number, number], coord2: [number, number]): number => {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2 || coord1.some(isNaN) || coord2.some(isNaN)) {
      console.error("[RideDetails] Invalid coordinates for Haversine:", { coord1, coord2 });
      return Infinity;
    }
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const reverseGeocode = async (lat: number, lon: number, retries = 3, delay = 2000): Promise<string> => {
    const cacheKey = `${lat},${lon}`;
    if (placeNameCache.current[cacheKey]) {
      console.log("[RideDetails] Returning cached place name for", cacheKey);
      return placeNameCache.current[cacheKey];
    }

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
          headers: { 'User-Agent': 'RideEzy/1.0 (contact@rideezy.com)' },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.display_name) {
          throw new Error("No display_name in response");
        }
        const placeName = data.display_name;
        placeNameCache.current[cacheKey] = placeName;
        console.log("[RideDetails] Successfully fetched place name for", cacheKey, ":", placeName);
        return placeName;
      } catch (error) {
        console.error(`[RideDetails] Reverse geocode attempt ${i + 1} failed for ${cacheKey}:`, error);
        if (i < retries - 1) {
          console.log(`[RideDetails] Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(`[RideDetails] All retries failed for ${cacheKey}, returning coordinates`);
    return `${lat},${lon}`;
  };

  const fetchRides = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("[RideDetails] Starting to fetch rides...");
      const response = await clientApiService.ride.getRides();
      console.log("[RideDetails] Raw API response:", response);
      console.log("[RideDetails] Response structure:", {
        data: response.data,
        success: response.success,
        status: response.status,
        fullResponse: response
      });

      // Handle different response formats
      let ridesData = [];
      
      if (Array.isArray(response)) {
        ridesData = response;
        console.log("[RideDetails] Response is direct array");
      } else if (response && Array.isArray(response.data)) {
        ridesData = response.data;
        console.log("[RideDetails] Response has data array");
      } else if (response && response.data && Array.isArray(response.data.data)) {
        ridesData = response.data.data;
        console.log("[RideDetails] Response has nested data array");
      } else if (response && response.success && Array.isArray(response.data)) {
        ridesData = response.data;
        console.log("[RideDetails] Response has success flag and data array");
      } else if (response && response.rides && Array.isArray(response.rides)) {
        ridesData = response.rides;
        console.log("[RideDetails] Response has rides array");
      } else {
        console.warn("[RideDetails] Unexpected response format:", response);
        setError("No rides found or invalid response format.");
        setRides([]);
        return;
      }

      console.log("[RideDetails] Processed rides data:", ridesData);
      
      if (ridesData.length === 0) {
        console.log("[RideDetails] No rides found in the response");
        setRides([]);
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
        pendingRequests: ride.pendingRequests || [],
      }));

      console.log("[RideDetails] Mapped rides:", mappedRides);
      setRides(mappedRides);

      // Fetch place names
      const placePromises = mappedRides.map(async (ride: Ride) => {
        try {
          const [startLat, startLon] = ride.startPoint.split(",").map(Number);
          const [endLat, endLon] = ride.endPoint.split(",").map(Number);
          
          if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
            console.warn(`[RideDetails] Invalid coordinates for ride ${ride._id}: ${ride.startPoint}, ${ride.endPoint}`);
            return { rideId: ride._id, startPlace: ride.startPoint, endPlace: ride.endPoint };
          }
          
          let startPlace = ride.startPoint;
          let endPlace = ride.endPoint;
          
          try {
            startPlace = await reverseGeocode(startLat, startLon);
            endPlace = await reverseGeocode(endLat, endLon);
          } catch (error) {
            console.error(`[RideDetails] Failed to geocode for ride ${ride._id}:`, error);
          }
          
          return { rideId: ride._id, startPlace, endPlace };
        } catch (error) {
          console.error(`[RideDetails] Error processing place names for ride ${ride._id}:`, error);
          return { rideId: ride._id, startPlace: ride.startPoint, endPlace: ride.endPoint };
        }
      });

      const placeResults = await Promise.all(placePromises);
      const newPlaceNames = placeResults.reduce((acc, { rideId, startPlace, endPlace }) => {
        acc[rideId] = { startPlace, endPlace };
        return acc;
      }, {} as { [key: string]: PlaceName });
      
      setPlaceNames(newPlaceNames);

      // Initialize action states
      const initialPickupActions = mappedRides.reduce((acc, ride) => {
        acc[ride._id] = ride.passengers.reduce((passAcc, pass) => {
          passAcc[pass.passengerId] = pass.pickedUp || false;
          return passAcc;
        }, {} as { [key: string]: boolean });
        return acc;
      }, {} as { [key: string]: { [key: string]: boolean } });
      
      const initialDropoffActions = mappedRides.reduce((acc, ride) => {
        acc[ride._id] = ride.passengers.reduce((passAcc, pass) => {
          passAcc[pass.passengerId] = pass.droppedOff || false;
          return passAcc;
        }, {} as { [key: string]: boolean });
        return acc;
      }, {} as { [key: string]: { [key: string]: boolean } });
      
      setPickupActions(initialPickupActions);
      setDropoffActions(initialDropoffActions);

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
      
      setError(errorMessage);
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRidesWithRetry = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await fetchRides();
        return;
      } catch (error) {
        console.warn(`[RideDetails] Fetch attempt ${i + 1} failed:`, error);
        if (i < retries - 1) {
          console.log(`[RideDetails] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
  };

  const initializeMap = useCallback(
    async (ride: Ride, mapContainer: HTMLDivElement) => {
      if (!mapContainer || mapRefs.current[ride._id] || !leafletLoaded) {
        console.log("[RideDetails] Map initialization skipped or already exists for", ride._id);
        return;
      }

      console.log("[RideDetails] Initializing map for ride", ride._id);
      
      // Clear any existing content
      mapContainer.innerHTML = '';
      
      const map = leafletLoaded.map(mapContainer).setView([0, 0], 8);
      if (!map) {
        console.error("[RideDetails] Failed to create Leaflet map for", ride._id);
        return;
      }
      
      leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      
      mapRefs.current[ride._id] = map;

      // Set container styles
      mapContainer.style.height = "400px";
      mapContainer.style.width = "100%";
      mapContainer.style.position = "relative";
      mapContainer.style.visibility = "visible";
      mapContainer.style.overflow = "hidden";

      try {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const initialPosition = ride.currentPosition || coordinates[0];

        // Create vehicle marker if it doesn't exist
        if (!vehicleMarkerRefs.current[ride._id] && map) {
          vehicleMarkerRefs.current[ride._id] = leafletLoaded.marker(initialPosition, {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup("Vehicle");
        }
        
        if (vehicleMarkerRefs.current[ride._id]) {
          vehicleMarkerRefs.current[ride._id].setLatLng(initialPosition);
        }

        // Create route layer
        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { 
          color: "#3b82f6", 
          weight: 5,
          opacity: 0.7
        }).addTo(map);

        // Create start and end markers
        const [startLat, startLng] = coordinates[0];
        const [endLat, endLng] = coordinates[coordinates.length - 1];
        
        startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`Start: ${placeNames[ride._id]?.startPlace || ride.startPoint}`);

        endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`End: ${placeNames[ride._id]?.endPlace || ride.endPoint}`);

        // Create pickup markers
        pickupMarkerRefs.current[ride._id] = ride.pickupPoints.map((pickup, index) => {
          const [lat, lng] = pickup.location.split(",").map(Number);
          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} - Pickup: ${pickup.placeName}`);
        });

        // Create dropoff markers
        dropoffMarkerRefs.current[ride._id] = ride.dropoffPoints.map((dropoff, index) => {
          const [lat, lng] = dropoff.location.split(",").map(Number);
          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} - Drop-off: ${dropoff.placeName}`);
        });

        // Fit map to show all markers
        const allCoordinates = [
          ...coordinates,
          ...ride.pickupPoints.map(p => {
            const [lat, lng] = p.location.split(",").map(Number);
            return [lat, lng] as [number, number];
          }),
          ...ride.dropoffPoints.map(d => {
            const [lat, lng] = d.location.split(",").map(Number);
            return [lat, lng] as [number, number];
          })
        ];

        if (allCoordinates.length > 0) {
          const bounds = leafletLoaded.latLngBounds(allCoordinates);
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        map.invalidateSize();
        lastPositions.current[ride._id] = initialPosition;
        console.log("[RideDetails] Map initialized for ride", ride._id);
      } catch (error) {
        console.error("[RideDetails] Error initializing map for ride", ride._id, ":", error);
        setError(`Failed to render route map for ride ${ride._id}. Invalid route data.`);
      }
    },
    [leafletLoaded, placeNames]
  );

  const cleanupMap = useCallback((rideId: string) => {
    console.log("[RideDetails] Cleaning up map for ride", rideId);
    
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    
    if (routeLayers.current[rideId]) {
      routeLayers.current[rideId]?.remove();
      routeLayers.current[rideId] = null;
    }
    
    if (startMarkerRefs.current[rideId]) {
      startMarkerRefs.current[rideId]?.remove();
      startMarkerRefs.current[rideId] = null;
    }
    
    if (endMarkerRefs.current[rideId]) {
      endMarkerRefs.current[rideId]?.remove();
      endMarkerRefs.current[rideId] = null;
    }
    
    pickupMarkerRefs.current[rideId]?.forEach((marker) => marker?.remove());
    dropoffMarkerRefs.current[rideId]?.forEach((marker) => marker?.remove());
    
    if (vehicleMarkerRefs.current[rideId]) {
      vehicleMarkerRefs.current[rideId]?.remove();
      vehicleMarkerRefs.current[rideId] = null;
    }
    
    pickupMarkerRefs.current[rideId] = [];
    dropoffMarkerRefs.current[rideId] = [];
    
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    
    lastPositions.current[rideId] = null;
    setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));
    
    console.log("[RideDetails] Map cleaned up for ride", rideId);
  }, []);

  const toggleRideExpansion = (rideId: string) => {
    if (expandedRide === rideId) {
      cleanupMap(rideId);
      setExpandedRide(null);
    } else {
      setExpandedRide(rideId);
      
      // Initialize map when expanding
      setTimeout(() => {
        const ride = rides.find(r => r._id === rideId);
        const mapContainer = mapContainerRefs.current[rideId];
        
        if (ride && mapContainer && leafletLoaded) {
          console.log("[RideDetails] Initializing map for expanded ride", rideId);
          initializeMap(ride, mapContainer);
        }
      }, 100);
    }
  };

  const openEditModal = (ride: Ride) => {
    setSelectedRide(ride);
    setEditDate(ride.date !== "N/A" ? ride.date : new Date().toISOString().split("T")[0]);
    setEditTime(ride.time !== "N/A" ? ride.time : "");
    setModalError(null);
    setEditModalOpen(true);
  };

  const handleEditRide = async () => {
    if (!selectedRide || !user?.driverId) return;
    try {
      await clientApiService.ride.editRide(selectedRide.rideId!, user.driverId, {
        date: editDate || undefined,
        time: editTime || undefined,
      });
      setEditModalOpen(false);
      setSelectedRide(null);
      setModalError(null);
      await fetchRidesWithRetry();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to edit ride";
      console.error("[RideDetails] Error editing ride:", errorMessage, { error });
      setModalError(errorMessage);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (confirm("Are you sure you want to cancel this ride?")) {
      try {
        await clientApiService.ride.cancelRide(rideId);
        await fetchRidesWithRetry();
      } catch (error: any) {
        console.error("[RideDetails] Error cancelling ride:", error);
        setError(error.message || "Failed to cancel ride");
      }
    }
  };

  const startRide = async (rideId: string) => {
    let ride;
    try {
      ride = rides.find((r) => r._id === rideId);
      if (!ride || !ride.rideId) {
        throw new Error("Ride or rideId not found");
      }

      console.log("[RideDetails] Starting ride with rideId:", ride.rideId, "mongoId:", ride._id);
      const routeData = JSON.parse(ride.routeGeometry);
      const initialPosition = [routeData.coordinates[0][1], routeData.coordinates[0][0]] as [number, number];
      if (isNaN(initialPosition[0]) || isNaN(initialPosition[1])) {
        throw new Error("Invalid initial position coordinates");
      }
      console.log("[RideDetails] Intended initial position:", initialPosition);

      let trackingStatus = null;
      try {
        const trackingResponse = await clientApiService.tracking.getTrackingStatus(ride._id);
        trackingStatus = trackingResponse.data?.status;
        console.log("[RideDetails] Existing tracking status:", trackingStatus);
      } catch (statusError: any) {
        console.log("[RideDetails] Full status error object:", statusError);
        if (statusError.response?.status === 400 && statusError.response?.data?.message === "No tracking found for this ride") {
          console.log("[RideDetails] No existing tracking, initializing new tracking...");
        } else if (statusError.message === "Ride not found") {
          console.log("[RideDetails] Ride not found, creation may be required...");
          setError("Ride not found. Please create the ride first.");
          return;
        } else {
          throw new Error(`Unexpected error fetching tracking status: ${statusError.message || "Unknown error"}`);
        }
      }

      const driverId = ride.driverId;
      if (!driverId) {
        throw new Error("Driver ID not found for this ride");
      }

      if (trackingStatus === "Started") {
        console.log("[RideDetails] Tracking already started, resuming...");
        await fetchTrackingAndResume(ride._id);
        return;
      }

      if (trackingStatus === null) {
        console.log("[RideDetails] Initializing tracking with driverId:", driverId, "position:", initialPosition);
        const startTrackingResponse = await clientApiService.tracking.startTracking(ride._id, driverId, initialPosition);
        console.log("[RideDetails] Start tracking response:", startTrackingResponse.data);
        await clientApiService.tracking.updateTrackingPosition(ride._id, initialPosition);
      }

      await clientApiService.ride.updateRide(ride._id, { status: "Started" }, driverId);

      const updatedRide: Ride = { ...ride, currentPosition: initialPosition, status: "Started" };
      const updatedRides: Ride[] = rides.map((r) => (r._id === rideId ? updatedRide : r));
      setRides(updatedRides);

      setExpandedRide(rideId);

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded) {
        try {
          await initializeMap(updatedRide, mapContainer);
          if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId]) {
            vehicleMarkerRefs.current[rideId].setLatLng(initialPosition);
            mapRefs.current[rideId].panTo(initialPosition);
            mapRefs.current[rideId].invalidateSize();
            console.log("[RideDetails] Marker set to:", initialPosition);
          }
        } catch (mapError) {
          console.error("[RideDetails] Map initialization failed, continuing ride start:", mapError);
          setError(`Map initialization failed, but ride started.`);
        }
      } else {
        console.warn("[RideDetails] Map container or Leaflet not available, scheduling retry");
        setTimeout(() => {
          const retryContainer = mapContainerRefs.current[rideId];
          if (retryContainer && leafletLoaded) {
            initializeMap(updatedRide, retryContainer);
          }
        }, 100);
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId]) {
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        lastPositions.current[rideId] = initialPosition;
        startSimulation(rideId, coordinates, updatedRide.distanceKm, initialPosition);
      } else {
        console.warn("[RideDetails] Map or vehicle marker not initialized, simulation skipped");
      }
    } catch (error: any) {
      console.error("[RideDetails] Detailed error starting ride:", {
        rideId,
        rideIdString: ride?.rideId || "undefined",
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
      setError(`Failed to start ride: ${error.message}`);
      throw error;
    }
  };

  const fetchTrackingAndResume = async (rideId: string) => {
    console.log("[RideDetails] Fetching tracking to resume for ride", rideId);
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) throw new Error("Ride not found in state");

      if (ride.status === "Started") {
        console.log("[RideDetails] Ride already Started, skipping startTracking");
      } else {
        try {
          await clientApiService.ride.startTracking(ride.rideId!, ride.driverId);
        } catch (updateError: any) {
          console.warn("[RideDetails] Failed to start tracking, proceeding with local state:", updateError.message);
        }
      }

      const trackingPosition = await clientApiService.tracking.getTrackingPosition(rideId);
      console.log("[RideDetails] Tracking position fetched:", trackingPosition);

      let currentPosition: [number, number] | null = null;
      if (trackingPosition.success && Array.isArray(trackingPosition.data) && trackingPosition.data.length === 2) {
        currentPosition = [trackingPosition.data[0], trackingPosition.data[1]] as [number, number];
      } else {
        console.warn("[RideDetails] Invalid tracking position data format, using null");
      }

      const updatedRide: Ride = { ...ride, currentPosition, status: "Started" };
      const updatedRides: Ride[] = rides.map((r) => (r._id === rideId ? updatedRide : r));
      setRides(updatedRides);

      setExpandedRide(rideId);

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded && updatedRide.currentPosition) {
        try {
          await initializeMap(updatedRide, mapContainer);
          if (!vehicleMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
            vehicleMarkerRefs.current[rideId] = leafletLoaded!.marker(updatedRide.currentPosition, {
              icon: leafletLoaded!.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(mapRefs.current[rideId]!).bindPopup("Vehicle");
          }
          if (vehicleMarkerRefs.current[rideId]) {
            vehicleMarkerRefs.current[rideId].setLatLng(updatedRide.currentPosition);
            mapRefs.current[rideId].panTo(updatedRide.currentPosition);
            mapRefs.current[rideId].invalidateSize();
            console.log("[RideDetails] Marker set to:", updatedRide.currentPosition);
          }
        } catch (mapError) {
          console.error("[RideDetails] Map initialization failed during resume:", mapError);
          setError(`Map initialization failed during resume.`);
        }
      } else {
        console.warn("[RideDetails] Map container or Leaflet not available, or no current position, scheduling retry");
        setTimeout(() => {
          const retryContainer = mapContainerRefs.current[rideId];
          if (retryContainer && leafletLoaded && updatedRide.currentPosition) {
            initializeMap(updatedRide, retryContainer);
          }
        }, 100);
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId] && updatedRide.currentPosition) {
        const routeData = JSON.parse(updatedRide.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        lastPositions.current[rideId] = updatedRide.currentPosition;
        startSimulation(rideId, coordinates, updatedRide.distanceKm, updatedRide.currentPosition);
      } else {
        console.warn("[RideDetails] Map, vehicle marker, or current position not initialized, simulation skipped");
      }
    } catch (error: any) {
      console.error("[RideDetails] Error resuming tracking:", {
        rideId,
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
      setError(`Failed to resume tracking: ${error.message}`);
      throw error;
    }
  };

  const startSimulation = (rideId: string, coordinates: [number, number][], distanceKm: number, startPosition: [number, number]) => {
    if (animationIntervals.current[rideId] || !mapRefs.current[rideId] || !vehicleMarkerRefs.current[rideId]) {
      console.log("[RideDetails] Simulation aborted: Interval exists, map unavailable, or marker missing for", rideId);
      return;
    }

    if (coordinates.length < 2) {
      setError("Simulation failed: Insufficient route data");
      return;
    }

    const stepDuration = 1000;
    let currentIndex = findNearestIndex(coordinates, startPosition);
    if (currentIndex === -1) currentIndex = 0;
    let isUpdating = false;

    animationIntervals.current[rideId] = setInterval(async () => {
      if (isUpdating) {
        console.log("[RideDetails] Skipping update, previous update still in progress for", rideId);
        return;
      }

      try {
        isUpdating = true;
        const ride = rides.find((r) => r._id === rideId);
        if (!ride) {
          console.warn("[RideDetails] Ride not found, stopping simulation for", rideId);
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          return;
        }

        const shouldPause = ride.pickupPoints.some((pickup) => {
          const [pickupLat, pickupLng] = pickup.location.split(",").map(Number);
          const pickupCoord: [number, number] = [pickupLat, pickupLng];
          const distance = calculateHaversineDistance(coordinates[currentIndex], pickupCoord);
          console.log("[RideDetails] Checking pause for pickup:", {
            rideId,
            passengerId: pickup.passengerId,
            distance: distance * 1000,
            pickupAction: pickupActions[ride._id]?.[pickup.passengerId],
          });
          return !isNaN(pickupLat) && !isNaN(pickupLng) && distance < 0.1 && !(pickupActions[ride._id]?.[pickup.passengerId] || false);
        }) || ride.dropoffPoints.some((dropoff) => {
          const [dropoffLat, dropoffLng] = dropoff.location.split(",").map(Number);
          const dropoffCoord: [number, number] = [dropoffLat, dropoffLng];
          const distance = calculateHaversineDistance(coordinates[currentIndex], dropoffCoord);
          console.log("[RideDetails] Checking pause for dropoff:", {
            rideId,
            passengerId: dropoff.passengerId,
            distance: distance * 1000,
            pickupAction: pickupActions[ride._id]?.[dropoff.passengerId],
            dropoffAction: dropoffActions[ride._id]?.[dropoff.passengerId],
          });
          return !isNaN(dropoffLat) && !isNaN(dropoffLng) && distance < 0.1 && (pickupActions[ride._id]?.[dropoff.passengerId] || false) && !(dropoffActions[ride._id]?.[dropoff.passengerId] || false);
        });

        setSimulationPaused((prev) => ({ ...prev, [rideId]: shouldPause }));

        if (shouldPause) {
          console.log("[RideDetails] Simulation paused for", rideId);
          const newPausedPassengerIds = [...(pausedPassengerIds[rideId] || [])];
          ride.pickupPoints.forEach((pickup) => {
            const [pickupLat, pickupLng] = pickup.location.split(",").map(Number);
            const pickupCoord: [number, number] = [pickupLat, pickupLng];
            const distance = calculateHaversineDistance(coordinates[currentIndex], pickupCoord);
            const shouldAddToPaused = !isNaN(pickupLat) && !isNaN(pickupLng) && distance < 0.1 && !(pickupActions[ride._id]?.[pickup.passengerId] || false) && !newPausedPassengerIds.includes(pickup.passengerId);
            console.log("[RideDetails] Checking pickup pause for passenger:", {
              rideId,
              passengerId: pickup.passengerId,
              pickupCoord,
              currentPosition: coordinates[currentIndex],
              distance: distance * 1000,
              pickupAction: pickupActions[ride._id]?.[pickup.passengerId],
              alreadyPaused: newPausedPassengerIds.includes(pickup.passengerId),
              shouldAddToPaused,
            });
            if (shouldAddToPaused) {
              newPausedPassengerIds.push(pickup.passengerId);
              console.log("[RideDetails] Added passenger to pausedPassengerIds:", pickup.passengerId);
            }
          });
          ride.dropoffPoints.forEach((dropoff) => {
            const [dropoffLat, dropoffLng] = dropoff.location.split(",").map(Number);
            const dropoffCoord: [number, number] = [dropoffLat, dropoffLng];
            const distance = calculateHaversineDistance(coordinates[currentIndex], dropoffCoord);
            const shouldAddToPaused = !isNaN(dropoffLat) && !isNaN(dropoffLng) && distance < 0.1 && (pickupActions[ride._id]?.[dropoff.passengerId] || false) && !(dropoffActions[ride._id]?.[dropoff.passengerId] || false) && !newPausedPassengerIds.includes(dropoff.passengerId);
            console.log("[RideDetails] Checking dropoff pause for passenger:", {
              rideId,
              passengerId: dropoff.passengerId,
              dropoffCoord,
              currentPosition: coordinates[currentIndex],
              distance: distance * 1000,
              pickupAction: pickupActions[ride._id]?.[dropoff.passengerId],
              dropoffAction: dropoffActions[ride._id]?.[dropoff.passengerId],
              shouldAddToPaused,
            });
            if (shouldAddToPaused) {
              newPausedPassengerIds.push(dropoff.passengerId);
              console.log("[RideDetails] Added passenger to pausedPassengerIds for dropoff:", dropoff.passengerId);
            }
          });
          console.log("[RideDetails] Before updating pausedPassengerIds:", {
            rideId,
            currentPaused: pausedPassengerIds[rideId],
            newPausedPassengerIds,
          });
          if (newPausedPassengerIds.length > 0) {
            setPausedPassengerIds((prev) => {
              console.log("[RideDetails] Setting pausedPassengerIds:", { ...prev, [rideId]: newPausedPassengerIds });
              return { ...prev, [rideId]: newPausedPassengerIds };
            });
          }
          isUpdating = false;
          return;
        }

        currentIndex++;
        if (currentIndex >= coordinates.length) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          
          try {
            await clientApiService.tracking.stopTracking(ride._id);
          } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.message === 'Ride not found') {
              console.log('[RideDetails] Ride already removed from tracking');
            } else {
              throw error;
            }
          }

          const updatedRides = rides.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r));
          setRides(updatedRides);
          
          try {
            await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
          } catch (error: any) {
            console.error('[RideDetails] Error updating ride status:', error);
          }
          
          cleanupMap(rideId);
          console.log("[RideDetails] Simulation completed for", rideId);
          isUpdating = false;
          return;
        }

        const currentPosition = coordinates[currentIndex];
        vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
        lastPositions.current[rideId] = currentPosition;
        mapRefs.current[rideId]!.panTo(currentPosition);
        await clientApiService.tracking.updateTrackingPosition(ride._id, currentPosition);
      } catch (error: any) {
        console.error("[RideDetails] Simulation error for", rideId, ":", error);
        if (error.message.includes("Write conflict")) {
          setError(`Temporary issue updating ride position. Please try resuming the ride.`);
        } else {
          setError(`Simulation error for ride ${rideId}.`);
        }
        clearInterval(animationIntervals.current[rideId]!);
        animationIntervals.current[rideId] = null;
      } finally {
        isUpdating = false;
      }
    }, stepDuration);
  };

  const findNearestIndex = (coordinates: [number, number][], target: [number, number]): number => {
    let nearestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < coordinates.length; i++) {
      const [lat, lng] = coordinates[i];
      const distance = calculateHaversineDistance([lat, lng], target);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  };

  const handlePickup = async (rideId: string, passengerId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !user || !user.driverId || !lastPositions.current[rideId]) throw new Error("Invalid ride or position data");

      const pickupPoint = ride.pickupPoints.find((p) => p.passengerId === passengerId);
      if (!pickupPoint) throw new Error("Pickup point not found");

      const [pickupLat, pickupLng] = pickupPoint.location.split(",").map(Number);
      const pickupCoord: [number, number] = [pickupLat, pickupLng];
      if (isNaN(pickupLat) || isNaN(pickupLng)) throw new Error("Invalid pickup coordinates");

      const frontendPosition = lastPositions.current[rideId]!;
      const distance = calculateHaversineDistance(frontendPosition, pickupCoord);
      console.log("[RideDetails] Pickup attempt:", { rideId, passengerId, frontendPosition, pickupCoord, distance: distance * 1000 });

      const PICKUP_THRESHOLD = 0.1;
      if (distance > PICKUP_THRESHOLD) throw new Error(`Vehicle is ${(distance * 1000).toFixed(0)}m away from pickup point`);

      await clientApiService.tracking.updateTrackingPosition(ride._id, frontendPosition);
      const trackingResponse = await clientApiService.tracking.getTrackingPosition(ride._id);
      const backendPosition = trackingResponse.data as [number, number] | null;
      if (!backendPosition) throw new Error("Failed to retrieve backend position");

      const backendDistance = calculateHaversineDistance(backendPosition, pickupCoord);
      if (backendDistance > PICKUP_THRESHOLD) throw new Error(`Backend position is ${(backendDistance * 1000).toFixed(0)}m away from pickup point`);

      await clientApiService.ride.updateRide(ride._id, { passengerId, action: "picked", currentPosition: backendPosition }, user.driverId);
      setPickupActions((prev) => ({ ...prev, [rideId]: { ...prev[rideId], [passengerId]: true } }));
      setPausedPassengerIds((prev) => ({ ...prev, [rideId]: prev[rideId]?.filter((id) => id !== passengerId) || [] }));
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));

      const updatedRide = { ...ride, currentPosition: backendPosition };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));

      if (expandedRide === rideId) {
        setExpandedRide(null);
        cleanupMap(rideId);
      }

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded) {
        if (!mapRefs.current[rideId]) {
          console.log("[RideDetails] Reinitializing map after pickup for", rideId);
          await initializeMap(updatedRide, mapContainer);
        } else if (vehicleMarkerRefs.current[rideId]) {
          console.log("[RideDetails] Updating marker position after pickup for", rideId);
          vehicleMarkerRefs.current[rideId].setLatLng(backendPosition);
          mapRefs.current[rideId].panTo(backendPosition);
          mapRefs.current[rideId].invalidateSize();
        }
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId]) {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const currentIndex = findNearestIndex(coordinates, backendPosition);
        lastPositions.current[rideId] = backendPosition;
        if (animationIntervals.current[rideId]) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
        }
        startSimulation(rideId, coordinates.slice(currentIndex), ride.distanceKm, backendPosition);
        console.log("[RideDetails] Simulation restarted after pickup for", rideId);
      }
    } catch (error) {
      console.error("[RideDetails] Pickup error:", error);
      setError(`Pickup failed: ${error.message}`);
    }
  };

  const handleDropoff = async (rideId: string, passengerId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !user || !user.driverId || !lastPositions.current[rideId]) throw new Error("Invalid ride or position data");

      const dropoffPoint = ride.dropoffPoints.find((p) => p.passengerId === passengerId);
      if (!dropoffPoint) throw new Error("Drop-off point not found");

      const [dropoffLat, dropoffLng] = dropoffPoint.location.split(",").map(Number);
      const dropoffCoord: [number, number] = [dropoffLat, dropoffLng];
      if (isNaN(dropoffLat) || isNaN(dropoffLng)) throw new Error("Invalid drop-off coordinates");

      const frontendPosition = lastPositions.current[rideId]!;
      const distance = calculateHaversineDistance(frontendPosition, dropoffCoord);
      console.log("[RideDetails] Dropoff attempt:", { rideId, passengerId, frontendPosition, dropoffCoord, distance: distance * 1000 });

      const DROPOFF_THRESHOLD = 0.1;
      if (distance > DROPOFF_THRESHOLD) throw new Error(`Vehicle is ${(distance * 1000).toFixed(0)}m away from drop-off point`);

      await clientApiService.tracking.updateTrackingPosition(ride._id, frontendPosition);
      const trackingResponse = await clientApiService.tracking.getTrackingPosition(ride._id);
      const backendPosition = trackingResponse.data as [number, number] | null;
      if (!backendPosition) throw new Error("Failed to retrieve backend position");

      const backendDistance = calculateHaversineDistance(backendPosition, dropoffCoord);
      if (backendDistance > DROPOFF_THRESHOLD) throw new Error(`Backend position is ${(backendDistance * 1000).toFixed(0)}m away from drop-off point`);

      await clientApiService.ride.updateRide(ride._id, { passengerId, action: "dropped", currentPosition: backendPosition }, user.driverId);
      setDropoffActions((prev) => ({ ...prev, [rideId]: { ...prev[rideId], [passengerId]: true } }));
      setPausedPassengerIds((prev) => ({ ...prev, [rideId]: prev[rideId]?.filter((id) => id !== passengerId) || [] }));
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));

      const updatedRide = { ...ride, currentPosition: backendPosition };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));

      if (expandedRide === rideId) {
        setExpandedRide(null);
        cleanupMap(rideId);
      }

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded) {
        if (!mapRefs.current[rideId]) {
          console.log("[RideDetails] Reinitializing map after dropoff for", rideId);
          await initializeMap(updatedRide, mapContainer);
        } else if (vehicleMarkerRefs.current[rideId]) {
          console.log("[RideDetails] Updating marker position after dropoff for", rideId);
          vehicleMarkerRefs.current[rideId].setLatLng(backendPosition);
          mapRefs.current[rideId].panTo(backendPosition);
          mapRefs.current[rideId].invalidateSize();
        }
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId]) {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const currentIndex = findNearestIndex(coordinates, backendPosition);
        lastPositions.current[rideId] = backendPosition;
        if (animationIntervals.current[rideId]) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
        }
        startSimulation(rideId, coordinates.slice(currentIndex), ride.distanceKm, backendPosition);
        console.log("[RideDetails] Simulation restarted after dropoff for", rideId);
      }
    } catch (error) {
      console.error("[RideDetails] Dropoff error:", error);
      setError(`Dropoff failed: ${error.message}`);
    }
  };

  const stopRide = async (rideId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !ride.rideId) throw new Error("Ride or rideId not found");

      try {
        await clientApiService.tracking.stopTracking(ride._id);
      } catch (error: any) {
        if (error.response?.status === 400 && error.response?.data?.message === 'Ride not found') {
          console.log('[RideDetails] Ride already removed from tracking');
        } else {
          throw error;
        }
      }

      if (animationIntervals.current[rideId]) {
        clearInterval(animationIntervals.current[rideId]!);
        animationIntervals.current[rideId] = null;
      }
      
      const updatedRides = rides.map((r) =>
        r._id === rideId ? { ...r, status: "Completed" as const } : r
      );
      setRides(updatedRides);
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));
      
      try {
        await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
      } catch (error: any) {
        console.error('[RideDetails] Error updating ride status:', error);
      }
    } catch (error: any) {
      console.error("[RideDetails] Error stopping ride:", error.message);
      setError(`Failed to stop ride: ${error.message}`);
    }
  };

  const resumeSimulation = async (rideId: string) => {
    try {
      console.log("[RideDetails] Resuming simulation for ride", rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !ride.rideId) throw new Error("Ride or rideId not found");

      const trackingResponse = await clientApiService.tracking.getTrackingPosition(ride._id);
      if (!trackingResponse.data || !Array.isArray(trackingResponse.data) || trackingResponse.data.length !== 2) {
        throw new Error("No current position found");
      }
      const currentPosition = trackingResponse.data as [number, number];

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded) {
        if (!mapRefs.current[rideId]) {
          console.log("[RideDetails] Initializing map for resume", rideId);
          await initializeMap(ride, mapContainer);
        }
        if (!vehicleMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId] = leafletLoaded!.marker(currentPosition, {
            icon: leafletLoaded!.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(mapRefs.current[rideId]!).bindPopup("Vehicle");
        }
      } else {
        throw new Error("Map container or Leaflet not available");
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId]) {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const startIndex = findNearestIndex(coordinates, currentPosition);
        lastPositions.current[rideId] = currentPosition;
        vehicleMarkerRefs.current[rideId].setLatLng(currentPosition);
        mapRefs.current[rideId].panTo(currentPosition);
        setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));
        startSimulation(rideId, coordinates.slice(startIndex), ride.distanceKm, currentPosition);
        console.log("[RideDetails] Simulation resumed manually for", rideId);
      } else {
        throw new Error("Map or vehicle marker not initialized");
      }
    } catch (error: any) {
      console.error("[RideDetails] Error resuming simulation:", error.message);
      setError(`Failed to resume simulation: ${error.message}`);
    }
  };

  const handleEmergencyStop = async (ride: Ride) => {
    setSelectedRideForStop(ride);
    setEmergencyStopModalOpen(true);
  };

  const confirmEmergencyStop = async () => {
    if (!selectedRideForStop || !stopReason.trim() || !lastPositions.current[selectedRideForStop._id]) {
      setError("Please provide a reason for stopping the ride");
      return;
    }

    try {
      setIsStopping(true);
      const currentPosition = lastPositions.current[selectedRideForStop._id]!;
      
      await clientApiService.ride.emergencyStopRide(selectedRideForStop._id, {
        reason: stopReason,
        currentPosition
      });

      // Stop simulation if running
      if (animationIntervals.current[selectedRideForStop._id]) {
        clearInterval(animationIntervals.current[selectedRideForStop._id]!);
        animationIntervals.current[selectedRideForStop._id] = null;
      }

      // Update ride status locally
      setRides(rides.map(ride => 
        ride._id === selectedRideForStop._id 
          ? { ...ride, status: "EmergencyStopped" }
          : ride
      ));

      // Clean up map
      cleanupMap(selectedRideForStop._id);

      // Show success message
      Swal.fire({
        title: 'Ride Emergency Stopped',
        text: 'The ride has been stopped and refunds are being processed for passengers.',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      setEmergencyStopModalOpen(false);
      setStopReason("");
      setSelectedRideForStop(null);
    } catch (error: any) {
      console.error("Emergency stop failed:", error);
      setError(`Failed to emergency stop ride: ${error.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  const handleJoinRequest = async (rideId: string, passengerId: string, action: "accept" | "reject") => {
    try {
      console.log("[RideDetails] === HANDLE JOIN REQUEST DEBUG ===");
      console.log("[RideDetails] Received rideId:", rideId);
      console.log("[RideDetails] Received passengerId:", passengerId);
      console.log("[RideDetails] Received action:", action);
      console.log("[RideDetails] Current user driverId:", user?.driverId);
      console.log("[RideDetails] All rides:", rides.map(r => ({ 
        _id: r._id, 
        rideId: r.rideId,
        driverId: r.driverId 
      })));
      
      // Find the ride by _id
      const ride = rides.find(r => r._id === rideId);
      
      if (!ride) {
        console.error("[RideDetails] ❌ Ride not found for _id:", rideId);
        console.error("[RideDetails] Available _ids:", rides.map(r => r._id));
        setError(`Ride not found. Please try refreshing the page.`);
        return;
      }

      console.log("[RideDetails] ✅ Found ride:", ride._id);
      console.log("[RideDetails] Ride driverId:", ride.driverId);
      console.log("[RideDetails] Current user driverId:", user?.driverId);

      // Verify the current user is the driver of this ride
      if (user?.driverId !== ride.driverId) {
        console.error("[RideDetails] ❌ Unauthorized: User is not the driver of this ride");
        setError("You are not authorized to manage this ride");
        return;
      }

      console.log("[RideDetails] Making API call with:", {
        rideId: ride._id,
        driverId: user.driverId,
        passengerId,
        action
      });

      await clientApiService.ride.handleJoinRequest(ride._id, user.driverId, passengerId, action);
      console.log("[RideDetails] ✅ Join request handled successfully");
      
      // Trigger notification for the passenger
      try {
        const request = ride.pendingRequests?.find(req => req.passengerId === passengerId);
        const passengerName = request?.passengerName || "Passenger";
        
        if (action === "accept") {
          console.log("[RideDetails] Triggering accepted notification for passenger:", passengerId);
          await clientApiService.notification.triggerRideJoinAcceptedNotification(
            ride._id, 
            passengerId, 
            passengerName
          );
        } else {
          console.log("[RideDetails] Triggering rejected notification for passenger:", passengerId);
          await clientApiService.notification.triggerRideJoinRejectedNotification(
            ride._id, 
            passengerId, 
            passengerId,
            passengerName
          );
        }
      } catch (notifError) {
        console.warn("[RideDetails] Notification trigger failed:", notifError);
        // Continue even if notification fails
      }
      
      await fetchRidesWithRetry();
    } catch (error: any) {
      console.error("[RideDetails] ❌ Error handling join request:", error);
      console.error("[RideDetails] Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      setError(`Failed to ${action} join request: ${errorMessage}`);
    }
  };

  useEffect(() => {
    if (!leafletLoaded) return;

    const initializeStartedRides = async () => {
      for (const ride of rides) {
        if (ride.status === "Started" && !mapRefs.current[ride._id] && mapContainerRefs.current[ride._id]) {
          console.log("[RideDetails] Initializing map for started ride", ride._id);
          await initializeMap(ride, mapContainerRefs.current[ride._id]!);
          await fetchTrackingAndResume(ride._id);
        } else if (ride.status === "Started" && mapRefs.current[ride._id] && !vehicleMarkerRefs.current[ride._id]) {
          console.log("[RideDetails] Re-adding vehicle marker for started ride", ride._id);
          const trackingResponse = await clientApiService.tracking.getTrackingPosition(ride._id);
          const currentPosition = trackingResponse.data as [number, number] | null;
          if (currentPosition) {
            vehicleMarkerRefs.current[ride._id] = leafletLoaded.marker(currentPosition, {
              icon: leafletLoaded.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(mapRefs.current[ride._id]!).bindPopup("Vehicle");
            lastPositions.current[ride._id] = currentPosition;
            mapRefs.current[ride._id].panTo(currentPosition);
          }
        }
      }
    };

    initializeStartedRides();

    const currentRideId = expandedRide;
    if (currentRideId) {
      const ride = rides.find((r) => r._id === currentRideId);
      if (ride && mapContainerRefs.current[currentRideId] && !mapRefs.current[currentRideId]) {
        console.log("[RideDetails] Initializing map for expanded ride", currentRideId);
        initializeMap(ride, mapContainerRefs.current[currentRideId]!);
      }
    } else {
      Object.keys(mapRefs.current).forEach((rideId) => {
        if (mapRefs.current[rideId] && rideId !== expandedRide) cleanupMap(rideId);
      });
    }
  }, [expandedRide, rides, leafletLoaded, initializeMap, cleanupMap]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium";
    
    switch (status) {
      case "Pending":
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-200`}>
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>;
      case "Started":
        return <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}>
          <Navigation className="h-3 w-3" />
          In Progress
        </Badge>;
      case "Completed":
        return <Badge className={`${baseClasses} bg-gray-100 text-gray-800 border-gray-200`}>
          Completed
        </Badge>;
      case "EmergencyStopped":
        return <Badge className={`${baseClasses} bg-orange-100 text-orange-800 border-orange-200`}>
          <AlertTriangle className="h-3 w-3" />
          Emergency Stop
        </Badge>;
      case "Cancelled":
        return <Badge className={`${baseClasses} bg-red-100 text-red-800 border-red-200`}>
          <X className="h-3 w-3" />
          Cancelled
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isRideTimeReached = (ride: Ride) => {
    if (!ride.date || ride.date === "N/A" || !ride.time || ride.time === "N/A") return false;
    const rideStartTime = new Date(`${ride.date}T${ride.time}:00`).getTime();
    const now = new Date().getTime();
    return now >= rideStartTime && ride.status === "Pending";
  };

  return (
    <MainLayout activeItem="Rides">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Rides
          </h1>
          <p className="text-gray-600 text-lg">Manage and track your ride schedules</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Controls */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => fetchRidesWithRetry()} 
            variant="outline" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/user/ride" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Create New Ride
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : rides.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                <Car className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Rides Found</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {error ? "There was an error loading your rides. Please try refreshing." : "You haven't created any rides yet. Start by creating your first ride!"}
              </p>
              {!error && (
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/user/ride" className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Create Your First Ride
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {rides.map((ride) => {
              const seatsLeft = ride.passengerCount - ride.passengers.length;
              const place = placeNames[ride._id] || { startPlace: ride.startPoint, endPlace: ride.endPoint };
              const isExpanded = expandedRide === ride._id;
              const hasPendingRequests = ride.pendingRequests?.some(req => req.status === "pending");

              return (
                <Card key={ride._id} className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-blue-50">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                            <Car className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold text-gray-900">
                              {place.startPlace} → {place.endPlace}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-4 w-4" />
                                {ride.date !== "N/A" ? new Date(ride.date).toLocaleDateString("en-GB") : "N/A"}
                              </div>
                              {ride.time && ride.time !== "N/A" && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-4 w-4" />
                                  {ride.time}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(ride.status)}
                          <Badge variant="outline" className="bg-white border-gray-300">
                            <Users className="h-3 w-3 mr-1" />
                            {ride.passengers.length}/{ride.passengerCount} passengers
                          </Badge>
                          <Badge variant="outline" className="bg-white border-gray-300">
                            <MapPin className="h-3 w-3 mr-1" />
                            {(ride.distanceKm ?? 0).toFixed(1)} km
                          </Badge>
                          <Badge variant="outline" className="bg-white border-gray-300">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ₹{(ride.costPerPerson ?? 0).toFixed(2)}/person
                          </Badge>
                          {hasPendingRequests && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Pending Requests
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {ride.status === "Pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(ride)}
                              disabled={isRideTimeReached(ride)}
                              className="flex items-center gap-2"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRide(ride.rideId!)}
                              disabled={isRideTimeReached(ride)}
                              className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {ride.status === "Pending" && isRideTimeReached(ride) && (
                          <Button
                            onClick={() => startRide(ride._id)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Play className="h-4 w-4" />
                            Start Ride
                          </Button>
                        )}
                        {ride.status === "Started" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resumeSimulation(ride._id)}
                              disabled={!mapRefs.current[ride._id] || !simulationPaused[ride._id]}
                              className="flex items-center gap-2"
                            >
                              <Navigation className="h-4 w-4" />
                              Resume
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEmergencyStop(ride)}
                              disabled={isStopping}
                              className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Emergency Stop
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => stopRide(ride._id)}
                              className="flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <Square className="h-4 w-4" />
                              Complete
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant={isExpanded ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => toggleRideExpansion(ride._id)}
                          className="flex items-center gap-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-6">
                      <Separator className="mb-6" />
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Ride Information */}
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Car className="h-5 w-5 text-blue-600" />
                              Ride Information
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Vehicle</p>
                                  <p className="text-gray-900">{ride.vehicleId}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Distance</p>
                                  <p className="text-gray-900 flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                    {(ride.distanceKm ?? 0).toFixed(2)} km
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Fuel Cost</p>
                                  <p className="text-gray-900 flex items-center gap-1">
                                    <Fuel className="h-4 w-4 text-orange-500" />
                                    ₹{(ride.totalFuelCost ?? 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Passenger Capacity</p>
                                  <p className="text-gray-900 flex items-center gap-1">
                                    <Users className="h-4 w-4 text-green-500" />
                                    {ride.passengerCount} seats
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Seats Available</p>
                                  <p className="text-gray-900">{seatsLeft}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Cost per Person</p>
                                  <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    ₹{(ride.costPerPerson ?? 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for Started Rides */}
                          {ride.status === "Started" && mapRefs.current[ride._id] && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Navigation className="h-5 w-5 text-green-600" />
                                Passenger Actions
                              </h4>
                              <div className="space-y-2">
                                {ride.passengers.map((passenger, index) => {
                                  const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                                  const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                                  const isPausedForPickup = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && !pickupActions[ride._id]?.[passenger.passengerId];
                                  const isPausedForDropoff = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && pickupActions[ride._id]?.[passenger.passengerId] && !dropoffActions[ride._id]?.[passenger.passengerId];

                                  return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div>
                                        <p className="font-medium text-gray-900">{passenger.passengerName}</p>
                                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                          <span>Pickup: {pickupActions[ride._id]?.[passenger.passengerId] ? "✓" : "Pending"}</span>
                                          <span>Dropoff: {dropoffActions[ride._id]?.[passenger.passengerId] ? "✓" : "Pending"}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        {isPausedForPickup && pickup && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handlePickup(ride._id, passenger.passengerId)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            Pick Up
                                          </Button>
                                        )}
                                        {isPausedForDropoff && dropoff && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleDropoff(ride._id, passenger.passengerId)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            Drop Off
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Map */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-red-600" />
                            Route Map
                          </h4>
                          <div
                            ref={(el) => { 
                              mapContainerRefs.current[ride._id] = el;
                              // Initialize map when container is available and ride is expanded
                              if (el && isExpanded && leafletLoaded && ride) {
                                setTimeout(() => {
                                  initializeMap(ride, el);
                                }, 100);
                              }
                            }}
                            className="h-80 w-full rounded-lg border border-gray-200 bg-gray-100"
                          />
                          {!leafletLoaded && (
                            <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-gray-600">Loading map...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Passengers and Pending Requests */}
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          Passengers & Requests
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Confirmed Passengers */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3">Confirmed Passengers</h5>
                            {ride.passengers.length > 0 ? (
                              <div className="space-y-3">
                                {ride.passengers.map((passenger, index) => {
                                  const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                                  const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                                  
                                  return (
                                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-gray-900">{passenger.passengerName}</p>
                                          <div className="text-sm text-gray-600 mt-1">
                                            <p>Pickup: {pickup?.placeName || "N/A"}</p>
                                            <p>Dropoff: {dropoff?.placeName || "N/A"}</p>
                                          </div>
                                        </div>
                                        <div className="text-right text-sm">
                                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                                            pickupActions[ride._id]?.[passenger.passengerId] 
                                              ? "bg-green-100 text-green-800" 
                                              : "bg-yellow-100 text-yellow-800"
                                          }`}>
                                            {pickupActions[ride._id]?.[passenger.passengerId] ? "✓ Picked" : "Awaiting Pickup"}
                                          </div>
                                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full mt-1 ${
                                            dropoffActions[ride._id]?.[passenger.passengerId] 
                                              ? "bg-green-100 text-green-800" 
                                              : "bg-gray-100 text-gray-800"
                                          }`}>
                                            {dropoffActions[ride._id]?.[passenger.passengerId] ? "✓ Dropped" : "In Transit"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No confirmed passengers yet.</p>
                            )}
                          </div>

                          {/* Pending Requests */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3">Pending Join Requests</h5>
                            {ride.pendingRequests?.filter(req => req.status === "pending").length > 0 ? (
                              <div className="space-y-3">
                                {ride.pendingRequests
                                  .filter((request) => request.status === "pending")
                                  .map((request, index) => (
                                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-gray-900">{request.passengerName}</p>
                                          <div className="text-sm text-gray-600 mt-1">
                                            <p>From: {request.pickupLocation}</p>
                                            <p>To: {request.dropoffLocation}</p>
                                          </div>
                                        </div>
                                        {user?.driverId === ride.driverId && (
                                          <div className="flex gap-2">
                                            <Button
                                              variant="default"
                                              size="sm"
                                              onClick={() => handleJoinRequest(ride._id, request.passengerId, "accept")}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <UserCheck className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleJoinRequest(ride._id, request.passengerId, "reject")}
                                              className="border-red-300 text-red-600 hover:bg-red-50"
                                            >
                                              <UserX className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No pending requests.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Ride Modal */}
      <Dialog open={editModalOpen} onOpenChange={(open) => {
        setEditModalOpen(open);
        if (!open) setModalError(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              Edit Ride Schedule
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {modalError && (
              <Alert variant="destructive">
                <AlertDescription>{modalError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">
                Ride Date
              </Label>
              <Input
                id="date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium">
                Ride Time
              </Label>
              <Input
                id="time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRide} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Stop Modal */}
      <Dialog open={emergencyStopModalOpen} onOpenChange={setEmergencyStopModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency Stop Ride
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                <strong>Warning:</strong> This will stop the ride immediately and process partial refunds to passengers. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Label htmlFor="stopReason" className="text-sm font-medium">
                Reason for Emergency Stop
              </Label>
              <Select value={stopReason} onValueChange={setStopReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vehicle breakdown">Vehicle breakdown</SelectItem>
                  <SelectItem value="Tire puncture">Tire puncture</SelectItem>
                  <SelectItem value="Accident">Accident</SelectItem>
                  <SelectItem value="Medical emergency">Medical emergency</SelectItem>
                  <SelectItem value="Weather conditions">Weather conditions</SelectItem>
                  <SelectItem value="Road blockage">Road blockage</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {stopReason === "Other" && (
                <Input
                  placeholder="Please specify the reason..."
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                />
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Refund Policy</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Less than 25% traveled: 80% refund</li>
                <li>• 25-50% traveled: 60% refund</li>
                <li>• 50-75% traveled: 40% refund</li>
                <li>• More than 75% traveled: 20% refund</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmergencyStopModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmEmergencyStop}
              disabled={!stopReason.trim() || isStopping}
              className="bg-red-600 hover:bg-red-700"
            >
              {isStopping ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                "Confirm Emergency Stop"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}