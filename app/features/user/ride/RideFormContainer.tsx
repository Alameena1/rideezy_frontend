"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import api, { apiService } from "@/services/api";
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

const RideFormContainer: React.FC = () => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [costPerPerson, setCostPerPerson] = useState<number | null>(null);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await (api as any).user.getProfile();
        console.log("[RideFormContainer] Fetched user data:", userData);
        const driverId = userData._id || userData.data?._id;
        if (!driverId) {
          throw new Error("Failed to fetch driver ID. Please log in again.");
        }
        setValue("driverId", driverId);

        const vehiclesData = await (api as any).vehicle.getVehicles();
        console.log("[RideFormContainer] Fetched vehicles:", vehiclesData);
        setVehicles(vehiclesData);
        if (vehiclesData.length > 0) setValue("vehicleId", vehiclesData[0]._id);

        const subscriptionData = await apiService.subscription.getSubscriptionStatus();
        console.log("[RideFormContainer] Subscription status:", subscriptionData);
        setIsSubscribed(subscriptionData.isSubscribed || false);
      } catch (error: any) {
        console.error("[RideFormContainer] Fetch error:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Failed to load user data. Please try logging in again.",
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
      setCostPerPerson(totalRideCost / totalPeople);
    }
  }, [routeData, vehicleId, passengerCount, fuelPrice, isSubscribed]);

  const onSubmit = async (data: FormData) => {
    if (!routeData || !routeData.distance || !routeData.geometry) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Please calculate a valid route before submitting.",
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
      costPerPerson: costPerPerson || 0,
      driverId: data.driverId,
    };

    console.log("[RideFormContainer] Submitting rideData:", rideData);

    setIsLoading(true);
    try {
      const response = await apiService.ride.startRide(rideData);
      console.log("[RideFormContainer] Start ride response:", response);
      Swal.fire({
        icon: "success",
        title: "Ride Initiated Successfully!",
        text: platformFee > 0 ? `A platform fee of ₹${platformFee} has been applied and deducted from your wallet.` : "No platform fee applied.",
        showCancelButton: true,
        confirmButtonText: "View Ride",
        cancelButtonText: "Go Home",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
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
      });
      if (error.response?.status === 401) {
        console.log("[RideFormContainer] Unauthorized, redirecting to login");
        // Avoid automatic redirect; let user decide
        // window.location.href = "/login";
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Start a New Ride</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <MapComponent startPoint={startPoint} endPoint={endPoint} routeData={routeData} setRouteData={setRouteData} />
        </div>
        <div className="w-full md:w-1/2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AddressSearch
              label="Start Point"
              field="startPoint"
              placeNameField="startPlaceName"
              register={register}
              setValue={setValue}
              error={errors.startPoint?.message}
            />
            <AddressSearch
              label="End Point"
              field="endPoint"
              placeNameField="endPlaceName"
              register={register}
              setValue={setValue}
              error={errors.endPoint?.message}
            />
            <RideFormFields
              vehicles={vehicles}
              register={register}
              errors={errors}
              distanceInKm={distanceInKm}
              costPerPerson={costPerPerson}
              platformFee={platformFee}
            />
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Start Ride"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RideFormContainer;