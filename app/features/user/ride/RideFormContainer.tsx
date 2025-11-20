"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { clientApiService } from "@/services/client/client-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, Navigation, MapPin, Calendar } from "lucide-react";
import MapComponent from "./MapComponent";
import AddressSearch from "./AddressSearch";
import RideFormFields from "./RideFormFields";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface FormData {
  driverId: string;
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  passengerCount: number;
  fuelPrice: number;
  vehicleId: string;
}

interface RouteData {
  distance: number;
  geometry: any;
}

interface Vehicle {
  _id: string;
  vehicleName: string;
  mileage: number;
  seatCapacity: number;
  vehicleType?: string;
}

const RideFormContainer: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [perKmRate, setPerKmRate] = useState<number | null>(null);
  const [platformFee, setPlatformFee] = useState<number | null>(null);
  const [distanceInKm, setDistanceInKm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [hasValidRoute, setHasValidRoute] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      driverId: "",
      date: new Date().toISOString().split("T")[0],
      time: "12:00",
      passengerCount: 1,
      fuelPrice: 0,
      vehicleId: "",
      startPoint: "",
      startPlaceName: "",
      endPoint: "",
      endPlaceName: "",
    },
  });

  const startPoint = watch("startPoint");
  const endPoint = watch("endPoint");
  const startPlaceName = watch("startPlaceName");
  const endPlaceName = watch("endPlaceName");
  const vehicleId = watch("vehicleId");
  const passengerCount = watch("passengerCount");
  const fuelPrice = watch("fuelPrice");

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (vehicleId && vehicleId !== selectedVehicleId) {
      setSelectedVehicleId(vehicleId);
    }
  }, [vehicleId, selectedVehicleId, vehicles]);

  const handleAuthError = (error: any) => {
    Swal.fire({
      icon: "error",
      title: "Session Expired",
      text: "Your session has expired. Please log in again.",
      background: '#fff',
      color: '#374151',
      confirmButtonText: "Log In",
    }).then(() => {
      router.push("/user/login");
    });
  };

  const extractDriverId = (userData: any): string => {
    if (userData?._id) return userData._id;
    if (userData?.id) return userData.id;
    if (userData?.data?._id) return userData.data._id;
    if (userData?.data?.id) return userData.data.id;
    if (userData?.user?._id) return userData.user._id;
    if (userData?.user?.id) return userData.user.id;
    if (typeof userData === 'string') return userData;
    
    throw new Error("Failed to extract driver ID from user data");
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setAuthReady(true);
    } else if (status === "unauthenticated") {
      router.push("/user/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authReady || status !== "authenticated") {
        return;
      }

      try {
        setIsLoading(true);

        const accessToken = (session?.user as any)?.accessToken;
        if (!accessToken) {
          handleAuthError(new Error("No access token"));
          return;
        }

        let userData;
        try {
          userData = await clientApiService.user.getProfile();
        } catch (userError: any) {
          if (userError.response?.status === 401) {
            handleAuthError(userError);
            return;
          }
          throw new Error("Failed to fetch user profile. Please try again.");
        }

        let extractedDriverId: string;
        try {
          extractedDriverId = extractDriverId(userData);
        } catch (idError) {
          extractedDriverId = (session?.user as any)?.id || (session?.user as any)?._id;
          if (!extractedDriverId) {
            throw new Error("Could not determine your user ID. Please log in again.");
          }
        }

        setDriverId(extractedDriverId);
        setValue("driverId", extractedDriverId);

        let vehiclesData;
        try {
          vehiclesData = await clientApiService.vehicle.getVehicles();
        } catch (vehicleError: any) {
          if (vehicleError.response?.status === 401) {
            handleAuthError(vehicleError);
            return;
          }
          vehiclesData = { data: [] };
        }

        let vehicles: Vehicle[] = [];
        
        if (Array.isArray(vehiclesData)) {
          vehicles = vehiclesData;
        } else if (Array.isArray(vehiclesData.data)) {
          vehicles = vehiclesData.data;
        } else if (Array.isArray(vehiclesData.data?.data)) {
          vehicles = vehiclesData.data.data;
        } else if (vehiclesData.data && typeof vehiclesData.data === 'object') {
          vehicles = vehiclesData.data.vehicles || vehiclesData.data.data || [];
        } else if (vehiclesData.vehicles && Array.isArray(vehiclesData.vehicles)) {
          vehicles = vehiclesData.vehicles;
        } else {
          vehicles = [];
        }

        const approvedVehicles: Vehicle[] = vehicles
          .filter((vehicle: any) => vehicle.status === "Approved")
          .map((vehicle: any) => ({
            _id: vehicle._id || vehicle.id,
            vehicleName: vehicle.vehicleName || "Unknown Vehicle",
            mileage: vehicle.mileage || 15,
            seatCapacity: vehicle.seatCapacity || 4,
            vehicleType: vehicle.vehicleType || "Car",
          }));
        
        setVehicles(approvedVehicles);
        
        if (approvedVehicles.length > 0) {
          const firstVehicleId = approvedVehicles[0]._id;
          setValue("vehicleId", firstVehicleId);
          setSelectedVehicleId(firstVehicleId);
        }

        try {
          const subscriptionData = await clientApiService.subscription.getSubscriptionStatus();
          setIsSubscribed(subscriptionData.data?.isSubscribed || false);
        } catch (subscriptionError: any) {
          if (subscriptionError.response?.status === 401) {
            handleAuthError(subscriptionError);
            return;
          }
          setIsSubscribed(false);
        }

        setDataLoaded(true);

      } catch (error: any) {
        if (error.response?.status === 401) {
          handleAuthError(error);
          return;
        }

        if (process.env.NODE_ENV === 'development' && error.code === 'ERR_NETWORK') {
          return;
        }

        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to load user data. Please try logging in again.",
          background: '#fff',
          color: '#374151',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [authReady, status, session, setValue, router]);

  useEffect(() => {
    if (startPoint && endPoint) {
      setHasValidRoute(true);
    } else {
      setHasValidRoute(false);
      setRouteData(null);
    }
  }, [startPoint, endPoint]);

  useEffect(() => {
    if (routeData && vehicleId && passengerCount !== undefined && fuelPrice !== undefined) {
      const distanceInKm = routeData.distance / 1000;
      setDistanceInKm(distanceInKm);
      
      const selectedVehicle = Array.isArray(vehicles) 
        ? vehicles.find((v) => v._id === vehicleId)
        : null;
      
      const fuelNeeded = distanceInKm / (selectedVehicle?.mileage || 1);
      const totalFuelCost = fuelNeeded * fuelPrice;
      const platformFee = isSubscribed ? 0 : Math.ceil(totalFuelCost * 0.1);
      setPlatformFee(platformFee);
      const totalRideCost = totalFuelCost + platformFee;
      setPerKmRate(totalRideCost / distanceInKm);
    }
  }, [routeData, vehicleId, passengerCount, fuelPrice, vehicles, isSubscribed]);

  const handleVehicleChange = (value: string) => {
    setValue("vehicleId", value);
    setSelectedVehicleId(value);
    
    const selectedVehicle = vehicles.find((v) => v._id === value);
    const currentPassengerCount = getValues("passengerCount");
    const maxPassengers = (selectedVehicle?.seatCapacity || 1) - 1;
    
    if (currentPassengerCount > maxPassengers) {
      setValue("passengerCount", maxPassengers);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!driverId) {
      Swal.fire({
        icon: "error",
        title: "Authentication Error",
        text: "Your session is invalid. Please log in again.",
        background: '#fff',
        color: '#374151',
      });
      return;
    }

    if (!routeData || !routeData.distance || !routeData.geometry) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Please calculate a valid route before submitting.",
        background: '#fff',
        color: '#374151',
      });
      return;
    }

    if (!data.startPlaceName || !data.endPlaceName) {
      Swal.fire({
        icon: "error",
        title: "Missing Location Names",
        text: "Please provide names for both start and end locations.",
        background: '#fff',
        color: '#374151',
      });
      return;
    }

    const selectedVehicle = Array.isArray(vehicles) 
      ? vehicles.find((v) => v._id === data.vehicleId)
      : null;
      
    if (data.passengerCount > (selectedVehicle?.seatCapacity || 0)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Passenger Count",
        text: `Passenger count (${data.passengerCount}) exceeds vehicle seat capacity (${selectedVehicle?.seatCapacity})`,
        background: '#fff',
        color: '#374151',
      });
      return;
    }

    const rideData = {
      date: data.date,
      time: data.time,
      startPoint: data.startPoint,
      endPoint: data.endPoint,
      startPlaceName: data.startPlaceName,
      endPlaceName: data.endPlaceName,
      passengerCount: Number(data.passengerCount),
      fuelPrice: Number(data.fuelPrice),
      vehicleId: data.vehicleId,
      fuelCost: (routeData.distance / 1000) * (Number(data.fuelPrice) / (selectedVehicle?.mileage || 1)),
      distance: Number(routeData.distance) / 1000,
      routeGeometry: JSON.stringify(routeData.geometry),
      platformFee: platformFee || 0,
      driverId: driverId,
    };

    setIsLoading(true);
    try {
      const response = await clientApiService.ride.startRide(rideData);
      Swal.fire({
        icon: "success",
        title: "Ride Initiated Successfully!",
        text: platformFee && platformFee > 0 
          ? `A platform fee of ₹${platformFee} has been applied and deducted from your wallet.` 
          : "No platform fee applied.",
        showCancelButton: true,
        confirmButtonText: "View Ride",
        cancelButtonText: "Go Home",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        background: '#fff',
        color: '#374151',
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = `/user/RideDetails`;
        } else {
          window.location.href = "/";
        }
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleAuthError(error);
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || "Failed to start ride. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        background: '#fff',
        color: '#374151',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || (!dataLoaded && isLoading)) {
    return (
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Ride
          </h1>
          <p className="text-gray-600 text-lg">Loading your data...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create New Ride
        </h1>
        <p className="text-gray-600 text-lg">Plan your journey and share the ride</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{currentDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-blue-600" />
              Route Map
              {routeData && (
                <Badge className="bg-green-100 text-green-800 ml-2">
                  {distanceInKm ? `${distanceInKm.toFixed(2)} km` : 'Calculated'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasValidRoute ? (
              <>
                <MapComponent 
                  startPoint={startPoint} 
                  endPoint={endPoint} 
                  routeData={routeData} 
                  setRouteData={setRouteData} 
                />
                {routeData && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">Route Calculated</span>
                      <Badge className="bg-green-100 text-green-800">
                        {distanceInKm ? `${distanceInKm.toFixed(2)} km` : 'Ready'}
                      </Badge>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Enter start and end locations</p>
                  <p className="text-sm">The map will calculate the route once you set both locations</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Car className="h-5 w-5 text-blue-600" />
              Ride Details
            </CardTitle>
            <div className="flex items-center gap-2">
              {isSubscribed && (
                <Badge className="bg-green-100 text-green-800">
                  Subscribed User
                </Badge>
              )}
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {vehicles.length} Vehicles Available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <AddressSearch
                  label="Start Point"
                  field="startPoint"
                  placeNameField="startPlaceName"
                  register={register}
                  setValue={setValue}
                  error={errors.startPlaceName?.message}
                  allowCurrentLocation={true}
                />
                <AddressSearch
                  label="End Point"
                  field="endPoint"
                  placeNameField="endPlaceName"
                  register={register}
                  setValue={setValue}
                  error={errors.endPlaceName?.message}
                  allowCurrentLocation={false}
                />
              </div>

              <Separator />

              <RideFormFields
                vehicles={vehicles}
                register={register}
                errors={errors}
                distanceInKm={distanceInKm}
                perKmRate={perKmRate}
                platformFee={platformFee}
                selectedVehicleId={selectedVehicleId}
                isLoading={isLoading}
                onVehicleChange={handleVehicleChange}
              />

              <Separator />

              <Button
                type="submit"
                disabled={isLoading || !routeData || !dataLoaded || !startPlaceName || !endPlaceName || !driverId}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg font-medium shadow-lg transition-all duration-200"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Ride...
                  </>
                ) : (
                  <>
                    <Navigation className="h-5 w-5 mr-2" />
                    Start Ride
                  </>
                )}
              </Button>

              {!driverId && (
                <p className="text-center text-sm text-red-600">
                  Unable to identify your account. Please refresh the page.
                </p>
              )}

              {!routeData && hasValidRoute && (
                <p className="text-center text-sm text-orange-600">
                  Calculating route... Please wait a moment
                </p>
              )}

              {!hasValidRoute && (
                <p className="text-center text-sm text-orange-600">
                  Please set both start and end points to calculate route
                </p>
              )}

              {(!startPlaceName || !endPlaceName) && (
                <p className="text-center text-sm text-red-600">
                  Please provide names for both start and end locations
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RideFormContainer; 