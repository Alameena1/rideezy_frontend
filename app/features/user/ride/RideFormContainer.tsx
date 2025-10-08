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
}

const RideFormContainer: React.FC = () => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [perKmRate, setPerKmRate] = useState<number | null>(null);
  const [platformFee, setPlatformFee] = useState<number | null>(null);
  const [distanceInKm, setDistanceInKm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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
    const fetchData = async () => {
      try {
        const userData = await clientApiService.user.getProfile();
        console.log("[RideFormContainer] Fetched user data:", userData);
        const driverId = userData.data?._id || userData._id;
        if (!driverId) {
          throw new Error("Failed to fetch driver ID. Please log in again.");
        }
        setValue("driverId", driverId);

        const vehiclesData = await clientApiService.vehicle.getVehicles();
        console.log("[RideFormContainer] Fetched vehicles:", vehiclesData);
        const vehicles = vehiclesData.data?.data || vehiclesData.data || [];
        setVehicles(vehicles);
        if (vehicles.length > 0) setValue("vehicleId", vehicles[0]._id);

        const subscriptionData = await clientApiService.subscription.getSubscriptionStatus();
        console.log("[RideFormContainer] Subscription status:", subscriptionData);
        setIsSubscribed(subscriptionData.data?.isSubscribed || false);
      } catch (error: any) {
        console.error("[RideFormContainer] Fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to load user data. Please try logging in again.",
          background: '#fff',
          color: '#374151',
        });
      }
    };
    fetchData();
  }, [setValue]);

  useEffect(() => {
    if (routeData && vehicleId && passengerCount !== undefined && fuelPrice !== undefined) {
      const distanceInKm = routeData.distance / 1000;
      setDistanceInKm(distanceInKm);
      const selectedVehicle = vehicles.find((v) => v._id === vehicleId);
      const fuelNeeded = distanceInKm / (selectedVehicle?.mileage || 1);
      const totalFuelCost = fuelNeeded * fuelPrice;
      const totalPeople = passengerCount + 1;
      const platformFee = isSubscribed ? 0 : Math.ceil(totalFuelCost * 0.1);
      setPlatformFee(platformFee);
      const totalRideCost = totalFuelCost + platformFee;
      setPerKmRate(totalRideCost / distanceInKm);
    }
  }, [routeData, vehicleId, passengerCount, fuelPrice, vehicles, isSubscribed]);

  const onSubmit = async (data: FormData) => {
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

    const selectedVehicle = vehicles.find((v) => v._id === data.vehicleId);
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
      passengerCount: Number(data.passengerCount),
      fuelPrice: Number(data.fuelPrice),
      vehicleId: data.vehicleId,
      fuelCost: (routeData.distance / 1000) * (Number(data.fuelPrice) / (vehicles.find(v => v._id === data.vehicleId)?.mileage || 1)),
      distance: Number(routeData.distance) / 1000,
      routeGeometry: JSON.stringify(routeData.geometry),
      platformFee: platformFee || 0,
      driverId: data.driverId,
    };

    console.log("[RideFormContainer] Submitting rideData:", rideData);

    setIsLoading(true);
    try {
      const response = await clientApiService.ride.startRide(rideData);
      console.log("[RideFormContainer] Start ride response:", response);
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
      console.error("[RideFormContainer] Ride submit error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to start ride. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        background: '#fff',
        color: '#374151',
      });
      if (error.response?.status === 401) {
        console.log("[RideFormContainer] Unauthorized, redirecting to login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
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
        {/* Map Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MapPin className="h-5 w-5 text-blue-600" />
              Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Form Section */}
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
                {vehicles.length} Vehicles
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Address Search */}
              <div className="space-y-4">
                <AddressSearch
                  label="Start Point"
                  field="startPoint"
                  placeNameField="startPlaceName"
                  register={register}
                  setValue={setValue}
                  error={errors.startPoint?.message}
                  allowCurrentLocation={true}
                />
                <AddressSearch
                  label="End Point"
                  field="endPoint"
                  placeNameField="endPlaceName"
                  register={register}
                  setValue={setValue}
                  error={errors.endPoint?.message}
                  allowCurrentLocation={false}
                />
              </div>

              <Separator />

              {/* Ride Form Fields */}
              <RideFormFields
                vehicles={vehicles}
                register={register}
                errors={errors}
                distanceInKm={distanceInKm}
                perKmRate={perKmRate}
                platformFee={platformFee}
                selectedVehicleId={vehicleId}
                isLoading={isLoading}
              />

              <Separator />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !routeData}
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

              {!routeData && (
                <p className="text-center text-sm text-orange-600">
                  Please set both start and end points to calculate route
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