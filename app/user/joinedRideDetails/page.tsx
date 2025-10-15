"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";
import { clientApiService, useApiInterceptors } from "@/services/client/client-api";
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
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  X, 
  MapPin, 
  Calendar,
  Clock,
  Users,
  Car,
  Navigation,
  DollarSign,
  Shield,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function JoinedRideDetails() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);
  const [trackingIntervals, setTrackingIntervals] = useState<{ [key: string]: NodeJS.Timeout }>({});
  
  // Pagination and Search states
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(3); 

  const userId = user?._id || "default_user_id";

  useApiInterceptors();

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const vehicleMarkers = useRef<{ [key: string]: L.Marker | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet")
        .then((module) => {
          setLeafletLoaded(module.default);
        })
        .catch((err) => {
          console.error("Failed to load Leaflet:", err);
          setError("Failed to load map library. Please try again.");
        });
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchJoinedRides(1, itemsPerPage, debouncedSearch);
    }
  }, [userId, isAuthenticated, debouncedSearch, itemsPerPage]);

  useEffect(() => {
    // Start tracking for all started rides
    rides.forEach(ride => {
      if (ride.status === "Started" && expandedRide === ride._id) {
        startTracking(ride._id);
      }
    });

    // Cleanup function to stop tracking when component unmounts or ride is no longer expanded
    return () => {
      Object.values(trackingIntervals).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [rides, expandedRide]);

  const fetchJoinedRides = async (page: number = 1, limit: number = itemsPerPage, search: string = "") => {
    setIsLoading(true);
    try {
      // Update API service to accept pagination and search parameters
      const joinedRidesData = await clientApiService.ride.getJoinedRides({
        page,
        limit,
        search
      });

      // Handle both old and new response formats
      let fetchedRides: any[] = [];
      let paginationData: PaginationInfo = {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };

      if (joinedRidesData.data && Array.isArray(joinedRidesData.data)) {
        // Old format - direct array
        fetchedRides = joinedRidesData.data;
        paginationData = {
          currentPage: 1,
          totalPages: 1,
          totalCount: fetchedRides.length,
          hasNextPage: false,
          hasPrevPage: false,
        };
      } else if (joinedRidesData.data && joinedRidesData.data.rides) {
        // New format - with pagination
        fetchedRides = joinedRidesData.data.rides || [];
        paginationData = joinedRidesData.data.pagination || paginationData;
      } else {
        // Fallback
        fetchedRides = Array.isArray(joinedRidesData) ? joinedRidesData : [];
      }

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
        currentPosition: ride.currentPosition || null,
        requestStatus: ride.requestStatus || (ride.passengers.some((p: any) => p.passengerId === userId) ? "accepted" : "pending"),
      }));

      setRides(mappedRides);
      setPagination(paginationData);
    } catch (error: any) {
      console.error("Error fetching joined rides:", error);
      setError("Failed to fetch joined rides. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentPosition = async (rideId: string): Promise<[number, number] | null> => {
    try {
      const response = await clientApiService.tracking.getTrackingPosition(rideId);
      if (response.success && response.data && Array.isArray(response.data) && response.data.length === 2) {
        return response.data as [number, number];
      }
      return null;
    } catch (error) {
      console.error("Error fetching current position:", error);
      return null;
    }
  };

  const startTracking = async (rideId: string) => {
    // Clear existing interval if any
    if (trackingIntervals[rideId]) {
      clearInterval(trackingIntervals[rideId]);
    }

    // Initial position fetch
    await updateVehiclePosition(rideId);

    // Set up interval for continuous tracking (every 5 seconds for real-time feel)
    const interval = setInterval(() => {
      updateVehiclePosition(rideId);
    }, 5000);

    setTrackingIntervals(prev => ({
      ...prev,
      [rideId]: interval
    }));
  };

  const stopTracking = (rideId: string) => {
    if (trackingIntervals[rideId]) {
      clearInterval(trackingIntervals[rideId]);
      setTrackingIntervals(prev => {
        const newIntervals = { ...prev };
        delete newIntervals[rideId];
        return newIntervals;
      });
    }
  };

  const updateVehiclePosition = async (rideId: string) => {
    const currentPosition = await fetchCurrentPosition(rideId);
    if (currentPosition && mapRefs.current[rideId] && leafletLoaded) {
      // Update ride state with current position
      setRides(prev => prev.map(ride => 
        ride._id === rideId ? { ...ride, currentPosition } : ride
      ));

      // Update or create vehicle marker
      if (!vehicleMarkers.current[rideId]) {
        vehicleMarkers.current[rideId] = leafletLoaded.marker(currentPosition, {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          }),
          zIndexOffset: 1000
        }).addTo(mapRefs.current[rideId]!).bindPopup("Live Vehicle Position");
      } else {
        vehicleMarkers.current[rideId]!.setLatLng(currentPosition);
      }

      // Smoothly pan to vehicle position
      mapRefs.current[rideId]!.panTo(currentPosition, {
        animate: true,
        duration: 1
      });
    }
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
    if (mapRefs.current[ride._id] || !leafletLoaded) return;

    // Clear container first
    mapContainer.innerHTML = '';

    const map = leafletLoaded.map(mapContainer).setView([0, 0], 10);
    leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRefs.current[ride._id] = map;

    try {
      const routeData = JSON.parse(ride.routeGeometry);
      if (routeData.type === "LineString" && routeData.coordinates) {
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        
        // Create route layer
        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { 
          color: "#3b82f6", 
          weight: 4,
          opacity: 0.7 
        }).addTo(map);

        // Start marker
        const [startLat, startLng] = coordinates[0];
        leafletLoaded.marker([startLat, startLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>Start:</strong> ${ride.startPlaceName}`);

        // End marker
        const [endLat, endLng] = coordinates[coordinates.length - 1];
        leafletLoaded.marker([endLat, endLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>End:</strong> ${ride.endPlaceName}`);

        // Add pickup and dropoff markers for current user
        const userPickup = ride.pickupPoints.find((p) => p.passengerId === userId);
        const userDropoff = ride.dropoffPoints.find((p) => p.passengerId === userId);

        if (userPickup) {
          const [pickupLat, pickupLng] = userPickup.location.split(",").map(Number);
          leafletLoaded.marker([pickupLat, pickupLng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>Your Pickup:</strong> ${userPickup.placeName}`);
        }

        if (userDropoff) {
          const [dropoffLat, dropoffLng] = userDropoff.location.split(",").map(Number);
          leafletLoaded.marker([dropoffLat, dropoffLng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>Your Drop-off:</strong> ${userDropoff.placeName}`);
        }

        // Fit bounds to show all points
        const allPoints = [
          ...coordinates,
          ...(userPickup ? [[userPickup.location.split(",").map(Number)[0], userPickup.location.split(",").map(Number)[1]]] : []),
          ...(userDropoff ? [[userDropoff.location.split(",").map(Number)[0], userDropoff.location.split(",").map(Number)[1]]] : [])
        ];

        if (allPoints.length > 0) {
          map.fitBounds(leafletLoaded.latLngBounds(allPoints), { padding: [20, 20] });
        }

        // If ride is started, add vehicle marker and start tracking
        if (ride.status === "Started") {
          const initialPosition = ride.currentPosition || coordinates[0];
          vehicleMarkers.current[ride._id] = leafletLoaded.marker(initialPosition, {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            }),
            zIndexOffset: 1000
          }).addTo(map).bindPopup("Live Vehicle Position");

          // Start tracking
          startTracking(ride._id);
        }
      }
    } catch (error) {
      console.error("Error rendering map:", error);
    }
  }, [leafletLoaded, userId]);

  const cleanupMap = useCallback((rideId: string) => {
    // Stop tracking
    stopTracking(rideId);

    // Remove map and markers
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    
    if (vehicleMarkers.current[rideId]) {
      vehicleMarkers.current[rideId]?.remove();
      vehicleMarkers.current[rideId] = null;
    }
    
    if (routeLayers.current[rideId]) {
      routeLayers.current[rideId]?.remove();
      routeLayers.current[rideId] = null;
    }
  }, []);

  const toggleRideExpansion = (rideId: string) => {
    if (expandedRide === rideId) {
      cleanupMap(rideId);
      setExpandedRide(null);
    } else {
      setExpandedRide(rideId);
      const ride = rides.find((r) => r._id === rideId);
      if (ride && leafletLoaded) {
        setTimeout(() => {
          const mapContainer = mapContainerRefs.current[rideId];
          if (mapContainer) {
            initializeMap(ride, mapContainer);
          }
        }, 100);
      }
    }
  };

  const handleRefreshPosition = async (rideId: string) => {
    await updateVehiclePosition(rideId);
    Swal.fire({
      title: "Position Updated!",
      text: "Vehicle position has been refreshed.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleCancelRide = async (rideId: string) => {
    const result = await Swal.fire({
      title: "Cancel Ride?",
      text: "Are you sure you want to cancel this ride? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, cancel it!",
      cancelButtonText: "No, keep it",
    });

    if (result.isConfirmed) {
      try {
        await clientApiService.ride.cancelJoinedRide(rideId);
        setRides((prev) =>
          prev.map((ride) =>
            ride.rideId === rideId ? { ...ride, status: "Cancelled", requestStatus: "rejected" } : ride
          )
        );
        Swal.fire("Cancelled!", "Your ride has been cancelled successfully.", "success");
      } catch (error: any) {
        console.error("Error cancelling ride:", error);
        setError(`Failed to cancel ride: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleChatWithDriver = (rideId: string, driverId: string) => {
    router.push(`/user/chat?rideId=${rideId}&driverId=${driverId}`);
  };

  const handlePageChange = (page: number) => {
    fetchJoinedRides(page, itemsPerPage, debouncedSearch);
  };

  const handleSearch = (search: string) => {
    setLocalSearchTerm(search);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    fetchJoinedRides(1, newItemsPerPage, debouncedSearch);
  };

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const { currentPage, totalPages } = pagination;
    
    if (totalPages <= 1) return [1];
    
    // Always show first page
    buttons.push(1);
    
    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if needed
    if (startPage > 2) {
      buttons.push('...');
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(i);
      }
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      buttons.push('...');
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      buttons.push(totalPages);
    }
    
    return buttons;
  };

  const getStatusBadge = (status: string, requestStatus?: string) => {
    if (requestStatus === "rejected") {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
    }
    
    if (requestStatus === "pending") {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending Approval</Badge>;
    }

    switch (status) {
      case "Pending":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Scheduled</Badge>;
      case "Started":
        return <Badge className="bg-green-100 text-green-800 border-green-200">In Progress</Badge>;
      case "Completed":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
      case "Cancelled":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    return status === "Paid" 
      ? <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
      : <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Pending</Badge>;
  };

  return (
    <MainLayout activeItem="Joined Ride">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Joined Rides
          </h1>
          <p className="text-gray-600 text-lg">Manage and track your ride bookings</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Search and Controls */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by driver name, location, or status..."
                  value={localSearchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                </select>
              </div>

              {/* Refresh Button */}
              <Button 
                onClick={() => fetchJoinedRides(pagination.currentPage, itemsPerPage, debouncedSearch)} 
                variant="outline" 
                disabled={isLoading}
                className="flex items-center gap-2 whitespace-nowrap"
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
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {rides.length} of {pagination.totalCount} rides
              {debouncedSearch && ` for "${debouncedSearch}"`}
            </div>
          </CardContent>
        </Card>

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
          <Card className="text-center py-12">
            <CardContent>
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {debouncedSearch ? "No Rides Found" : "No Rides Joined"}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {debouncedSearch 
                  ? `No rides match your search "${debouncedSearch}". Try different keywords.`
                  : "You haven't joined any rides yet. Start exploring available rides to begin your journey."
                }
              </p>
              {debouncedSearch && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => handleSearch("")}
                >
                  Clear Search
                </Button>
              )}
              <Button 
                onClick={() => router.push('/user/JoinRide')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 ml-2"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Find Rides
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Rides List */}
            <div className="grid gap-6">
              {rides.map((ride) => {
                const userPickup = ride.pickupPoints.find((p) => p.passengerId === userId);
                const userDropoff = ride.dropoffPoints.find((p) => p.passengerId === userId);
                const isUserPassenger = ride.passengers.some((p) => p.passengerId === userId);
                const isExpanded = expandedRide === ride._id;
                const isRideStarted = ride.status === "Started";

                return (
                  <Card key={ride._id} className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-blue-50">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                              <Car className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-xl font-bold text-gray-900">
                                {ride.startPlaceName} → {ride.endPlaceName}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4" />
                                {ride.date !== "N/A" ? new Date(ride.date).toLocaleDateString("en-GB") : "N/A"}
                                {ride.time && ride.time !== "N/A" && (
                                  <>
                                    <Clock className="h-4 w-4 ml-2" />
                                    {ride.time}
                                  </>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-3">
                            {getStatusBadge(ride.status, ride.requestStatus)}
                            {isUserPassenger && getPaymentBadge(ride.paymentStatus)}
                            <Badge variant="outline" className="bg-white border-gray-300">
                              <Users className="h-3 w-3 mr-1" />
                              {ride.passengerCount} passengers
                            </Badge>
                            <Badge variant="outline" className="bg-white border-gray-300">
                              <MapPin className="h-3 w-3 mr-1" />
                              {(ride.distanceKm ?? 0).toFixed(1)} km
                            </Badge>
                            {isRideStarted && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <Navigation className="h-3 w-3 mr-1" />
                                Live Tracking
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => handleChatWithDriver(ride._id, ride.driverId)}
                            disabled={!ride.driverId || ride.driverId === "N/A" || ride.requestStatus !== "accepted"}
                          >
                            <Phone className="h-4 w-4" />
                            Chat
                          </Button>
                          
                          {ride.status === "Pending" && (ride.requestStatus === "pending" || ride.requestStatus === "accepted") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleCancelRide(ride.rideId!)}
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          )}
                          
                          <Button
                            variant={isExpanded ? "secondary" : "outline"}
                            size="sm"
                            className="flex items-center gap-2"
                            onClick={() => toggleRideExpansion(ride._id)}
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
                          {/* Ride Details */}
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Ride Information
                              </h4>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Driver</p>
                                    <p className="text-gray-900">{ride.driverName}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Vehicle</p>
                                    <p className="text-gray-900">{ride.vehicleId}</p>
                                  </div>
                                  {isUserPassenger && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Your Cost</p>
                                      <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        {(ride.costPerPerson ?? 0).toFixed(2)} INR
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  {userPickup && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Your Pickup</p>
                                      <p className="text-gray-900 flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-blue-500" />
                                        {userPickup.placeName}
                                      </p>
                                    </div>
                                  )}
                                  {userDropoff && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Your Drop-off</p>
                                      <p className="text-gray-900 flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-red-500" />
                                        {userDropoff.placeName}
                                      </p>
                                    </div>
                                  )}
                                  {isRideStarted && ride.currentPosition && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Vehicle Location</p>
                                      <p className="text-gray-900 text-sm">
                                        Live tracking active
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Tracking Controls for Started Rides */}
                            {isRideStarted && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-green-800 mb-2 flex items-center gap-2">
                                  <Navigation className="h-4 w-4" />
                                  Live Vehicle Tracking
                                </h4>
                                <p className="text-green-700 text-sm mb-3">
                                  The vehicle position is updated every 5 seconds. You can see the real-time location on the map.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-100"
                                  onClick={() => handleRefreshPosition(ride._id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Refresh Position Now
                                </Button>
                              </div>
                            )}

                            {/* Other Passengers */}
                            {ride.passengers.filter(p => p.passengerId !== userId).length > 0 && (
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Other Passengers</h4>
                                <div className="space-y-2">
                                  {ride.passengers
                                    .filter((p) => p.passengerId !== userId)
                                    .map((passenger, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                          <p className="font-medium text-gray-900">{passenger.passengerName}</p>
                                          <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                            <span>Picked Up: {passenger.pickedUp ? "Yes" : "No"}</span>
                                            <span>Dropped Off: {passenger.droppedOff ? "Yes" : "No"}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Map */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Navigation className="h-5 w-5 text-green-600" />
                                {isRideStarted ? "Live Route Map" : "Route Map"}
                              </h4>
                              {isRideStarted && (
                                <Badge className="bg-green-100 text-green-800">
                                  Live Tracking
                                </Badge>
                              )}
                            </div>
                            <div
                              ref={(el) => { 
                                mapContainerRefs.current[ride._id] = el;
                                // Initialize map when container is available
                                if (el && isExpanded && leafletLoaded && ride) {
                                  setTimeout(() => {
                                    initializeMap(ride, el);
                                  }, 100);
                                }
                              }}
                              className="h-80 w-full rounded-lg border border-gray-200 bg-gray-100"
                            />
                            {isRideStarted && (
                              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span>Yellow marker shows live vehicle position</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Page {pagination.currentPage} of {pagination.totalPages} • 
                      Showing {((pagination.currentPage - 1) * itemsPerPage) + 1} to{" "}
                      {Math.min(pagination.currentPage * itemsPerPage, pagination.totalCount)} of{" "}
                      {pagination.totalCount} rides
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {generatePaginationButtons().map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={page}
                              variant={pagination.currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}