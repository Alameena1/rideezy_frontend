"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";
import { clientApiService } from "@/services/client/client-api"; // Updated import
import "leaflet/dist/leaflet.css";
import Swal from "sweetalert2";
import { useForm } from "react-hook-form";
import AddressSearch from "../../features/user/ride/AddressSearch";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, Route, IndianRupee, Search, Navigation, MessageCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { useRidePayment } from "../../features/user/ride/useRidePayment";
import MainLayout from "@/app/comp/MainLayout";

const MapComponent = dynamic(() => import("../../../app/comp/MapComponent"), {
  ssr: false,
});

interface Ride {
  _id: string;
  rideId: string;
  startPoint: string;
  endPoint: string;
  date: string;
  time: string;
  passengerCount: number;
  totalPeople: number;
  distanceKm: number;
  costPerPerson?: number;
  perKmRate?: number;
  routeGeometry: string;
  driverId: string;
  passengers: { passengerId: string; passengerName: string; pickedUp?: boolean; droppedOff?: boolean }[];
  passengerDistances: { passengerId: string; distanceKm: number }[];
  passengerCosts: { passengerId: string; cost: number }[];
  pendingRequests?: { passengerId: string; distanceKm: number; status: string }[];
}

interface FormData {
  userLocation: string;
  userLocationName: string;
  destination: string;
  destinationName: string;
}

interface PlaceNames {
  [key: string]: { startPlaceName: string; endPlaceName: string };
}

const JoinRidePage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      userLocation: "",
      userLocationName: "",
      destination: "",
      destinationName: "",
    },
    mode: "onChange",
  });

  const userLocation = watch("userLocation");
  const destination = watch("destination");
  const userLocationName = watch("userLocationName");
  const destinationName = watch("destinationName");
  const [rides, setRides] = useState<Ride[]>([]);
  const [placeNames, setPlaceNames] = useState<PlaceNames>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter] = useState<[number, number]>([10.8505, 76.2711]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [joinLocation, setJoinLocation] = useState<string | null>(null);
  const [passengerDistance, setPassengerDistance] = useState<number | null>(null);
  const [passengerCost, setPassengerCost] = useState<number | null>(null);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [isJoinRideSuccessful, setIsJoinRideSuccessful] = useState(false);
  const [L, setL] = useState<any>(null);

  const { handleRidePayment, paymentLoading } = useRidePayment({
    userId: user?._id || "",
    pickupLocation: userLocation,
    dropoffLocation: destination,
    pickupPlaceName: userLocationName,
    dropoffPlaceName: destinationName,
    onSuccess: (ride) => {
      setJoinLocation(userLocation);
      setError(null);
      Swal.fire({
        icon: "success",
        title: "Successfully Joined the Ride!",
        text: "Would you like to view the ride details or continue searching?",
        showCancelButton: true,
        confirmButtonText: "View Ride",
        cancelButtonText: "Continue Searching",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = `/user/joinedRideDetails?rideId=${ride.rideId}`;
        } else {
          handleSearch();
        }
      });
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      setIsCostLoading(false);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leafletModule) => {
      setL(leafletModule.default);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setValue("userLocation", `${latitude},${longitude}`, { shouldValidate: true });
        },
        (err) => {
          const errorMessage = err.message || "Unknown geolocation error";
          setError("Failed to get your location. Please enter it manually or select on the map.");
          console.info("Geolocation access denied by user:", errorMessage);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Please enter your location manually.");
      console.info("Geolocation is not supported by the browser.");
    }
  }, [setValue]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { 'User-Agent': 'YourAppName/1.0 (contact@example.com)' },
        }
      );
      return response.data.display_name || `${lat},${lng}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat},${lng}`;
    }
  };

  useEffect(() => {
    const fetchPlaceNames = async () => {
      const newPlaceNames: PlaceNames = {};
      for (const ride of rides) {
        if (!placeNames[ride._id]) {
          const [startLat, startLng] = ride.startPoint.split(",").map(Number);
          const [endLat, endLng] = ride.endPoint.split(",").map(Number);
          const startPlaceName = await reverseGeocode(startLat, startLng);
          const endPlaceName = await reverseGeocode(endLat, endLng);
          newPlaceNames[ride._id] = { startPlaceName, endPlaceName };
        }
      }
      setPlaceNames((prev) => ({ ...prev, ...newPlaceNames }));
    };

    if (rides.length > 0) {
      fetchPlaceNames();
    }
  }, [rides]);

  const calculateDistanceBetweenPoints = (point1: string, point2: string): number => {
    try {
      const [lat1, lng1] = point1.split(',').map(Number);
      const [lat2, lng2] = point2.split(',').map(Number);
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        return 0;
      }
      
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance;
    } catch (error) {
      console.error("Error calculating distance:", error);
      return 0;
    }
  };

  const fetchPassengerCost = useCallback(
    async (ride: Ride) => {
      if (!userLocation || !destination || !user?._id) {
        console.warn("[JoinRidePage] Missing userLocation, destination, or user ID:", {
          userLocation,
          destination,
          userId: user?._id,
        });
        setError("Please provide valid pickup and drop-off locations and ensure you are logged in.");
        setIsCostLoading(false);
        return;
      }

      setIsCostLoading(true);
      setError(null);
      
      try {
        console.log("[JoinRidePage] Calling joinRide API with:", {
          rideId: ride.rideId,
          userId: user?._id,
          userLocation,
          destination,
          userLocationName,
          destinationName,
        });

        let backendDistance: number | null = null;
        let pendingRequestId: string | null = null;
        
        try {
          const response = await clientApiService.ride.joinRide( // Updated to clientApiService
            ride.rideId,
            user?._id || "",
            userLocation,
            destination
          );
          
          console.log("[JoinRidePage] joinRide response:", response);
          
          if (response.data && response.data.pendingRequests) {
            const pendingRequest = response.data.pendingRequests.find(
              (req: any) => req.passengerId === user?._id
            );
            
            if (pendingRequest && pendingRequest.distanceKm !== undefined) {
              backendDistance = pendingRequest.distanceKm;
              pendingRequestId = pendingRequest._id || pendingRequest.passengerId;
              console.log("[JoinRidePage] Got distance from backend:", backendDistance);
            }
          }
        } catch (apiError: any) {
          console.warn("[JoinRidePage] API call failed, using fallback calculation:", apiError.message);
        }

        let finalDistance = backendDistance;
        if (finalDistance === null || finalDistance === undefined) {
          console.log("[JoinRidePage] Calculating distance locally");
          finalDistance = calculateDistanceBetweenPoints(userLocation, destination);
          
          if (finalDistance <= 0) {
            finalDistance = ride.distanceKm * 0.7;
            console.log("[JoinRidePage] Using estimated distance:", finalDistance);
          }
        }

        const perKmRate = ride.perKmRate ?? 6.37;
        const cost = Math.max(finalDistance * perKmRate, 20);
        
        console.log(
          `[JoinRidePage] Final calculation: ₹${cost} (distanceKm: ${finalDistance}, perKmRate: ${perKmRate})`
        );
        
        setPassengerDistance(finalDistance);
        setPassengerCost(cost);
        setIsJoinRideSuccessful(true);
        
        localStorage.setItem('pendingRideRequest', JSON.stringify({
          rideId: ride.rideId,
          passengerId: user?._id,
          distance: finalDistance,
          cost: cost,
          timestamp: Date.now()
        }));
        
      } catch (error: any) {
        console.error("[JoinRidePage] Error in fetchPassengerCost:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          userId: user?._id,
          rideId: ride.rideId,
        });
        
        const perKmRate = ride.perKmRate ?? 6.37;
        const estimatedDistance = ride.distanceKm * 0.7;
        const cost = Math.max(estimatedDistance * perKmRate, 20);
        
        setPassengerDistance(estimatedDistance);
        setPassengerCost(cost);
        setIsJoinRideSuccessful(false);
        setError("Using estimated fare. " + (error.response?.data?.message || "Please verify locations."));
      } finally {
        setIsCostLoading(false);
      }
    },
    [userLocation, destination, userLocationName, destinationName, user?._id]
  );

  useEffect(() => {
    if (selectedRide && userLocation && destination && user?._id) {
      fetchPassengerCost(selectedRide);
    } else {
      setPassengerDistance(null);
      setPassengerCost(null);
      setIsCostLoading(false);
      setIsJoinRideSuccessful(false);
    }
  }, [selectedRide, userLocation, destination, user?._id, fetchPassengerCost]);

  const handleSearch = async () => {
    if (!userLocation || !destination) {
      setError("Please select both your location and destination.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await clientApiService.ride.findNearestRides({ userLocation, destination }); // Updated to clientApiService
      console.log("[JoinRidePage] Fetched rides:", response);
      setRides(response);
      setSelectedRide(null);
      setJoinLocation(null);
      setPassengerDistance(null);
      setPassengerCost(null);
      setIsCostLoading(false);
      setIsJoinRideSuccessful(false);
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.message || "Failed to fetch rides. Please try again.";
      setError(message);
      console.error("[JoinRidePage] Error fetching rides:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateLocationFormat = (location: string): boolean => {
    const [lat, lng] = location.split(",").map(Number);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  const handleJoinRide = async (ride: Ride) => {
    console.log(
      "[JoinRidePage] Attempting to join ride with userLocation:",
      userLocation,
      "destination:",
      destination,
      "userId:",
      user?._id
    );

    if (!isAuthenticated) {
      setError("Please log in to join a ride.");
      return;
    }

    if (!user) {
      setError("User data is not available.");
      return;
    }

    if (!userLocation || userLocation.trim() === "") {
      setError("Please select your pickup location before joining a ride.");
      console.warn("[JoinRidePage] userLocation is invalid:", userLocation);
      return;
    }

    if (!destination || destination.trim() === "") {
      setError("Please select your drop-off location before joining a ride.");
      console.warn("[JoinRidePage] destination is invalid:", destination);
      return;
    }

    if (!validateLocationFormat(userLocation)) {
      setError("Invalid pickup location format. Please select a valid location (latitude,longitude).");
      console.warn("[JoinRidePage] Invalid userLocation format:", userLocation);
      return;
    }

    if (!validateLocationFormat(destination)) {
      setError("Invalid drop-off location format. Please select a valid location (latitude,longitude).");
      console.warn("[JoinRidePage] Invalid destination format:", destination);
      return;
    }

    if (passengerCost === null) {
      setError("Cost calculation failed. Please retry or select a different ride.");
      console.warn("[JoinRidePage] Cost not calculated:", { passengerCost });
      return;
    }

    handleRidePayment(ride, user);
  };

  const handleRetryCostCalculation = (ride: Ride) => {
    setError(null);
    setIsCostLoading(true);
    fetchPassengerCost(ride);
  };

  const handleSetLocation = useCallback(
    (loc: string, isUserLocation: boolean) => {
      console.log("[JoinRidePage] Setting location:", loc, "isUserLocation:", isUserLocation);
      if (isUserLocation) {
        setValue("userLocation", loc, { shouldValidate: true });
      } else {
        setValue("destination", loc, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const getAvailableSeats = useCallback((ride: Ride) => {
    const availableSeats = Math.max(0, ride.passengerCount - ride.passengers.length);
    console.log(
      `[JoinRidePage] Ride ${ride.rideId}: passengerCount=${ride.passengerCount}, passengersLength=${ride.passengers.length}, availableSeats=${availableSeats}`
    );
    return availableSeats;
  }, []);

  const getSeatsStatus = useCallback(
    (ride: Ride) => {
      const available = getAvailableSeats(ride);
      if (available === 0) return { text: "Full", variant: "destructive" as const };
      if (available === 1) return { text: "1 seat left", variant: "secondary" as const };
      return { text: `${available} seats`, variant: "default" as const };
    },
    [getAvailableSeats]
  );

  const handleSelectRide = (ride: Ride) => {
    setSelectedRide(ride);
  };

  const handleChatWithDriver = (rideId: string, driverId: string) => {
    router.push(`/user/chat?rideId=${rideId}&driverId=${driverId}`);
  };

  const mapComponentProps = useMemo(
    () => ({
      mapCenter,
      userLocation,
      destination,
      setLocation: handleSetLocation,
      L,
      selectedRide,
      joinLocation,
    }),
    [mapCenter, userLocation, destination, handleSetLocation, L, selectedRide, joinLocation]
  );

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <MainLayout activeItem="Rides" hideSidebar={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Find Your Perfect Ride</h1>
            <p className="text-lg text-gray-600">Connect with fellow travelers and share the journey</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5" />
                    Interactive Map
                  </CardTitle>
                  <CardDescription>
                    Click on the map to set your pickup location (first click) and drop-off location (second click).
                    Select a ride to view its route.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border">
                    <MapComponent {...mapComponentProps} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Locations
                  </CardTitle>
                  <CardDescription>Enter your pickup and drop-off addresses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AddressSearch
                      label="Your Pickup Location"
                      field="userLocation"
                      placeNameField="userLocationName"
                      register={register}
                      setValue={setValue}
                      error={errors.userLocation?.message}
                    />
                    <AddressSearch
                      label="Your Drop-off Location"
                      field="destination"
                      placeNameField="destinationName"
                      register={register}
                      setValue={setValue}
                      error={errors.destination?.message}
                    />
                  </div>

                  <Button
                    onClick={handleSearch}
                    className="w-full"
                    size="lg"
                    disabled={isLoading || !!errors.userLocation || !!errors.destination}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Available Rides
                      </>
                    )}
                  </Button>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card className="shadow-lg h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Available Rides
                  </CardTitle>
                  <CardDescription>
                    {rides.length > 0
                      ? `Found ${rides.length} ride${rides.length > 1 ? "s" : ""}`
                      : "No rides found yet"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rides.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Route className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-2">No rides available</p>
                      <p className="text-sm text-gray-400">Try adjusting your search criteria</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {rides.map((ride) => {
                        const seatsStatus = getSeatsStatus(ride);
                        const { startPlaceName, endPlaceName } =
                          placeNames[ride._id] || {
                            startPlaceName: ride.startPoint,
                            endPlaceName: ride.endPoint,
                          };
                        
                        let displayCost = ride.perKmRate ? Math.max(ride.distanceKm * ride.perKmRate, 20) : 20;
                        if (selectedRide?._id === ride._id) {
                          displayCost = passengerCost !== null ? passengerCost : displayCost;
                        }

                        return (
                          <Card
                            key={ride.rideId}
                            className={`border-l-4 ${
                              selectedRide?._id === ride._id ? "border-l-blue-700" : "border-l-blue-500"
                            } cursor-pointer`}
                            onClick={() => handleSelectRide(ride)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-xs">
                                    ID: {ride.rideId}
                                  </Badge>
                                  <Badge variant={seatsStatus.variant}>{seatsStatus.text}</Badge>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <div>
                                      <p className="text-sm font-medium">From</p>
                                      <p className="text-xs text-gray-600 line-clamp-2">{startPlaceName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-red-600" />
                                    <div>
                                      <p className="text-sm font-medium">To</p>
                                      <p className="text-xs text-gray-600 line-clamp-2">{endPlaceName}</p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-gray-500" />
                                    <span>{format(new Date(ride.date), "dd MMM yyyy")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-gray-500" />
                                    <span>{ride.time}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Route className="h-3 w-3 text-gray-500" />
                                    <span>{ride.distanceKm.toFixed(2)} km</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <IndianRupee className="h-3 w-3 text-gray-500" />
                                    <span>
                                      {isCostLoading && selectedRide?._id === ride._id 
                                        ? "Calculating..." 
                                        : `₹${displayCost.toFixed(2)}`
                                      }
                                    </span>
                                  </div>
                                  {selectedRide?._id === ride._id && passengerDistance !== null && (
                                    <div className="flex items-center gap-1 col-span-2">
                                      <Route className="h-3 w-3 text-gray-500" />
                                      <span>Your distance: {passengerDistance.toFixed(2)} km</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleChatWithDriver(ride._id, ride.driverId);
                                    }}
                                    disabled={!ride.driverId}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Chat with Driver
                                  </Button>
                                  {selectedRide?._id === ride._id && !isJoinRideSuccessful && !isCostLoading && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full flex items-center justify-center gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetryCostCalculation(ride);
                                      }}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      Retry Cost Calculation
                                    </Button>
                                  )}
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJoinRide(ride);
                                    }}
                                    className="w-full flex items-center justify-center gap-2"
                                    size="sm"
                                    disabled={
                                      getAvailableSeats(ride) === 0 ||
                                      !userLocation ||
                                      userLocation.trim() === "" ||
                                      !destination ||
                                      destination.trim() === "" ||
                                      paymentLoading === ride.rideId ||
                                      (selectedRide?._id === ride._id && (isCostLoading || passengerCost === null))
                                    }
                                  >
                                    {paymentLoading === ride.rideId
                                      ? "Processing Payment..."
                                      : getAvailableSeats(ride) === 0
                                      ? "Ride Full"
                                      : selectedRide?._id === ride._id && (isCostLoading || passengerCost === null)
                                      ? "Calculating Cost..."
                                      : `Pay ₹${passengerCost?.toFixed(2) || "0.00"}`
                                    }
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default JoinRidePage;