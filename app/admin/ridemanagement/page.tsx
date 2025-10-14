"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { adminClientApiService } from "@/services/client/adminClientApi";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ArrowUpDown } from "lucide-react";

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

interface PaginatedResponse {
  success: boolean;
  data: Ride[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function RideManagement() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<{ [rideId: string]: PassengerDetails[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);
  const [mapErrors, setMapErrors] = useState<{ [rideId: string]: string }>({});
  const [page, setPage] = useState(1);
  const [limit] = useState(3);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((module) => {
        setLeafletLoaded(module.default);
      }).catch((err) => {
        console.error("[RideManagement] Failed to load Leaflet:", err);
        setError("Failed to load map library. Please try again.");
      });
    }
  }, []);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response: PaginatedResponse = await adminClientApiService.ride.getRides(params);
      
      const mappedRides: Ride[] = response.data.map((ride: any) => ({
        _id: ride._id.toString(),
        rideId: ride.rideId || "N/A",
        driverId: ride.driverId || "N/A",
        driverName: ride.driverName || "N/A",
        vehicleId: ride.vehicleId?.licensePlate || ride.vehicleId?._id?.toString() || "N/A",
        date: ride.date ? format(new Date(ride.date), "yyyy-MM-dd") : "N/A",
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
        createdAt: ride.createdAt ? format(new Date(ride.createdAt), "yyyy-MM-dd") : "N/A",
        passengers: ride.passengers || [],
        pickupPoints: ride.pickupPoints || [],
        dropoffPoints: ride.dropoffPoints || [],
        routeGeometry: ride.routeGeometry || "",
      }));
      
      setRides(mappedRides);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
      setHasNext(response.pagination.hasNext);
      setHasPrev(response.pagination.hasPrev);

      const newPassengerDetails = mappedRides.reduce((acc, ride) => {
        acc[ride._id] = ride.passengers.map((passenger) => {
          const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
          const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
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

  useEffect(() => {
    fetchRides();
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  const handleCancelRide = async (ride: Ride) => {
    try {
      await adminClientApiService.ride.cancelRide(ride._id);
      setRides(rides.map((r) => (r._id === ride._id ? { ...r, status: "Canceled" } : r)));
      if (expandedRows.has(ride._id)) {
        const newExpanded = new Set(expandedRows);
        newExpanded.delete(ride._id);
        setExpandedRows(newExpanded);
        cleanupMap(ride._id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel ride";
      console.error("[RideManagement] Cancel ride failed:", err);
      setError(errorMessage);
    }
  };

  const handleBlockRide = async (ride: Ride) => {
    try {
      await adminClientApiService.ride.blockRide(ride._id);
      setRides(rides.map((r) => (r._id === ride._id ? { ...r, status: "Blocked" } : r)));
      if (expandedRows.has(ride._id)) {
        const newExpanded = new Set(expandedRows);
        newExpanded.delete(ride._id);
        setExpandedRows(newExpanded);
        cleanupMap(ride._id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to block ride";
      console.error("[RideManagement] Block ride failed:", err);
      setError(errorMessage);
    }
  };

  const handleSearch = (searchValue: string) => {
    setSearch(searchValue);
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

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
    mapContainerRefs.current[rideId] = null;
    setMapErrors((prev) => {
      const { [rideId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const initializeMap = useCallback(
    (ride: Ride, mapContainer: HTMLDivElement) => {
      if (!leafletLoaded || !leafletLoaded.map) {
        setMapErrors((prev) => ({
          ...prev,
          [ride._id]: "Route map unavailable: Map library not loaded",
        }));
        return;
      }

      if (mapRefs.current[ride._id]) {
        return;
      }

      try {
        const map = leafletLoaded.map(mapContainer, { zoomControl: true }).setView([0, 0], 8);
        leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);
        mapRefs.current[ride._id] = map;

        if (!ride.routeGeometry) {
          setMapErrors((prev) => ({
            ...prev,
            [ride._id]: "Route map unavailable due to missing route data",
          }));
          return;
        }

        const routeData = JSON.parse(ride.routeGeometry);
        if (routeData.type === "LineString" && routeData.coordinates) {
          const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          
          routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { 
            color: "#3b82f6", 
            weight: 5,
            opacity: 0.7
          }).addTo(map);

          const [startLat, startLng] = coordinates[0];
          startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>Start:</strong> ${ride.startPlaceName}`);

          const [endLat, endLng] = coordinates[coordinates.length - 1];
          endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>End:</strong> ${ride.endPlaceName}`);

          pickupMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
            const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
            if (!pickup) return null;

            try {
              const [lat, lng] = pickup.location.split(",").map(Number);
              if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid pickup location for passenger ${passenger.passengerId}: ${pickup.location}`);
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
              }).addTo(map).bindPopup(
                `<strong>Passenger ${index + 1}</strong><br>${passenger.passengerName}<br>Pickup: ${pickup.placeName}${passenger.pickedUp ? " (Picked Up)" : ""}`
              );
            } catch (error) {
              console.warn(`Failed to parse pickup location for passenger ${passenger.passengerId}:`, pickup.location);
              return null;
            }
          }).filter((marker): marker is L.Marker => marker !== null);

          dropoffMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
            const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
            if (!dropoff) return null;

            try {
              const [lat, lng] = dropoff.location.split(",").map(Number);
              if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid drop-off location for passenger ${passenger.passengerId}: ${dropoff.location}`);
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
              }).addTo(map).bindPopup(
                `<strong>Passenger ${index + 1}</strong><br>${passenger.passengerName}<br>Drop-off: ${dropoff.placeName}${passenger.droppedOff ? " (Dropped Off)" : ""}`
              );
            } catch (error) {
              console.warn(`Failed to parse drop-off location for passenger ${passenger.passengerId}:`, dropoff.location);
              return null;
            }
          }).filter((marker): marker is L.Marker => marker !== null);

          const allPoints = [
            ...coordinates,
            ...pickupMarkerRefs.current[ride._id].map(marker => marker.getLatLng()),
            ...dropoffMarkerRefs.current[ride._id].map(marker => marker.getLatLng())
          ].filter(point => point !== undefined);

          if (allPoints.length > 0) {
            const group = leafletLoaded.featureGroup(allPoints);
            map.fitBounds(group.getBounds(), { padding: [20, 20] });
          } else {
            map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [20, 20] });
          }

          map.invalidateSize();
        } else {
          setMapErrors((prev) => ({
            ...prev,
            [ride._id]: "Route map unavailable due to invalid route data format",
          }));
        }
      } catch (error) {
        console.error(`Error initializing map for ride ${ride._id}:`, error);
        setMapErrors((prev) => ({
          ...prev,
          [ride._id]: "Route map unavailable due to technical error",
        }));
      }
    },
    [leafletLoaded]
  );

  const handleViewDetails = (rideId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rideId)) {
      newExpanded.delete(rideId);
      cleanupMap(rideId);
    } else {
      newExpanded.add(rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (ride) {
        setTimeout(() => {
          const mapContainer = mapContainerRefs.current[rideId];
          if (mapContainer) {
            initializeMap(ride, mapContainer);
          }
        }, 100);
      }
    }
    setExpandedRows(newExpanded);
  };

  const renderStatus = (status: string) => {
    const color =
      status === "Pending"
        ? "text-orange-400"
        : status === "Canceled"
        ? "text-red-400"
        : status === "Blocked"
        ? "text-yellow-400"
        : status === "Started"
        ? "text-green-400"
        : status === "Paused"
        ? "text-blue-400"
        : "text-green-400";
    return <span className={color}>{status}</span>;
  };

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  const truncateId = (id: string, length: number = 8): string => {
    if (id === "N/A") return id;
    return id.length > length ? `${id.substring(0, length)}...` : id;
  };

  const columns = [
    { 
      key: "rideId", 
      header: "Ride ID",
      render: (rideId: string) => <span className="font-mono text-sm text-gray-300">{truncateId(rideId)}</span>
    },
    { 
      key: "driverName", 
      header: () => (
        <Button
          variant="ghost"
          onClick={() => handleSort("driverName")}
          className="flex items-center space-x-1 p-0 hover:bg-transparent text-gray-300"
        >
          <span>Driver Name</span>
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      render: (name: string) => <span className="text-gray-300">{name}</span> 
    },
    { key: "date", header: "Date", render: (date: string) => <span className="text-gray-300">{date}</span> },
    { key: "startPlaceName", header: "Start Location", render: (location: string) => <span className="text-gray-300">{location}</span> },
    { key: "endPlaceName", header: "End Location", render: (location: string) => <span className="text-gray-300">{location}</span> },
    { 
      key: "status", 
      header: "Status",
      render: (status: string) => renderStatus(status)
    },
  ];

  const renderActions = (ride: Ride) => (
    <div className="flex space-x-2">
      {ride.status === "Pending" && (
        <>
          <Button
            onClick={() => handleCancelRide(ride)}
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Cancel Ride
          </Button>
          <Button
            onClick={() => handleBlockRide(ride)}
            variant="outline"
            size="sm"
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
          >
            Block Ride
          </Button>
        </>
      )}
      <Button
        onClick={() => handleViewDetails(ride._id)}
        variant="outline"
        size="sm"
        className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
      >
        {expandedRows.has(ride._id) ? "Hide Details" : "View Details"}
      </Button>
    </div>
  );

  const renderExpandableContent = (ride: Ride) => {
    const passengersForRide = passengerDetails[ride._id] || [];

    return (
      <div className="space-y-6 p-4 bg-gray-800 rounded-lg">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="passengers" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              Passengers
            </TabsTrigger>
            <TabsTrigger value="route" className="text-gray-300 data-[state=active]:bg-gray-600 data-[state=active]:text-white">
              Route Map
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gray-750 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200">Ride Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Ride ID:</span>
                    <span className="text-sm font-medium text-gray-300">{ride.rideId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Driver:</span>
                    <span className="text-sm font-medium text-gray-300">{ride.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Vehicle:</span>
                    <span className="text-sm font-medium text-gray-300">{ride.vehicleId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Date & Time:</span>
                    <span className="text-sm font-medium text-gray-300">{ride.date} at {ride.time}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-750 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200">Route Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Start:</span>
                    <span className="text-sm font-medium text-gray-300 text-right">{ride.startPlaceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">End:</span>
                    <span className="text-sm font-medium text-gray-300 text-right">{ride.endPlaceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Distance:</span>
                    <span className="text-sm font-medium text-gray-300">{formatNumber(ride.distanceKm)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Passengers:</span>
                    <span className="text-sm font-medium text-gray-300">{ride.passengerCount} / {ride.totalPeople}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-750 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-200">Financials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Fuel Price:</span>
                    <span className="text-sm font-medium text-gray-300">${formatNumber(ride.fuelPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Total Fuel Cost:</span>
                    <span className="text-sm font-medium text-gray-300">${formatNumber(ride.totalFuelCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Cost Per Person:</span>
                    <span className="text-sm font-medium text-gray-300">${formatNumber(ride.costPerPerson)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Status:</span>
                    <Badge variant={
                      ride.status === "Started" ? "default" :
                      ride.status === "Completed" ? "success" :
                      ride.status === "Pending" ? "secondary" :
                      ride.status === "Canceled" ? "destructive" :
                      "outline"
                    } className="bg-gray-600 text-gray-300">
                      {ride.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="passengers" className="space-y-4">
            <Card className="bg-gray-750 border-gray-600">
              <CardHeader>
                <CardTitle className="text-gray-200">Passenger Details</CardTitle>
                <CardDescription className="text-gray-400">
                  {passengersForRide.length} passenger(s) on this ride
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passengersForRide.length > 0 ? (
                  <div className="space-y-4">
                    {passengersForRide.map((passenger, index) => (
                      <Card key={passenger.id} className="p-4 bg-gray-700 border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-200">{passenger.name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={passenger.pickedUp ? "default" : "secondary"} className="bg-gray-600 text-gray-300">
                                  {passenger.pickedUp ? "Picked Up" : "Awaiting Pickup"}
                                </Badge>
                                <Badge variant={passenger.droppedOff ? "success" : "outline"} className="bg-gray-600 text-gray-300">
                                  {passenger.droppedOff ? "Dropped Off" : "In Transit"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="my-3 bg-gray-600" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-400">Pickup Location</p>
                            <p className="mt-1 text-gray-300">{passenger.pickupPlaceName}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-400">Drop-off Location</p>
                            <p className="mt-1 text-gray-300">{passenger.dropoffPlaceName}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No passengers assigned to this ride.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="route" className="space-y-4">
            <Card className="bg-gray-750 border-gray-600">
              <CardHeader>
                <CardTitle className="text-gray-200">Route Map</CardTitle>
                <CardDescription className="text-gray-400">
                  Route visualization with pickup and drop-off points
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mapErrors[ride._id] ? (
                  <div className="p-6 text-center border-2 border-dashed border-gray-600 rounded-lg">
                    <p className="text-gray-400">{mapErrors[ride._id]}</p>
                  </div>
                ) : (
                  <div
                    id={`map-${ride._id}`}
                    className="h-96 w-full rounded-lg border border-gray-600 bg-gray-700"
                    ref={(el) => {
                      mapContainerRefs.current[ride._id] = el;
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Ride Management</h1>
            <p className="text-gray-400">Manage and monitor all rides in the system</p>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search rides by driver name or location..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-600 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 text-white">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Started">Started</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
      
<DataTable
  columns={columns}
  data={rides}
  loading={loading}
  error={error}
  pagination={{
    currentPage: page,
    totalPages,
    totalItems,
    hasNext,
    hasPrev,
  }}
  onPageChange={setPage} // ← ADD THIS
  emptyMessage="No rides found."
  actions={renderActions}
  expandableContent={renderExpandableContent}
  expandedRows={expandedRows}
/>
      </div>
    </div>
  );
}