"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as L from "leaflet";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "../../comp/MainLayout";
import "leaflet/dist/leaflet.css";

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
  status: "Pending" | "Started" | "Completed" | "Cancelled";
  routeGeometry: string;
  currentPosition?: [number, number] | null;
  pendingRequests?: { passengerId: string; passengerName: string; pickupLocation: string; dropoffLocation: string; status: string }[];
}

interface UpdateRideParams {
  passengerId: string;
  action: "picked" | "dropped";
  currentPosition?: [number, number];
}

interface PlaceName {
  startPlace: string;
  endPlace: string;
}

interface TrackingPosition {
  data: [number, number] | null;
}

export default function RideDetails() {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
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
    fetchRides();
  }, []);

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
          headers: { 'User-Agent': 'RideEzy/1.0 (contact@rideezy.com)' }, // Unique User-Agent
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
    return `${lat},${lon}`; // Fallback to coordinates
  };

  const fetchRides = async () => {
    setIsLoading(true);
    try {
      const ridesData = await apiService.ride.getRides();
      if (!Array.isArray(ridesData.data)) {
        setError("Invalid rides data format");
        return;
      }
      const mappedRides: Ride[] = ridesData.data.map((ride: any) => ({
        _id: ride._id.toString(),
        rideId: ride.rideId || "N/A",
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
      setRides(mappedRides);
      console.log("[RideDetails] Mapped rides:", mappedRides);

      const placePromises = mappedRides.map(async (ride: Ride) => {
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
          setError("Failed to load place names for some rides. Using coordinates instead.");
        }
        return { rideId: ride._id, startPlace, endPlace };
      });

      const placeResults = await Promise.all(placePromises);
      const newPlaceNames = placeResults.reduce((acc, { rideId, startPlace, endPlace }) => {
        acc[rideId] = { startPlace, endPlace };
        return acc;
      }, {} as { [key: string]: PlaceName });
      setPlaceNames(newPlaceNames);

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
      console.error("[RideDetails] Error fetching rides:", error.message || error);
      setError("Failed to fetch rides. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = useCallback(
    async (ride: Ride, mapContainer: HTMLDivElement) => {
      if (!mapContainer || mapRefs.current[ride._id] || !leafletLoaded) {
        console.log("[RideDetails] Map initialization skipped or already exists for", ride._id);
        return;
      }

      console.log("[RideDetails] Initializing map for ride", ride._id);
      const map = leafletLoaded.map(mapContainer, { zoomControl: true }).setView([0, 0], 8);
      if (!map) {
        console.error("[RideDetails] Failed to create Leaflet map for", ride._id);
        return;
      }
      leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      mapRefs.current[ride._id] = map;

      mapContainer.style.height = "400px";
      mapContainer.style.width = "100%";
      mapContainer.style.position = "relative";
      mapContainer.style.visibility = "visible";
      mapContainer.style.overflow = "hidden";

      try {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        const initialPosition = ride.currentPosition || coordinates[0];

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

        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { color: "#3b9ddd", weight: 5 }).addTo(map);

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

        map.invalidateSize();
        map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [50, 50] });
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
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    if (routeLayers.current[rideId]) routeLayers.current[rideId]?.remove();
    if (startMarkerRefs.current[rideId]) startMarkerRefs.current[rideId]?.remove();
    if (endMarkerRefs.current[rideId]) endMarkerRefs.current[rideId]?.remove();
    pickupMarkerRefs.current[rideId]?.forEach((marker) => marker?.remove());
    dropoffMarkerRefs.current[rideId]?.forEach((marker) => marker?.remove());
    if (vehicleMarkerRefs.current[rideId]) vehicleMarkerRefs.current[rideId]?.remove();
    vehicleMarkerRefs.current[rideId] = null;
    routeLayers.current[rideId] = null;
    startMarkerRefs.current[rideId] = null;
    endMarkerRefs.current[rideId] = null;
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

  const toggleCollapsible = (rideId: string) => {
    if (openCollapsible === rideId) {
      cleanupMap(rideId);
      setOpenCollapsible(null);
    } else {
      setOpenCollapsible(rideId);
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
      await apiService.ride.editRide(selectedRide.rideId!, user.driverId, {
        date: editDate || undefined,
        time: editTime || undefined,
      });
      setEditModalOpen(false);
      setSelectedRide(null);
      setModalError(null);
      await fetchRides();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to edit ride";
      console.error("[RideDetails] Error editing ride:", errorMessage, { error });
      setModalError(errorMessage);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (confirm("Are you sure you want to cancel this ride?")) {
      try {
        await apiService.ride.cancelRide(rideId);
        await fetchRides();
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
        const trackingResponse = await apiService.tracking.getTrackingStatus(ride._id);
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
        const startTrackingResponse = await apiService.tracking.startTracking(ride._id, driverId, initialPosition);
        console.log("[RideDetails] Start tracking response:", startTrackingResponse.data);
        await apiService.tracking.updateTrackingPosition(ride._id, initialPosition);
      }

      await apiService.ride.updateRide(ride._id, { status: "Started" }, driverId);

      const updatedRide: Ride = { ...ride, currentPosition: initialPosition, status: "Started" };
      const updatedRides: Ride[] = rides.map((r) => (r._id === rideId ? updatedRide : r));
      setRides(updatedRides);

      setOpenCollapsible(rideId);

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
          await apiService.ride.startTracking(ride.rideId!, ride.driverId);
        } catch (updateError: any) {
          console.warn("[RideDetails] Failed to start tracking, proceeding with local state:", updateError.message);
        }
      }

      const trackingPosition = await apiService.tracking.getTrackingPosition(rideId);
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

      setOpenCollapsible(rideId);

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

    const stepDuration = 1000; // 1 second per step
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
            const shouldAddToPaused = !isNaN(dropoffLat) && !isNaN(pickupLng) && distance < 0.1 && (pickupActions[ride._id]?.[dropoff.passengerId] || false) && !(dropoffActions[ride._id]?.[dropoff.passengerId] || false) && !newPausedPassengerIds.includes(dropoff.passengerId);
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
          await apiService.tracking.stopTracking(ride._id);
          const updatedRides = rides.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r));
          setRides(updatedRides);
          await apiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
          cleanupMap(rideId);
          console.log("[RideDetails] Simulation completed for", rideId);
          isUpdating = false;
          return;
        }

        const currentPosition = coordinates[currentIndex];
        vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
        lastPositions.current[rideId] = currentPosition;
        mapRefs.current[rideId]!.panTo(currentPosition);
        await apiService.tracking.updateTrackingPosition(ride._id, currentPosition);
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

  const snapToRoute = (point: [number, number], routeCoords: [number, number][]): [number, number] => {
    const nearestIndex = findNearestIndex(routeCoords, point);
    return routeCoords[nearestIndex];
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

      await apiService.tracking.updateTrackingPosition(ride._id, frontendPosition);
      const trackingResponse = await apiService.tracking.getTrackingPosition(ride._id);
      const backendPosition = trackingResponse.data as [number, number] | null;
      if (!backendPosition) throw new Error("Failed to retrieve backend position");

      const backendDistance = calculateHaversineDistance(backendPosition, pickupCoord);
      if (backendDistance > PICKUP_THRESHOLD) throw new Error(`Backend position is ${(backendDistance * 1000).toFixed(0)}m away from pickup point`);

      await apiService.ride.updateRide(ride._id, { passengerId, action: "picked", currentPosition: backendPosition }, user.driverId);
      setPickupActions((prev) => ({ ...prev, [rideId]: { ...prev[rideId], [passengerId]: true } }));
      setPausedPassengerIds((prev) => ({ ...prev, [rideId]: prev[rideId]?.filter((id) => id !== passengerId) || [] }));
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));

      const updatedRide = { ...ride, currentPosition: backendPosition };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));

      if (openCollapsible === rideId) {
        setOpenCollapsible(null);
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

      await apiService.tracking.updateTrackingPosition(ride._id, frontendPosition);
      const trackingResponse = await apiService.tracking.getTrackingPosition(ride._id);
      const backendPosition = trackingResponse.data as [number, number] | null;
      if (!backendPosition) throw new Error("Failed to retrieve backend position");

      const backendDistance = calculateHaversineDistance(backendPosition, dropoffCoord);
      if (backendDistance > DROPOFF_THRESHOLD) throw new Error(`Backend position is ${(backendDistance * 1000).toFixed(0)}m away from drop-off point`);

      await apiService.ride.updateRide(ride._id, { passengerId, action: "dropped", currentPosition: backendPosition }, user.driverId);
      setDropoffActions((prev) => ({ ...prev, [rideId]: { ...prev[rideId], [passengerId]: true } }));
      setPausedPassengerIds((prev) => ({ ...prev, [rideId]: prev[rideId]?.filter((id) => id !== passengerId) || [] }));
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));

      const updatedRide = { ...ride, currentPosition: backendPosition };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));

      if (openCollapsible === rideId) {
        setOpenCollapsible(null);
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

      await apiService.tracking.stopTracking(ride._id);
      if (animationIntervals.current[rideId]) {
        clearInterval(animationIntervals.current[rideId]!);
        animationIntervals.current[rideId] = null;
      }
      const updatedRides = rides.map((r) =>
        r._id === rideId ? { ...r, status: "Completed" as const } : r
      );
      setRides(updatedRides);
      setSimulationPaused((prev) => ({ ...prev, [rideId]: false }));
      await apiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
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

      const trackingResponse = await apiService.tracking.getTrackingPosition(ride._id);
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

  const isRideTimeReached = (ride: Ride) => {
    if (!ride.date || ride.date === "N/A" || !ride.time || ride.time === "N/A") return false;
    const rideStartTime = new Date(`${ride.date}T${ride.time}:00`).getTime();
    const now = new Date().getTime();
    return now >= rideStartTime && ride.status === "Pending";
  };

  const handleJoinRequest = async (rideId: string, passengerId: string, action: "accept" | "reject") => {
    try {
      console.log("[RideDetails] Initiating handleJoinRequest with:", { rideId, driverId: user!.driverId, passengerId, action });
      await apiService.ride.handleJoinRequest(rideId, user!.driverId, passengerId, action);
      await fetchRides();
    } catch (error: any) {
      console.error("[RideDetails] Error handling join request:", error.message);
      setError(`Failed to ${action} join request: ${error.message}`);
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
          const trackingResponse = await apiService.tracking.getTrackingPosition(ride._id);
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

    const currentRideId = openCollapsible;
    if (currentRideId) {
      const ride = rides.find((r) => r._id === currentRideId);
      if (ride && mapContainerRefs.current[currentRideId] && !mapRefs.current[currentRideId]) {
        console.log("[RideDetails] Initializing map for collapsible open", currentRideId);
        initializeMap(ride, mapContainerRefs.current[currentRideId]!);
      }
    } else {
      Object.keys(mapRefs.current).forEach((rideId) => {
        if (mapRefs.current[rideId] && rideId !== openCollapsible) cleanupMap(rideId);
      });
    }
  }, [openCollapsible, rides, leafletLoaded, initializeMap, cleanupMap]);

  return (
    <MainLayout activeItem="Rides">
      <div className="mx-auto max-w-5xl p-4">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Your Rides</CardTitle>
                <CardDescription className="text-gray-500">{currentDate}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && <ErrorAlert message={error} />}
            {isLoading ? (
              <p className="text-gray-600">Loading rides...</p>
            ) : rides.length === 0 ? (
              <p className="text-gray-600">No rides found.</p>
            ) : (
              <div className="grid gap-6">
                {rides.map((ride) => {
                  console.log("[RideDetails] Rendering ride:", ride._id, {
                    totalPeople: ride.totalPeople,
                    passengerCount: ride.passengerCount,
                    passengersLength: ride.passengers.length,
                  });
                  const seatsLeft = ride.passengerCount - ride.passengers.length;
                  const place = placeNames[ride._id] || { startPlace: ride.startPoint, endPlace: ride.endPoint };

                  return (
                    <Card key={ride._id} className="p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {place.startPlace} to {place.endPlace}
                            </h3>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Date:</span>{" "}
                                {ride.date !== "N/A" ? new Date(ride.date).toLocaleDateString() : "N/A"}
                                {ride.time && ride.time !== "N/A" && (
                                  <>
                                    {" | "}
                                    <span className="font-medium">Time:</span> {ride.time}
                                  </>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Status:</span>{" "}
                                <span
                                  className={`${ride.status === "Pending"
                                    ? "text-yellow-600"
                                    : ride.status === "Started"
                                      ? "text-blue-600"
                                      : ride.status === "Completed"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    } font-medium`}
                                >
                                  {ride.status}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Distance:</span>{" "}
                                {(ride.distanceKm ?? 0).toFixed(2)} km{" | "}
                                <span className="font-medium">Cost per Person:</span>{" "}
                                {(ride.costPerPerson ?? 0).toFixed(2)} INR
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Seats Left:</span> {seatsLeft}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {ride.status === "Pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(ride)}
                                  disabled={isRideTimeReached(ride)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelRide(ride.rideId!)}
                                  disabled={isRideTimeReached(ride)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {ride.status === "Pending" && isRideTimeReached(ride) && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => startRide(ride._id)}
                              >
                                Start Ride
                              </Button>
                            )}
                            {ride.status === "Started" && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => resumeSimulation(ride._id)}
                                  disabled={!mapRefs.current[ride._id] || !simulationPaused[ride._id]}
                                >
                                  Resume Simulation
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => stopRide(ride._id)}
                                >
                                  Stop Ride
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                        <Collapsible
                          open={openCollapsible === ride._id}
                          onOpenChange={() => toggleCollapsible(ride._id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2">
                              {openCollapsible === ride._id ? "Hide Details" : "Show More"}
                              {openCollapsible === ride._id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <Separator className="mb-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">
                                  Additional Details
                                </h4>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Passenger Capacity:</span>{" "}
                                  {ride.passengerCount}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Current Passengers:</span> {ride.passengers.length}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Fuel Price:</span> {ride.fuelPrice} INR
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Total Fuel Cost:</span>{" "}
                                  {(ride.totalFuelCost ?? 0).toFixed(2)} INR
                                </p>
                              </div>
                              <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">Route Map</h4>
                                <div
                                  id={`map-${ride._id}`}
                                  className="h-64 w-full rounded-lg"
                                  ref={(el) => {
                                    if (el) mapContainerRefs.current[ride._id] = el;
                                  }}
                                />
                                {ride.status === "Started" && mapRefs.current[ride._id] && (
                                  <div className="mt-2">
                                    {ride.passengers.map((passenger, index) => {
                                      const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                                      const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                                      const isPausedForPickup = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && !pickupActions[ride._id]?.[passenger.passengerId];
                                      const isPausedForDropoff = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && pickupActions[ride._id]?.[passenger.passengerId] && !dropoffActions[ride._id]?.[passenger.passengerId];

                                      return (
                                        <div key={index} className="mb-2">
                                          {isPausedForPickup && pickup && (
                                            <Button
                                              variant="success"
                                              size="sm"
                                              onClick={() => handlePickup(ride._id, passenger.passengerId)}
                                            >
                                              Pick up {passenger.passengerName}
                                            </Button>
                                          )}
                                          {isPausedForDropoff && dropoff && (
                                            <Button
                                              variant="success"
                                              size="sm"
                                              onClick={() => handleDropoff(ride._id, passenger.passengerId)}
                                            >
                                              Drop off {passenger.passengerName}
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-md font-semibold text-gray-700 mb-2 mt-4">Passenger Details</h4>
                              {ride.passengers.length > 0 || ride.pendingRequests?.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                                  {ride.passengers.map((passenger, index) => {
                                    const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                                    const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                                    return (
                                      <li key={index}>
                                        <span className="font-medium">Passenger {index + 1}:</span> {passenger.passengerName} (ID: {passenger.passengerId}) <br />
                                        <span className="font-medium">Pickup Location:</span> {pickup ? pickup.placeName : "N/A"} ({pickup ? pickup.location : "N/A"}) <br />
                                        <span className="font-medium">Drop-off Location:</span> {dropoff ? dropoff.placeName : "N/A"} ({dropoff ? dropoff.location : "N/A"}) <br />
                                        <span className="font-medium">Picked Up:</span> {pickupActions[ride._id]?.[passenger.passengerId] ? "Yes" : "No"} <br />
                                        <span className="font-medium">Dropped Off:</span> {dropoffActions[ride._id]?.[passenger.passengerId] ? "Yes" : "No"}
                                      </li>
                                    );
                                  })}
                                  {ride.pendingRequests
                                    ?.filter((request) => request.status === "pending")
                                    .map((request, index) => (
                                      <li key={`pending-${index}`}>
                                        <span className="font-medium">Pending Request {ride.passengers.length + index + 1}:</span> {request.passengerName} (ID: {request.passengerId}) <br />
                                        <span className="font-medium">Pickup Location:</span> {request.pickupLocation} <br />
                                        <span className="font-medium">Drop-off Location:</span> {request.dropoffLocation} <br />
                                        {user?.driverId === ride.driverId && (
                                          <div className="flex gap-2 mt-1">
                                            <Button
                                              variant="success"
                                              size="sm"
                                              onClick={() => handleJoinRequest(ride.rideId, request.passengerId, "accept")}
                                            >
                                              Accept
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => handleJoinRequest(ride.rideId, request.passengerId, "reject")}
                                            >
                                              Reject
                                            </Button>
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-600">No passengers or pending requests.</p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editModalOpen} onOpenChange={(open) => {
        setEditModalOpen(open);
        if (!open) setModalError(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ride</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {modalError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative" role="alert">
                <span className="block sm:inline">{modalError}</span>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="col-span-3"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRide}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}