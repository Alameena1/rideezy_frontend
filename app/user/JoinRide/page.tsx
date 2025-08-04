"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
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
  passengers: { passengerId: string; passengerName: string }[];
  pickupPoints: { passengerId: string; location: string; placename: string }[];
  dropoffPoints: { passengerId: string; location: string; placename: string }[];
  pickupPlacenames: string[];
  dropoffPlacenames: string[];
  status: "Pending" | "Started" | "Completed";
  routeGeometry: string;
  paymentStatus: "Paid" | "Pending";
  currentPosition?: [number, number] | null;
}

interface TrackingData {
  currentPosition: [number, number] | null;
  status: "Started" | "Paused" | "Stopped";
  pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[];
}

export default function JoinedRideDetails() {
  const { user, isAuthenticated } = useAuth();
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

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((module) => {
        setLeafletLoaded(module.default);
      }).catch((err) => {
        console.error("Failed to load Leaflet:", err);
        setError("Failed to load map library. Please try again.");
      });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchJoinedRides();
    }
  }, [userId, isAuthenticated]);

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await response.json();
      return data.display_name || `${lat},${lon}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat},${lon}`;
    }
  };

  const fetchJoinedRides = async () => {
    setIsLoading(true);
    try {
      console.log(`[${new Date().toISOString()}] Fetching joined rides with userId: ${userId}`);
      const joinedRidesData = await apiService.ride.getJoinedRides();
      const fetchedRides = Array.isArray(joinedRidesData.data) ? joinedRidesData.data : [];
      console.log(`[${new Date().toISOString()}] Raw fetched rides:`, fetchedRides);

      const mappedRides: Ride[] = await Promise.all(
        fetchedRides.map(async (ride: any) => {
          let updatedPickupPoints = ride.pickupPoints || [];
          let updatedDropoffPoints = ride.dropoffPoints || [];

          updatedPickupPoints = await Promise.all(
            updatedPickupPoints.map(async (point: any) => {
              if (!point.placename || point.placename === point.location) {
                const [lat, lon] = point.location.split(",").map(Number);
                if (isNaN(lat) || isNaN(lon)) {
                  console.error(`[${new Date().toISOString()}] Invalid pickup location for ride ${ride.rideId}: ${point.location}`);
                  return { ...point, placename: "Unknown Location" };
                }
                const placename = await reverseGeocode(lat, lon);
                return { ...point, placename };
              }
              return point;
            })
          );

          updatedDropoffPoints = await Promise.all(
            updatedDropoffPoints.map(async (point: any) => {
              if (!point.placename || point.placename === point.location) {
                const [lat, lon] = point.location.split(",").map(Number);
                if (isNaN(lat) || isNaN(lon)) {
                  console.error(`[${new Date().toISOString()}] Invalid dropoff location for ride ${ride.rideId}: ${point.location}`);
                  return { ...point, placename: "Unknown Location" };
                }
                const placename = await reverseGeocode(lat, lon);
                return { ...point, placename };
              }
              return point;
            })
          );

          const pickupPlacenames = updatedPickupPoints.map((point: any) => point.placename);
          const dropoffPlacenames = updatedDropoffPoints.map((point: any) => point.placename);

          return {
            _id: ride._id.toString(),
            rideId: ride.rideId || "N/A",
            driverId: ride.driverId || "N/A",
            driverName: ride.driverName || "Unknown Driver",
            vehicleId: ride.vehicleId || "N/A",
            date: ride.date || "N/A",
            time: ride.time || "N/A",
            startPoint: ride.startPoint || "N/A",
            startPlaceName: ride.startPlaceName || "Unknown Start Location",
            endPoint: ride.endPoint || "N/A",
            endPlaceName: ride.endPlaceName || "Unknown End Location",
            distanceKm: ride.distanceKm || 0,
            passengerCount: ride.passengerCount || 0,
            costPerPerson: ride.costPerPerson || 0,
            totalPeople: ride.totalPeople || 0,
            passengers: ride.passengers || [],
            pickupPoints: updatedPickupPoints,
            dropoffPoints: updatedDropoffPoints,
            pickupPlacenames,
            dropoffPlacenames,
            status: ride.status || "Pending",
            routeGeometry: ride.routeGeometry || "",
            paymentStatus: ride.paymentStatus || "Pending",
            currentPosition: ride.currentPosition || null,
          };
        })
      );

      setRides(mappedRides);

      for (const ride of mappedRides) {
        if (ride.status === "Started") {
          fetchTrackingAndStartSimulation(ride._id);
        }
      }

      mappedRides.forEach(ride => {
        const userPickup = ride.pickupPoints.find(p => p.passengerId === userId);
        const userDropoff = ride.dropoffPoints.find(p => p.passengerId === userId);
        if (!userPickup || !userDropoff) {
          console.warn(`[${new Date().toISOString()}] Missing user pickup/dropoff for ride ${ride._id} - User ID: ${userId}`);
        }
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching joined rides:`, error);
      setError("Failed to fetch joined rides. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (time === "N/A") return time;
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDateInIST = (dateString: string) => {
    if (dateString === "N/A") return dateString;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
    if (mapRefs.current[ride._id] || !leafletLoaded || !leafletLoaded.map) {
      console.log(`[JoinedRideDetails] Map initialization skipped or already exists for ride ${ride._id}`);
      return;
    }

    console.log(`[JoinedRideDetails] Initializing map for ride ${ride._id}`);
    const map = leafletLoaded.map(mapContainer, { zoomControl: true }).setView([0, 0], 8);
    leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRefs.current[ride._id] = map;

    try {
      const routeData = JSON.parse(ride.routeGeometry);
      if (routeData.type === "LineString" && routeData.coordinates) {
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { color: "#6b7280", weight: 5 }).addTo(map);

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
            console.error(`[JoinedRideDetails] Invalid pickup location for passenger ${passenger.passengerId}: ${pickup.location}`);
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
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Pickup: ${pickup.placename}`);
        }).filter((marker): marker is L.Marker => marker !== null);

        dropoffMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
          const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
          if (!dropoff) return null;

          const [lat, lng] = dropoff.location.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`[JoinedRideDetails] Invalid drop-off location for passenger ${passenger.passengerId}: ${dropoff.location}`);
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
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Drop-off: ${dropoff.placename}`);
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
        console.log(`[JoinedRideDetails] Map initialized for ride ${ride._id}`);
      } else {
        console.error(`[JoinedRideDetails] Invalid route geometry for ride ${ride._id}:`, routeData);
        setError("Failed to render route map. Invalid route data.");
      }
    } catch (error) {
      console.error(`[JoinedRideDetails] Error parsing route geometry for ride ${ride._id}:`, error);
      setError("Failed to render route map. Invalid route data.");
    }
  }, [leafletLoaded, userId]);

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
    vehicleMarkerRefs.current[rideId]?.remove();
    vehicleMarkerRefs.current[rideId] = null;
    mapContainerRefs.current[rideId] = null;
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    lastPositions.current[rideId] = null;
    console.log(`[JoinedRideDetails] Map cleaned up for ride ${rideId}`);
  }, []);

  const fetchTrackingAndStartSimulation = async (rideId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) throw new Error("Ride not found in state");

      const trackingData = await apiService.tracking.getTrackingPosition(ride._id);
      console.log(`[JoinedRideDetails] Tracking data fetched for ride ${rideId}:`, trackingData);

      let currentPosition: [number, number] | null = null;
      let trackingStatus: "Started" | "Paused" | "Stopped" = "Started";
      let pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[] = [];

      if (trackingData.success && trackingData.data) {
        if (Array.isArray(trackingData.data.currentPosition) && trackingData.data.currentPosition.length === 2) {
          currentPosition = [trackingData.data.currentPosition[0], trackingData.data.currentPosition[1]] as [number, number];
        }
        trackingStatus = trackingData.data.status || "Started";
        pickupActions = trackingData.data.pickupActions || [];
      } else {
        console.warn(`[JoinedRideDetails] Invalid tracking data format for ride ${rideId}, using null`);
      }

      const updatedRide: Ride = { ...ride, currentPosition };
      setRides((prev) => prev.map((r) => (r._id === rideId ? updatedRide : r)));

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
        }
        if (vehicleMarkerRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
          mapRefs.current[rideId]!.panTo(currentPosition);
          mapRefs.current[rideId]!.invalidateSize();
          console.log(`[JoinedRideDetails] Vehicle marker updated to:`, currentPosition);
        }
      }

      if (mapRefs.current[rideId] && vehicleMarkerRefs.current[rideId] && currentPosition) {
        const routeData = JSON.parse(updatedRide.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        startSimulation(rideId, coordinates, updatedRide.distanceKm, currentPosition, trackingStatus, pickupActions);
      }
    } catch (error: any) {
      console.error(`[JoinedRideDetails] Error fetching tracking for ride ${rideId}:`, error);
      setError(`Failed to fetch tracking data: ${error.message}`);
    }
  };

  const startSimulation = (
    rideId: string,
    coordinates: [number, number][],
    distanceKm: number,
    startPosition: [number, number],
    trackingStatus: "Started" | "Paused" | "Stopped",
    pickupActions: { passengerId: string; location: string; status: "Pending" | "Completed" }[]
  ) => {
    if (animationIntervals.current[rideId] || !mapRefs.current[rideId] || !vehicleMarkerRefs.current[rideId]) {
      console.log(`[JoinedRideDetails] Simulation aborted for ride ${rideId}: Interval exists, map unavailable, or marker missing`);
      return;
    }

    if (coordinates.length < 2) {
      setError("Simulation failed: Insufficient route data");
      return;
    }

    const stepDuration = 1000; // 1 second per step
    let currentIndex = findNearestIndex(coordinates, startPosition);
    if (currentIndex === -1) currentIndex = 0;

    const checkTrackingStatus = async () => {
      try {
        const trackingData = await apiService.tracking.getTrackingPosition(rideId);
        if (trackingData.success && trackingData.data) {
          const newPosition = Array.isArray(trackingData.data.currentPosition) && trackingData.data.currentPosition.length === 2
            ? [trackingData.data.currentPosition[0], trackingData.data.currentPosition[1]] as [number, number]
            : null;
          const newStatus = trackingData.data.status || "Started";
          const newPickupActions = trackingData.data.pickupActions || [];

          setRides((prev) => prev.map((r) => (r._id === rideId ? { ...r, currentPosition: newPosition } : r)));
          return { status: newStatus, pickupActions: newPickupActions, currentPosition: newPosition };
        }
        return { status: trackingStatus, pickupActions, currentPosition: startPosition };
      } catch (error) {
        console.error(`[JoinedRideDetails] Error checking tracking status for ride ${rideId}:`, error);
        return { status: trackingStatus, pickupActions, currentPosition: startPosition };
      }
    };

    animationIntervals.current[rideId] = setInterval(async () => {
      try {
        const ride = rides.find((r) => r._id === rideId);
        if (!ride) {
          console.warn(`[JoinedRideDetails] Ride not found, stopping simulation for ${rideId}`);
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          return;
        }

        const { status, pickupActions: updatedPickupActions, currentPosition: updatedPosition } = await checkTrackingStatus();

        if (status === "Stopped" || status === "Paused") {
          if (vehicleMarkerRefs.current[rideId] && updatedPosition) {
            vehicleMarkerRefs.current[rideId]!.setLatLng(updatedPosition);
            lastPositions.current[rideId] = updatedPosition;
            mapRefs.current[rideId]!.panTo(updatedPosition);
          }
          console.log(`[JoinedRideDetails] Simulation paused for ride ${rideId} due to status: ${status}`);
          return;
        }

        const pendingPickups = updatedPickupActions.filter((action) => action.status === "Pending");
        if (pendingPickups.length > 0) {
          const nearestPickup = pendingPickups[0];
          const [pickupLat, pickupLng] = nearestPickup.location.split(",").map(Number);
          if (isNaN(pickupLat) || isNaN(pickupLng)) {
            console.error(`[JoinedRideDetails] Invalid pickup location for ride ${rideId}: ${nearestPickup.location}`);
            return;
          }

          const distance = calculateHaversineDistance(updatedPosition || coordinates[currentIndex], [pickupLat, pickupLng]);
          if (distance < 0.1) { // 0.1 km threshold
            console.log(`[JoinedRideDetails] Near pickup for ride ${rideId}, distance: ${distance} km`);
            return; // Pause simulation
          }
        }

        currentIndex++;
        if (currentIndex >= coordinates.length) {
          clearInterval(animationIntervals.current[rideId]!);
          animationIntervals.current[rideId] = null;
          const updatedRides = rides.map((r) => (r._id === rideId ? { ...r, status: "Completed" } : r));
          setRides(updatedRides);
          console.log(`[JoinedRideDetails] Simulation completed for ride ${rideId}`);
          return;
        }

        const currentPosition = coordinates[currentIndex];
        vehicleMarkerRefs.current[rideId]!.setLatLng(currentPosition);
        lastPositions.current[rideId] = currentPosition;
        mapRefs.current[rideId]!.panTo(currentPosition);
      } catch (error) {
        console.error(`[JoinedRideDetails] Simulation error for ride ${rideId}:`, error);
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
        console.log(`[JoinedRideDetails] Attempting to cancel ride with rideId: ${rideId}`);
        await apiService.ride.cancelJoinedRide(rideId);
        setRides(rides.filter(ride => ride.rideId !== rideId));
        Swal.fire("Cancelled!", "Your ride has been cancelled successfully.", "success");
      } catch (error: any) {
        console.error(`[JoinedRideDetails] Error cancelling ride with rideId ${rideId}:`, error.message || error);
        setError(`Failed to cancel ride: ${error.message || 'Unknown error'}. Please try again or contact support.`);
        Swal.fire("Error!", `Failed to cancel ride: ${error.message || 'Unknown error'}. Please try again or contact support.`, "error");
      }
    }
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
                  const seatsLeft = (ride.totalPeople - 1) - ride.passengerCount;
                  const userPickup = ride.pickupPoints.find(p => p.passengerId === userId);
                  const userDropoff = ride.dropoffPoints.find(p => p.passengerId === userId);
                  console.log(`[JoinedRideDetails] Ride ${ride._id} - User Pickup:`, userPickup, "User Dropoff:", userDropoff);

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
                                {formatDateInIST(ride.date)}
                                {ride.time && ride.time !== "N/A" && (
                                  <>
                                    {" | "}
                                    <span className="font-medium">Time:</span> {formatTime(ride.time)}
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
                                      : "text-green-600"
                                  } font-medium`}
                                >
                                  {ride.status}
                                  {ride.status === "Started" && " (Tracking Live)"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium">Your Cost:</span>{" "}
                                {(ride.costPerPerson ?? 0).toFixed(2)} INR
                              </p>
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
                              <p>
                                <span className="font-medium">Driver:</span> {ride.driverName}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-100"
                              onClick={() => alert("Contacting driver...")}
                            >
                              <Phone className="h-4 w-4 mr-1" /> Contact
                            </Button>
                            {ride.status === "Pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleCancelRide(ride.rideId)}
                              >
                                <X className="h-4 w-4 mr-1" /> Cancel
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
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Your Pickup:</span>{" "}
                                  {userPickup
                                    ? `${userPickup.placename} (${userPickup.location})`
                                    : "Not assigned (Contact support)"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Your Drop-off:</span>{" "}
                                  {userDropoff
                                    ? `${userDropoff.placename} (${userDropoff.location})`
                                    : "Not assigned (Contact support)"}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Distance:</span>{" "}
                                  {(ride.distanceKm ?? 0).toFixed(2)} km
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Seats Available:</span> {seatsLeft}
                                </p>
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
                              {ride.passengers.length > 1 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                                  {ride.passengers
                                    .filter(p => p.passengerId !== userId)
                                    .map((passenger, index) => {
                                      const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
                                      const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
                                      return (
                                        <li key={index}>
                                          <span className="font-medium">Passenger {index + 1}:</span> {passenger.passengerName} <br />
                                          <span className="font-medium">Pickup:</span>{" "}
                                          {pickup ? pickup.placename : "Not assigned"} <br />
                                          <span className="font-medium">Drop-off:</span>{" "}
                                          {dropoff ? dropoff.placename : "Not assigned"}
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