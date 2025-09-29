"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";
import { clientApiService } from "@/services/client-api"; // Fixed import
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Phone, X } from "lucide-react";
import * as L from "leaflet";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "../../comp/MainLayout";
import Swal from "sweetalert2";
import "leaflet/dist/leaflet.css";

interface Ride {
  _id: string;
  rideId?: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  time?: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  distanceKm: number;
  passengerCount: number;
  costPerPerson: number;
  totalPeople: number;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  status: "Pending" | "Started" | "Completed";
  routeGeometry: string;
  paymentStatus: "Paid" | "Pending";
  currentPosition?: [number, number] | null;
  requestStatus?: "pending" | "accepted" | "rejected";
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

export default function JoinedRideDetails() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);
  const userId = user?._id || "default_user_id";

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const vehicleMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const animationIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const lastPositions = useRef<{ [key: string]: [number, number] | null }>({});
  const lastIndex = useRef<{ [key: string]: number }>({});
  const lastTrackingData = useRef<{ [key: string]: [number, number] | null }>({});

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Set up API interceptors for authenticated requests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { clientApi } = require('@/services/client-api');
      clientApi.useTokenInterceptor();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet")
        .then((module) => {
          setLeafletLoaded(module.default);
          console.log("[JoinedRideDetails] Leaflet loaded successfully");
        })
        .catch((err) => {
          console.error("[JoinedRideDetails] Failed to load Leaflet:", err);
          setError("Failed to load map library. Please try again.");
        });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchJoinedRides();
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    if (rides.length > 0) {
      console.log("[JoinedRideDetails] Rides state updated, starting simulations:", rides);
      for (const ride of rides) {
        if (ride.status === "Started") {
          console.log("[JoinedRideDetails] Starting simulation for ride:", ride._id);
          fetchTrackingAndStartSimulation(ride._id);
        }
      }
    }
  }, [rides]);

  const fetchJoinedRides = async () => {
    setIsLoading(true);
    try {
      const joinedRidesData = await clientApiService.ride.getJoinedRides(); // Fixed API call
      const fetchedRides = Array.isArray(joinedRidesData.data) ? joinedRidesData.data : [];
      console.log("[JoinedRideDetails] Fetched rides:", fetchedRides);

      const mappedRides: Ride[] = fetchedRides.map((ride: any) => ({
        _id: ride._id?.toString() || "N/A",
        rideId: ride.rideId || ride._id?.toString() || "N/A",
        driverId: ride.driverId || "N/A",
        driverName: ride.driverName || "Unknown Driver",
        vehicleId: ride.vehicleId || "N/A",
        date: ride.date || "N/A",
        time: ride.time || "N/A",
        startPoint: ride.startPoint || "N/A",
        startPlaceName: ride.startPlaceName || ride.startPoint || "N/A",
        endPoint: ride.endPoint || "N/A",
        endPlaceName: ride.endPlaceName || ride.endPoint || "N/A",
        distanceKm: ride.distanceKm || 0,
        passengerCount: ride.passengerCount || 0,
        costPerPerson: ride.costPerPerson || 0,
        totalPeople: ride.totalPeople || 0,
        passengers: ride.passengers || [],
        pickupPoints: ride.pickupPoints || [],
        dropoffPoints: ride.dropoffPoints || [],
        status: ride.status || "Pending",
        routeGeometry: ride.routeGeometry || "",
        paymentStatus: ride.paymentStatus || "Pending",
        requestStatus: ride.requestStatus || (ride.passengers.some((p: any) => p.passengerId === userId) ? "accepted" : "pending"),
      }));

      setRides(mappedRides);
      console.log("[JoinedRideDetails] Mapped rides set to state:", mappedRides);
    } catch (error: any) {
      console.error("[JoinedRideDetails] Error fetching joined rides:", error);
      setError("Failed to fetch joined rides. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = useCallback(
    (ride: Ride, mapContainer: HTMLDivElement) => {
      if (mapRefs.current[ride._id] || !leafletLoaded || !leafletLoaded.map) {
        console.log("[JoinedRideDetails] Map initialization skipped or already exists for ride", ride._id);
        return;
      }

      console.log("[JoinedRideDetails] Initializing map for ride", ride._id);
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
            const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
            if (!pickup) return null;

            const [lat, lng] = pickup.location.split(",").map(Number);
            if (isNaN(lat) || isNaN(lng)) {
              console.error("[JoinedRideDetails] Invalid pickup location for passenger", passenger.passengerId);
              return null;
            }

            return leafletLoaded.marker([lat, lng], {
              icon: leafletLoaded.icon({
                iconUrl: passenger.passengerId === userId
                  ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png"
                  : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Pickup: ${pickup.placeName}`);
          }).filter((marker): marker is L.Marker => marker !== null);

          dropoffMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
            const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
            if (!dropoff) return null;

            const [lat, lng] = dropoff.location.split(",").map(Number);
            if (isNaN(lat) || isNaN(lng)) {
              console.error("[JoinedRideDetails] Invalid dropoff location for passenger", passenger.passengerId);
              return null;
            }

            return leafletLoaded.marker([lat, lng], {
              icon: leafletLoaded.icon({
                iconUrl: passenger.passengerId === userId
                  ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png"
                  : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Drop-off: ${dropoff.placeName}`);
          }).filter((marker): marker is L.Marker => marker !== null);

          if (ride.status === "Started" && ride.currentPosition) {
            vehicleMarkerRefs.current[ride._id] = leafletLoaded.marker(ride.currentPosition, {
              icon: leafletLoaded.icon({
                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(map).bindPopup("Vehicle");
            lastPositions.current[ride._id] = ride.currentPosition;
          }

          map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [50, 50] });
          map.invalidateSize();
          console.log("[JoinedRideDetails] Map initialized for ride", ride._id);
        } else {
          console.error("[JoinedRideDetails] Invalid route geometry:", routeData);
          setError("Failed to render route map. Invalid route data.");
        }
      } catch (error) {
        console.error("[JoinedRideDetails] Error parsing route geometry:", error);
        setError("Failed to render route map. Invalid route data.");
      }
    },
    [leafletLoaded, userId]
  );

  const cleanupMap = useCallback((rideId: string) => {
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    routeLayers.current[rideId] = null;
    startMarkerRefs.current[rideId] = null;
    endMarkerRefs.current[rideId] = null;
    pickupMarkerRefs.current[rideId]?.forEach((marker) => marker.remove());
    pickupMarkerRefs.current[rideId] = [];
    dropoffMarkerRefs.current[rideId]?.forEach((marker) => marker.remove());
    dropoffMarkerRefs.current[rideId] = [];
    vehicleMarkerRefs.current[rideId]?.remove();
    vehicleMarkerRefs.current[rideId] = null;
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    lastPositions.current[rideId] = null;
    lastIndex.current[rideId] = 0;
    lastTrackingData.current[rideId] = null;
    console.log("[JoinedRideDetails] Map cleaned up for ride", rideId);
  }, []);

  const fetchTrackingAndStartSimulation = async (rideId: string, retries = 0, maxRetries = 3) => {
    try {
      console.log("[JoinedRideDetails] Fetching tracking for rideId:", rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) {
        console.error("[JoinedRideDetails] Ride not found in state for rideId:", rideId);
        setError(`Ride ${rideId} not found. Please refresh the page.`);
        return;
      }

      const trackingData = await clientApiService.tracking.getTrackingPosition(ride._id); // Fixed API call
      console.log("[JoinedRideDetails] Tracking data fetched for ride", rideId, ":", trackingData);

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

      const updatedRide: Ride = {
        ...ride,
        currentPosition,
        passengers: ride.passengers.map((p) => ({
          ...p,
          pickedUp: pickupActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
          droppedOff: dropoffActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
        })),
      };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));
      console.log("[JoinedRideDetails] Updated ride in state:", updatedRide);

      const mapContainer = mapContainerRefs.current[rideId];
      if (mapContainer && leafletLoaded && currentPosition) {
        if (!mapRefs.current[rideId]) {
          initializeMap(updatedRide, mapContainer);
        }
        if (!vehicleMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId] = leafletLoaded!.marker(currentPosition, {
            icon: leafletLoaded!.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(mapRefs.current[rideId]!).bindPopup("Vehicle");
          console.log("[JoinedRideDetails] Vehicle marker created at:", currentPosition);
        }
        if (vehicleMarkerRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
          mapRefs.current[rideId]!.panTo(currentPosition);
          mapRefs.current[rideId]!.invalidateSize();
          console.log("[JoinedRideDetails] Vehicle marker updated to:", currentPosition);
        }
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId] && currentPosition) {
        const routeData = JSON.parse(updatedRide.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        startSimulation(rideId, coordinates, updatedRide.distanceKm, currentPosition, trackingStatus, pickupActions, dropoffActions);
      }
    } catch (error: any) {
      console.error("[JoinedRideDetails] Error fetching tracking:", error);
      if (retries < maxRetries) {
        console.log(`[JoinedRideDetails] Retry ${retries + 1}/${maxRetries} for ride ${rideId}`);
        setTimeout(() => fetchTrackingAndStartSimulation(rideId, retries + 1, maxRetries), 5000);
      } else {
        setError(`Failed to fetch tracking data for ride ${rideId} after ${maxRetries} attempts: ${error.message}`);
      }
    }
  };

  const startSimulation = (
    rideId: string,
    coordinates: [number, number][],
    distanceKm: number,
    startPosition: [number, number],
    trackingStatus: "Started" | "Paused" | "Completed",
    pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[],
    dropoffActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[]
  ) => {
    if (animationIntervals.current[rideId] || !mapRefs.current[rideId] || !vehicleMarkerRefs.current[rideId]) {
      console.log("[JoinedRideDetails] Simulation aborted: Interval exists, map unavailable, or marker missing for", rideId);
      return;
    }

    if (coordinates.length < 2) {
      setError("Simulation failed: Insufficient route data");
      return;
    }

    const stepDuration = 1000;
    if (!lastIndex.current[rideId]) {
      lastIndex.current[rideId] = findNearestIndex(coordinates, startPosition);
      if (lastIndex.current[rideId] === -1) lastIndex.current[rideId] = 0;
    }
    let currentIndex = lastIndex.current[rideId];

    animationIntervals.current[rideId] = setInterval(async () => {
      try {
        const ride = rides.find((r) => r._id === rideId);
        if (!ride) {
          console.warn("[JoinedRideDetails] Ride not found, stopping simulation for", rideId);
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          return;
        }

        const trackingData = await clientApiService.tracking.getTrackingPosition(ride._id); // Fixed API call
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

        if (status === "Completed") {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          setRides((prev) => prev.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r)));
          console.log("[JoinedRideDetails] Simulation completed for", rideId);
          return;
        }

        if (status === "Paused" || updatedPickupActions.some((a) => a.status === "Pending") || updatedDropoffActions.some((a) => a.status === "Pending")) {
          if (currentPosition && vehicleMarkerRefs.current[rideId]) {
            vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
            lastPositions.current[rideId] = currentPosition;
            mapRefs.current[rideId]!.panTo(currentPosition);
            console.log("[JoinedRideDetails] Simulation paused at:", currentPosition, "for ride", rideId);
          }
          return;
        }

        currentIndex++;
        lastIndex.current[rideId] = currentIndex;
        if (currentIndex >= coordinates.length) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          setRides((prev) => prev.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r)));
          console.log("[JoinedRideDetails] Simulation completed for", rideId);
          return;
        }

        const newPosition = coordinates[currentIndex];
        vehicleMarkerRefs.current[rideId]!.setLatLng(newPosition);
        lastPositions.current[rideId] = newPosition;
        mapRefs.current[rideId]!.panTo(newPosition);
        console.log("[JoinedRideDetails] Simulation moved to:", newPosition, "for ride", rideId);

        setRides((prev) => prev.map((r) => (r._id === rideId ? {
          ...r,
          currentPosition: newPosition,
          passengers: r.passengers.map((p) => ({
            ...p,
            pickedUp: updatedPickupActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
            droppedOff: updatedDropoffActions.find((a) => a.passengerId === p.passengerId)?.status === "Completed",
          })),
        } : r)));
      } catch (error: any) {
        console.error("[JoinedRideDetails] Simulation error for", rideId, ":", error);
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
      console.error("[JoinedRideDetails] Invalid coordinates for Haversine:", { coord1, coord2 });
      return Infinity;
    }
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
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

  const toggleCollapsible = (rideId: string) => {
    if (openCollapsible === rideId) {
      cleanupMap(rideId);
      setOpenCollapsible(null);
    } else {
      setOpenCollapsible(rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (ride && ride.status === "Started") {
        fetchTrackingAndStartSimulation(rideId);
      }
    }
  };

  const handleCancelRide = async (rideId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to cancel this ride? This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, cancel it!",
      cancelButtonText: "No, keep it",
    });

    if (result.isConfirmed) {
      try {
        await clientApiService.ride.cancelJoinedRide(rideId); // Fixed API call
        setRides((prev) =>
          prev.map((ride) =>
            ride.rideId === rideId ? { ...ride, status: "Cancelled", requestStatus: "rejected" } : ride
          )
        );
        Swal.fire("Cancelled!", "Your ride request has been cancelled successfully.", "success");
      } catch (error: any) {
        console.error("[JoinedRideDetails] Error cancelling ride:", error);
        setError(`Failed to cancel ride: ${error.message || "Unknown error"}`);
        Swal.fire("Error!", `Failed to cancel ride: ${error.message || "Unknown error"}`, "error");
      }
    }
  };

  const handleChatWithDriver = (rideId: string, driverId: string) => {
    router.push(`/user/chat?rideId=${rideId}&driverId=${driverId}`);
  };

  useEffect(() => {
    if (!openCollapsible || !leafletLoaded || !leafletLoaded.map) return;

    const ride = rides.find((r) => r._id === openCollapsible);
    if (ride && mapContainerRefs.current[ride._id]) {
      initializeMap(ride, mapContainerRefs.current[ride._id]!);
    }
  }, [openCollapsible, rides, initializeMap, leafletLoaded]);

  return (
    <MainLayout activeItem="Joined Rides">
      <div className="mx-auto max-w-5xl p-6">
        <Card className="bg-gray-50 border border-gray-200 shadow-sm rounded-xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-800">Your Joined Rides</CardTitle>
                <CardDescription className="text-gray-500 mt-1">{currentDate}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && <ErrorAlert message={error} />}
            {isLoading ? (
              <p className="text-gray-600 text-sm">Loading your rides...</p>
            ) : rides.length === 0 ? (
              <p className="text-gray-600 text-sm">You haven't joined any rides yet.</p>
            ) : (
              <div className="grid gap-6">
                {rides.map((ride) => {
                  const seatsLeft = ride.passengerCount - ride.passengers.length;
                  const userPickup = ride.pickupPoints.find((p) => p.passengerId === userId);
                  const userDropoff = ride.dropoffPoints.find((p) => p.passengerId === userId);
                  const isUserPassenger = ride.passengers.some((p) => p.passengerId === userId);

                  return (
                    <Card key={ride._id} className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">
                              {ride.startPlaceName} to {ride.endPlaceName}
                            </h3>
                            <div className="mt-2 space-y-1.5 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Date:</span>{" "}
                                {ride.date !== "N/A" ? new Date(ride.date).toLocaleDateString("en-GB") : "N/A"}
                                {ride.time && ride.time !== "N/A" && (
                                  <>
                                    {" | "}
                                    <span className="font-medium">Time:</span> {ride.time}
                                  </>
                                )}
                              </p>
                              <p>
                                <span className="font-medium">Status:</span>{" "}
                                <span
                                  className={`${
                                    ride.status === "Pending"
                                      ? "text-amber-600"
                                      : ride.status === "Started"
                                      ? "text-blue-600"
                                      : ride.status === "Cancelled"
                                      ? "text-red-600"
                                      : "text-green-600"
                                  } font-medium`}
                                >
                                  {ride.status}
                                  {ride.status === "Started" && " (Tracking Live)"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Request Status:</span>{" "}
                                <span
                                  className={`font-medium ${
                                    ride.requestStatus === "pending"
                                      ? "text-yellow-600"
                                      : ride.requestStatus === "rejected"
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {ride.requestStatus === "pending"
                                    ? "Pending Approval"
                                    : ride.requestStatus === "rejected"
                                    ? "Rejected"
                                    : "Accepted"}
                                </span>
                              </p>
                              {isUserPassenger && (
                                <p>
                                  <span className="font-medium">Your Cost:</span>{" "}
                                  {(ride.costPerPerson ?? 0).toFixed(2)} INR
                                </p>
                              )}
                              {isUserPassenger && (
                                <p>
                                  <span className="font-medium">Payment:</span>{" "}
                                  <span
                                    className={`${
                                      ride.paymentStatus === "Paid" ? "text-green-600" : "text-red-600"
                                    } font-medium`}
                                  >
                                    {ride.paymentStatus}
                                  </span>
                                </p>
                              )}
                              <p>
                                <span className="font-medium">Driver:</span> {ride.driverName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-gray-300 text-gray-700 hover:bg-green-100"
                              onClick={() => handleChatWithDriver(ride._id, ride.driverId)}
                              disabled={!ride.driverId || ride.driverId === "N/A" || ride.requestStatus !== "accepted"}
                            >
                              <Phone className="h-4 w-4 mr-1" /> Chat with Driver
                            </Button>
                            {ride.status === "Pending" && (ride.requestStatus === "pending" || ride.requestStatus === "accepted") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleCancelRide(ride.rideId!)}
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel {ride.requestStatus === "pending" ? "Request" : "Ride"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <Collapsible
                          open={openCollapsible === ride._id}
                          onOpenChange={() => toggleCollapsible(ride._id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                            >
                              {openCollapsible === ride._id ? "Hide Details" : "Show Details"}
                              {openCollapsible === ride._id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <Separator className="mb-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-md font-medium text-gray-700 mb-2">
                                  Your Ride Details
                                </h4>
                                {ride.requestStatus !== "rejected" && (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Your Pickup:</span>{" "}
                                      {userPickup
                                        ? `${userPickup.placeName}`
                                        : "Not assigned (Contact support)"}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Your Drop-off:</span>{" "}
                                      {userDropoff
                                        ? `${userDropoff.placeName}`
                                        : "Not assigned (Contact support)"}
                                    </p>
                                  </>
                                )}
                                {ride.requestStatus === "rejected" && (
                                  <p className="text-sm text-red-600">
                                    Request was rejected by the driver.
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Distance:</span>{" "}
                                  {(ride.distanceKm ?? 0).toFixed(2)} km
                                </p>
                                {ride.requestStatus === "accepted" && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Seats Available:</span> {seatsLeft}
                                  </p>
                                )}
                              </div>
                              <div>
                                <h4 className="text-md font-medium text-gray-700 mb-2">Route Map</h4>
                                <div
                                  id={`map-${ride._id}`}
                                  className="h-64 w-full rounded-lg border border-gray-200"
                                  ref={(el) => {
                                    mapContainerRefs.current[ride._id] = el;
                                  }}
                                />
                              </div>
                            </div>
                            <div className="mt-4">
                              <h4 className="text-md font-medium text-gray-700 mb-2">Other Passengers</h4>
                              {ride.requestStatus === "accepted" && ride.passengers.length > 1 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                                  {ride.passengers
                                    .filter((p) => p.passengerId !== userId)
                                    .map((passenger, index) => {
                                      const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                                      const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                                      return (
                                        <li key={index}>
                                          <span className="font-medium">Passenger {index + 1}:</span> {passenger.passengerName} <br />
                                          <span className="font-medium">Pickup:</span>{" "}
                                          {pickup ? pickup.placeName : "Not assigned"} <br />
                                          <span className="font-medium">Drop-off:</span>{" "}
                                          {dropoff ? dropoff.placeName : "Not assigned"} <br />
                                          <span className="font-medium">Picked Up:</span>{" "}
                                          {passenger.pickedUp ? "Yes" : "No"} <br />
                                          <span className="font-medium">Dropped Off:</span>{" "}
                                          {passenger.droppedOff ? "Yes" : "No"}
                                        </li>
                                      );
                                    })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-600">No other passengers.</p>
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
    </MainLayout>
  );
}