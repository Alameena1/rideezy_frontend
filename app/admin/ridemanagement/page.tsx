"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "@/services/api";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Ride {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  distanceKm: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  status: string;
  createdAt: string;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  routeGeometry: string;
}

interface PassengerDetails {
  id: string;
  name: string;
  pickupLocation: string;
  pickupPlaceName: string;
  dropoffLocation: string;
  dropoffPlaceName: string;
  pickedUp?: boolean;
  droppedOff?: boolean;
}

interface TrackingData {
  success: boolean;
  data: {
    currentPosition: [number, number] | null;
    status: "Started" | "Paused" | "Completed";
    pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[];
    dropoffActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[];
  } | [number, number];
}

export default function RideManagement() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<{ [rideId: string]: PassengerDetails[] }>({});
  const [trackingData, setTrackingData] = useState<{ [rideId: string]: TrackingData }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);
  const [mapErrors, setMapErrors] = useState<{ [rideId: string]: string }>({});

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const driverMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const trackingIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const animationIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const lastPositions = useRef<{ [key: string]: [number, number] | null }>({});
  const lastIndex = useRef<{ [key: string]: number }>({});
  const lastTrackingData = useRef<{ [key: string]: [number, number] | null }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((module) => {
        setLeafletLoaded(module.default);
        console.log("[RideManagement] Leaflet loaded successfully");
      }).catch((err) => {
        console.error("[RideManagement] Failed to load Leaflet:", err);
        setError("Failed to load map library. Please try again.");
      });
    }
  }, []);

  // Fetch rides
  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        const fetchedRides = await apiService.admin.ride.getRides();
        console.log("[RideManagement] Fetched rides:", fetchedRides);

        const mappedRides: Ride[] = fetchedRides.map((ride: any) => ({
          _id: ride._id.toString(),
          rideId: ride.rideId || "N/A",
          driverId: ride.driverId || "N/A",
          driverName: ride.driverName || "N/A",
          vehicleId: ride.vehicleId || "N/A",
          date: ride.date || "N/A",
          time: ride.time || "N/A",
          startPoint: ride.startPoint || "N/A",
          startPlaceName: ride.startPlaceName || ride.startPoint,
          endPoint: ride.endPoint || "N/A",
          endPlaceName: ride.endPlaceName || ride.endPoint,
          distanceKm: ride.distanceKm || 0,
          fuelPrice: ride.fuelPrice || 0,
          passengerCount: ride.passengerCount || 0,
          totalFuelCost: ride.totalFuelCost || 0,
          costPerPerson: ride.costPerPerson || 0,
          totalPeople: ride.totalPeople || 0,
          status: ride.status || "Pending",
          createdAt: ride.createdAt
            ? new Date(ride.createdAt).toLocaleDateString()
            : "N/A",
          passengers: ride.passengers || [],
          pickupPoints: ride.pickupPoints || [],
          dropoffPoints: ride.dropoffPoints || [],
          routeGeometry: ride.routeGeometry || "",
        }));

        setRides(mappedRides);

        const newPassengerDetails = mappedRides.reduce((acc, ride) => {
          acc[ride._id] = ride.passengers.map((passenger) => {
            const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
            const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
            return {
              id: passenger.passengerId,
              name: passenger.passengerName,
              pickupLocation: pickup ? pickup.location : "N/A",
              pickupPlaceName: pickup ? pickup.placeName : "N/A",
              dropoffLocation: dropoff ? dropoff.location : "N/A",
              dropoffPlaceName: dropoff ? dropoff.placeName : "N/A",
              pickedUp: passenger.pickedUp || false,
              droppedOff: passenger.droppedOff || false,
            };
          });
          return acc;
        }, {} as { [rideId: string]: PassengerDetails[] });

        setPassengerDetails(newPassengerDetails);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch rides";
        console.error("[RideManagement] Fetch rides failed:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  // Fetch tracking data and start simulation
  const fetchTrackingAndStartSimulation = async (rideId: string, retries = 0, maxRetries = 3) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !["Started", "Paused"].includes(ride.status)) {
        console.log(`[RideManagement] Skipping tracking for ride ${rideId}: Invalid ride or status`);
        return;
      }

      const trackingData = await apiService.tracking.getTrackingPosition(ride._id);
      console.log(`[RideManagement] Tracking data fetched for ride ${rideId}:`, trackingData);

      let currentPosition: [number, number] | null = null;
      let trackingStatus: "Started" | "Paused" | "Completed" = "Started";
      let pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[] = [];
      let dropoffActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[] = [];

      if (trackingData.success && trackingData.data) {
        if (Array.isArray(trackingData.data)) {
          currentPosition = trackingData.data.length === 2 && trackingData.data.every((n: number) => !isNaN(n))
            ? [trackingData.data[0], trackingData.data[1]] as [number, number]
            : null;
          if (
            lastTrackingData.current[rideId] &&
            lastTrackingData.current[rideId]?.[0] === currentPosition?.[0] &&
            lastTrackingData.current[rideId]?.[1] === currentPosition?.[1]
          ) {
            trackingStatus = "Paused";
          }
          lastTrackingData.current[rideId] = currentPosition;
        } else {
          currentPosition = Array.isArray(trackingData.data.currentPosition) && trackingData.data.currentPosition.length === 2
            ? [trackingData.data.currentPosition[0], trackingData.data.currentPosition[1]] as [number, number]
            : null;
          trackingStatus = trackingData.data.status || "Started";
          pickupActions = trackingData.data.pickupActions || [];
          dropoffActions = trackingData.data.dropoffActions || [];
          lastTrackingData.current[rideId] = currentPosition;
        }
      }

      setTrackingData((prev) => ({
        ...prev,
        [rideId]: { success: trackingData.success, data: { currentPosition, status: trackingStatus, pickupActions, dropoffActions } },
      }));

      setRides((prev) => prev.map((r) => {
        if (r._id !== rideId) return r;
        return {
          ...r,
          status: trackingStatus,
          passengers: r.passengers.map((p) => ({
            ...p,
            pickedUp: pickupActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
            droppedOff: dropoffActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
          })),
        };
      }));

      setPassengerDetails((prev) => ({
        ...prev,
        [rideId]: prev[rideId]?.map((p) => ({
          ...p,
          pickedUp: pickupActions.find((a) => a.passengerId === p.id)?.status === "Completed",
          droppedOff: dropoffActions.find((a) => a.passengerId === p.id)?.status === "Completed",
        })) || [],
      }));

      // Skip map initialization if routeGeometry is missing or invalid
      if (!ride.routeGeometry) {
        setMapErrors((prev) => ({
          ...prev,
          [rideId]: "Route map unavailable due to missing route data",
        }));
        return;
      }

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded && currentPosition) {
        if (!mapRefs.current[rideId]) {
          initializeMap(ride, mapContainer);
        }
        if (!driverMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
          driverMarkerRefs.current[rideId] = leafletLoaded!.marker(currentPosition, {
            icon: leafletLoaded!.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(mapRefs.current[rideId]!).bindPopup(`Driver: ${ride.driverName} (${trackingStatus})`);
          console.log(`[RideManagement] Driver marker created at: ${currentPosition} for ride ${rideId}`);
        }
        if (driverMarkerRefs.current[rideId]) {
          driverMarkerRefs.current[rideId]!.setLatLng(currentPosition);
          mapRefs.current[rideId]!.panTo(currentPosition);
          mapRefs.current[rideId]!.invalidateSize();
          console.log(`[RideManagement] Driver marker updated to: ${currentPosition} for ride ${rideId}`);
        }
      }

      if (mapRefs.current[rideId] && driverMarkerRefs.current[rideId] && currentPosition) {
        try {
          const routeData = JSON.parse(ride.routeGeometry);
          if (routeData.type === "LineString" && routeData.coordinates) {
            const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
            startSimulation(rideId, coordinates, ride.distanceKm, currentPosition, trackingStatus, pickupActions, dropoffActions);
          } else {
            setMapErrors((prev) => ({
              ...prev,
              [rideId]: "Route map unavailable due to invalid route data",
            }));
          }
        } catch (error) {
          console.error(`[RideManagement] Error parsing route geometry for ride ${rideId}:`, error);
          setMapErrors((prev) => ({
            ...prev,
            [rideId]: "Route map unavailable due to invalid route data",
          }));
        }
      }
    } catch (error: any) {
      console.error(`[RideManagement] Error fetching tracking for ride ${rideId}:`, error);
      if (retries < maxRetries) {
        console.log(`[RideManagement] Retry ${retries + 1}/${maxRetries} for ride ${rideId}`);
        setTimeout(() => fetchTrackingAndStartSimulation(rideId, retries + 1, maxRetries), 5000);
      } else {
        setError(`Failed to fetch tracking data for ride ${rideId} after ${maxRetries} attempts: ${error.message}`);
      }
    }
  };

  // Start simulation
  const startSimulation = (
    rideId: string,
    coordinates: [number, number][],
    distanceKm: number,
    startPosition: [number, number],
    trackingStatus: "Started" | "Paused" | "Completed",
    pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[],
    dropoffActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[]
  ) => {
    if (animationIntervals.current[rideId] || !mapRefs.current[rideId] || !driverMarkerRefs.current[rideId]) {
      console.log(`[RideManagement] Simulation aborted: Interval exists, map unavailable, or marker missing for ${rideId}`);
      return;
    }

    if (coordinates.length < 2) {
      setMapErrors((prev) => ({
        ...prev,
        [rideId]: "Simulation failed: Insufficient route data",
      }));
      return;
    }

    const stepDuration = 1000; // 1 second per step
    if (!lastIndex.current[rideId]) {
      lastIndex.current[rideId] = findNearestIndex(coordinates, startPosition);
      if (lastIndex.current[rideId] === -1) lastIndex.current[rideId] = 0;
    }
    let currentIndex = lastIndex.current[rideId];

    animationIntervals.current[rideId] = setInterval(async () => {
      try {
        const ride = rides.find((r) => r._id === rideId);
        if (!ride) {
          console.warn(`[RideManagement] Ride not found, stopping simulation for ${rideId}`);
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          return;
        }

        const trackingData = await apiService.tracking.getTrackingPosition(ride._id);
        let currentPosition: [number, number] | null = null;
        let status: "Started" | "Paused" | "Completed" = trackingStatus;
        let updatedPickupActions = pickupActions;
        let updatedDropoffActions = dropoffActions;

        if (trackingData.success && trackingData.data) {
          if (Array.isArray(trackingData.data)) {
            currentPosition = trackingData.data.length === 2 && trackingData.data.every((n: number) => !isNaN(n))
              ? [trackingData.data[0], trackingData.data[1]] as [number, number]
              : null;
            if (
              lastTrackingData.current[rideId] &&
              lastTrackingData.current[rideId]?.[0] === currentPosition?.[0] &&
              lastTrackingData.current[rideId]?.[1] === currentPosition?.[1]
            ) {
              status = "Paused";
            }
            lastTrackingData.current[rideId] = currentPosition;
          } else {
            currentPosition = Array.isArray(trackingData.data.currentPosition) && trackingData.data.currentPosition.length === 2
              ? [trackingData.data.currentPosition[0], trackingData.data.currentPosition[1]] as [number, number]
              : null;
            status = trackingData.data.status || "Started";
            updatedPickupActions = trackingData.data.pickupActions || [];
            updatedDropoffActions = trackingData.data.dropoffActions || [];
            lastTrackingData.current[rideId] = currentPosition;
          }
        }

        setTrackingData((prev) => ({
          ...prev,
          [rideId]: { success: trackingData.success, data: { currentPosition, status, pickupActions: updatedPickupActions, dropoffActions: updatedDropoffActions } },
        }));

        if (status === "Completed") {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          setRides((prev) => prev.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r)));
          console.log(`[RideManagement] Simulation completed for ${rideId}`);
          return;
        }

        if (status === "Paused" || updatedPickupActions.some((a) => a.status === "Pending") || updatedDropoffActions.some((a) => a.status === "Pending")) {
          if (currentPosition && driverMarkerRefs.current[rideId]) {
            driverMarkerRefs.current[rideId]!.setLatLng(currentPosition);
            lastPositions.current[rideId] = currentPosition;
            mapRefs.current[rideId]!.panTo(currentPosition);
            console.log(`[RideManagement] Simulation paused at: ${currentPosition} for ride ${rideId}`);
          }
          return;
        }

        currentIndex++;
        lastIndex.current[rideId] = currentIndex;
        if (currentIndex >= coordinates.length) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          setRides((prev) => prev.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r)));
          console.log(`[RideManagement] Simulation completed for ${rideId}`);
          return;
        }

        const newPosition = coordinates[currentIndex];
        driverMarkerRefs.current[rideId]!.setLatLng(newPosition);
        lastPositions.current[rideId] = newPosition;
        mapRefs.current[rideId]!.panTo(newPosition);
        console.log(`[RideManagement] Simulation moved to: ${newPosition} for ride ${rideId}`);

        setRides((prev) => prev.map((r) => (r._id === rideId ? {
          ...r,
          status,
          passengers: r.passengers.map((p) => ({
            ...p,
            pickedUp: updatedPickupActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
            droppedOff: updatedDropoffActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
          })),
        } : r)));

        setPassengerDetails((prev) => ({
          ...prev,
          [rideId]: prev[rideId]?.map((p) => ({
            ...p,
            pickedUp: updatedPickupActions.find((a) => a.passengerId === p.id)?.status === "Completed",
            droppedOff: updatedDropoffActions.find((a) => a.passengerId === p.id)?.status === "Completed",
          })) || [],
        }));
      } catch (error) {
        console.error(`[RideManagement] Simulation error for ${rideId}:`, error);
        setError(`Simulation error for ride ${rideId}: ${error.message}`);
        clearInterval(animationIntervals.current[rideId]!);
        animationIntervals.current[rideId] = null;
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

  const calculateHaversineDistance = (coord1: [number, number], coord2: [number, number]): number => {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2 || coord1.some(isNaN) || coord2.some(isNaN)) {
      console.error("[RideManagement] Invalid coordinates for Haversine:", { coord1, coord2 });
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
    return R * c;
  };

  // Poll for tracking data
  useEffect(() => {
    rides.forEach((ride) => {
      if (["Started", "Paused"].includes(ride.status) && !trackingIntervals.current[ride._id]) {
        fetchTrackingAndStartSimulation(ride._id);
        trackingIntervals.current[ride._id] = setInterval(() => fetchTrackingAndStartSimulation(ride._id), 5000);
      }
    });

    return () => {
      Object.values(trackingIntervals.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
      trackingIntervals.current = {};
    };
  }, [rides]);

  const handleCancelRide = async (ride: Ride) => {
    try {
      await apiService.admin.ride.cancelRide(ride._id);
      setRides(rides.map((r) =>
        r._id === ride._id ? { ...r, status: "Canceled" } : r
      ));
      setTrackingData((prev) => {
        const { [ride._id]: _, ...rest } = prev;
        return rest;
      });
      setMapErrors((prev) => {
        const { [ride._id]: _, ...rest } = prev;
        return rest;
      });
      if (trackingIntervals.current[ride._id]) {
        clearInterval(trackingIntervals.current[ride._id]!);
        trackingIntervals.current[ride._id] = null;
      }
      if (animationIntervals.current[ride._id]) {
        clearInterval(animationIntervals.current[ride._id]!);
        animationIntervals.current[ride._id] = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel ride";
      console.error("[RideManagement] Cancel ride failed:", err);
      setError(errorMessage);
    }
  };

  const handleBlockRide = async (ride: Ride) => {
    try {
      await apiService.admin.ride.blockRide(ride._id);
      setRides(rides.map((r) =>
        r._id === ride._id ? { ...r, status: "Blocked" } : r
      ));
      setTrackingData((prev) => {
        const { [ride._id]: _, ...rest } = prev;
        return rest;
      });
      setMapErrors((prev) => {
        const { [ride._id]: _, ...rest } = prev;
        return rest;
      });
      if (trackingIntervals.current[ride._id]) {
        clearInterval(trackingIntervals.current[ride._id]!);
        trackingIntervals.current[ride._id] = null;
      }
      if (animationIntervals.current[ride._id]) {
        clearInterval(animationIntervals.current[ride._id]!);
        animationIntervals.current[ride._id] = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to block ride";
      console.error("[RideManagement] Block ride failed:", err);
      setError(errorMessage);
    }
  };

  const toggleDetails = (rideId: string) => {
    if (expandedRide === rideId) {
      cleanupMap(rideId);
      setExpandedRide(null);
    } else {
      setExpandedRide(rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (ride && ["Started", "Paused"].includes(ride.status)) {
        fetchTrackingAndStartSimulation(rideId);
      }
    }
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
    if (!leafletLoaded || !leafletLoaded.map) {
      console.error(`[RideManagement] Cannot initialize map for ride ${ride._id}: Leaflet not loaded`);
      setMapErrors((prev) => ({
        ...prev,
        [ride._id]: "Route map unavailable: Map library not loaded",
      }));
      return;
    }

    if (mapRefs.current[ride._id]) {
      console.log(`[RideManagement] Map already initialized for ride ${ride._id}`);
      return;
    }

    console.log(`[RideManagement] Initializing map for ride ${ride._id}`);
    const map = leafletLoaded.map(mapContainer, { zoomControl: true }).setView([0, 0], 8);
    leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRefs.current[ride._id] = map;

    try {
      const routeData = JSON.parse(ride.routeGeometry);
      if (routeData.type === "LineString" && routeData.coordinates) {
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { color: "#3b9ddd", weight: 5 }).addTo(map);

        const [startLat, startLng] = coordinates[0];
        const [endLat, endLng] = coordinates[coordinates.length - 1];
        startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`Start: ${ride.startPlaceName}`);

        endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`End: ${ride.endPlaceName}`);

        pickupMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
          const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
          if (!pickup) return null;

          const [lat, lng] = pickup.location.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`[RideManagement] Invalid pickup location for passenger ${passenger.passengerId}: ${pickup.location}`);
            return null;
          }

          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: passenger.pickedUp
                ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
                : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Pickup: ${pickup.placeName}${passenger.pickedUp ? " (Picked Up)" : ""}`);
        }).filter((marker): marker is L.Marker => marker !== null);

        dropoffMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
          const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
          if (!dropoff) return null;

          const [lat, lng] = dropoff.location.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`[RideManagement] Invalid drop-off location for passenger ${passenger.passengerId}: ${dropoff.location}`);
            return null;
          }

          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: passenger.droppedOff
                ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png"
                : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Drop-off: ${dropoff.placeName}${passenger.droppedOff ? " (Dropped Off)" : ""}`);
        }).filter((marker): marker is L.Marker => marker !== null);

        const tracking = trackingData[ride._id];
        if (tracking && tracking.data.currentPosition) {
          const [lat, lng] = tracking.data.currentPosition;
          if (!isNaN(lat) && !isNaN(lng)) {
            driverMarkerRefs.current[ride._id] = leafletLoaded.marker([lat, lng], {
              icon: leafletLoaded.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(map).bindPopup(`Driver: ${ride.driverName} (${tracking.data.status})`);
          }
        }

        map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [50, 50] });
        map.invalidateSize();
      } else {
        console.error(`[RideManagement] Invalid route geometry for ride ${ride._id}:`, routeData);
        setMapErrors((prev) => ({
          ...prev,
          [ride._id]: "Route map unavailable due to invalid route data",
        }));
      }
    } catch (error) {
      console.error(`[RideManagement] Error parsing route geometry for ride ${ride._id}:`, error);
      setMapErrors((prev) => ({
        ...prev,
        [ride._id]: "Route map unavailable due to invalid route data",
      }));
    }
  }, [leafletLoaded, trackingData]);

  const cleanupMap = useCallback((rideId: string) => {
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    routeLayers.current[rideId] = null;
    startMarkerRefs.current[rideId] = null;
    endMarkerRefs.current[rideId] = null;
    pickupMarkerRefs.current[rideId]?.forEach(marker => marker.remove());
    pickupMarkerRefs.current[rideId] = [];
    dropoffMarkerRefs.current[rideId]?.forEach(marker => marker.remove());
    dropoffMarkerRefs.current[rideId] = [];
    if (driverMarkerRefs.current[rideId]) {
      driverMarkerRefs.current[rideId]?.remove();
      driverMarkerRefs.current[rideId] = null;
    }
    mapContainerRefs.current[rideId] = null;
    if (trackingIntervals.current[rideId]) {
      clearInterval(trackingIntervals.current[rideId]!);
      trackingIntervals.current[rideId] = null;
    }
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    lastPositions.current[rideId] = null;
    lastIndex.current[rideId] = 0;
    lastTrackingData.current[rideId] = null;
    setMapErrors((prev) => {
      const { [rideId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const renderStatus = (ride: Ride) => {
    const tracking = trackingData[ride._id];
    const status = tracking ? (Array.isArray(tracking.data) ? ride.status : tracking.data.status) : ride.status;
    const color = status === "Pending" ? "text-orange-500" : 
                 status === "Canceled" ? "text-red-500" : 
                 status === "Blocked" ? "text-yellow-500" : 
                 status === "Started" ? "text-green-500" : 
                 status === "Paused" ? "text-blue-500" : "text-green-500";
    return <span className={color}>{status}</span>;
  };

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  const truncateId = (id: string, length: number = 8): string => {
    if (id === "N/A") return id;
    return id.length > length ? `${id.substring(0, length)}...` : id;
  };

  return (
    <div className="bg-gray-900 text-white p-6 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">Ride Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading rides...</div>
      ) : rides.length === 0 ? (
        <div className="text-center text-gray-400">No rides found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="w-full border-collapse bg-gray-800 text-gray-200">
            <thead>
              <tr className="bg-gray-700 text-left text-sm uppercase tracking-wider">
                <th className="p-4 border-b border-gray-600 font-medium">#</th>
                <th className="p-4 border-b border-gray-600 font-medium">Ride ID</th>
                <th className="p-4 border-b border-gray-600 font-medium">Driver Name</th>
                <th className="p-4 border-b border-gray-600 font-medium">Date</th>
                <th className="p-4 border-b border-gray-600 font-medium">Start Location</th>
                <th className="p-4 border-b border-gray-600 font-medium">End Location</th>
                <th className="p-4 border-b border-gray-600 font-medium">Status</th>
                <th className="p-4 border-b border-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride, index) => {
                const isExpanded = expandedRide === ride._id;
                const passengersForRide = passengerDetails[ride._id] || [];

                return (
                  <>
                    <tr key={ride._id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4 font-mono text-sm">{truncateId(ride.rideId)}</td>
                      <td className="p-4">{ride.driverName}</td>
                      <td className="p-4">{ride.date}</td>
                      <td className="p-4">{ride.startPlaceName}</td>
                      <td className="p-4">{ride.endPlaceName}</td>
                      <td className="p-4">{renderStatus(ride)}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          {ride.status === "Pending" && (
                            <>
                              <button
                                onClick={() => handleCancelRide(ride)}
                                className="bg-red-700 text-white rounded px-3 py-1 hover:bg-red-600 transition-colors text-sm"
                              >
                                Cancel Ride
                              </button>
                              <button
                                onClick={() => handleBlockRide(ride)}
                                className="bg-yellow-700 text-white rounded px-3 py-1 hover:bg-yellow-600 transition-colors text-sm"
                              >
                                Block Ride
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleDetails(ride._id)}
                            className="bg-gray-600 text-white rounded px-3 py-1 hover:bg-gray-500 transition-colors text-sm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-750">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-gray-200">Ride Details</h4>
                              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                <li><span className="font-medium">Ride ID:</span> {ride.rideId}</li>
                                <li><span className="font-medium">Driver ID:</span> {truncateId(ride.driverId)}</li>
                                <li><span className="font-medium">Driver Name:</span> {ride.driverName}</li>
                                <li><span className="font-medium">Vehicle ID:</span> {truncateId(ride.vehicleId)}</li>
                                <li><span className="font-medium">Date:</span> {ride.date}</li>
                                <li><span className="font-medium">Time:</span> {ride.time}</li>
                                <li><span className="font-medium">Start Location:</span> {ride.startPlaceName} ({ride.startPoint})</li>
                                <li><span className="font-medium">End Location:</span> {ride.endPlaceName} ({ride.endPoint})</li>
                                <li><span className="font-medium">Distance:</span> {formatNumber(ride.distanceKm)} km</li>
                                <li><span className="font-medium">Fuel Price:</span> {formatNumber(ride.fuelPrice)}</li>
                                <li><span className="font-medium">Passenger Count:</span> {ride.passengerCount}</li>
                                <li><span className="font-medium">Total Fuel Cost:</span> {formatNumber(ride.totalFuelCost)}</li>
                                <li><span className="font-medium">Cost Per Person:</span> {formatNumber(ride.costPerPerson)}</li>
                                <li><span className="font-medium">Total People:</span> {ride.totalPeople}</li>
                                <li><span className="font-medium">Status:</span> {renderStatus(ride)}</li>
                                <li><span className="font-medium">Created At:</span> {ride.createdAt}</li>
                              </ul>
                              <h4 className="text-lg font-semibold mt-4 mb-3 text-gray-200">Passenger Details</h4>
                              {passengersForRide.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                  {passengersForRide.map((passenger, idx) => (
                                    <li key={idx}>
                                      <span className="font-medium">Passenger {idx + 1}:</span> {passenger.name} (ID: {truncateId(passenger.id)}) <br />
                                      <span className="font-medium">Pickup Location:</span> {passenger.pickupPlaceName} ({passenger.pickupLocation}) <br />
                                      <span className="font-medium">Picked Up:</span> {passenger.pickedUp ? "Yes" : "No"} <br />
                                      <span className="font-medium">Drop-off Location:</span> {passenger.dropoffPlaceName} ({passenger.dropoffLocation}) <br />
                                      <span className="font-medium">Dropped Off:</span> {passenger.droppedOff ? "Yes" : "No"}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400">No passengers assigned.</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-gray-200">Route Map</h4>
                              {mapErrors[ride._id] ? (
                                <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800">
                                  {mapErrors[ride._id]}
                                </div>
                              ) : (
                                <div
                                  id={`map-${ride._id}`}
                                  className="h-72 w-full rounded-lg border border-gray-600"
                                  ref={(el) => {
                                    mapContainerRefs.current[ride._id] = el;
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}