"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // Add useSession
import { useRouter } from "next/navigation"; // Add useRouter
import useAuth from "@/app/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import VehicleForm from "../../features/user/vehicles/VehicleForm";
import VehicleList from "../../features/user/vehicles/VehicleList";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "@/app/comp/MainLayout";
import { useVehicleStore } from "../../stores/vehicleStore";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  vehicleImage?: string;
  documentImage?: string;
  status: "Pending" | "Approved" | "Rejected";
  imageUrl: string;
  mileage: number;
  seatCapacity: number;
}

export default function VehicleDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const { vehicles, isLoading, error, fetchVehicles, setupSocketListeners } = useVehicleStore();

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    if (status === "unauthenticated") {
      router.push("/user/login?error=Please%20log%20in%20to%20access%20vehicles");
      return;
    }
    fetchVehicles();
    setupSocketListeners();
  }, [status, fetchVehicles, setupSocketListeners, router]);

  const handleAddVehicle = (newVehicle: Vehicle) => {
    useVehicleStore.getState().addVehicle(newVehicle);
    setIsAddingVehicle(false);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    useVehicleStore.getState().deleteVehicle(vehicleId);
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <MainLayout activeItem="Vehicles">
      <div className="mx-auto max-w-5xl">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Your Vehicles</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </CardDescription>
              </div>
              <button
                onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                className={`flex items-center gap-2 px-4 py-2 rounded ${
                  isAddingVehicle ? "border border-gray-300" : "bg-blue-600 text-white"
                }`}
              >
                {isAddingVehicle ? "Cancel" : "Register New Vehicle"}
              </button>
            </div>
          </CardHeader>
          <div className="p-6">
            {error && <ErrorAlert message={error} />}
            {isAddingVehicle ? (
              <VehicleForm
                onSubmit={handleAddVehicle}
                onCancel={() => setIsAddingVehicle(false)}
              />
            ) : (
              <VehicleList
                vehicles={vehicles}
                isLoading={isLoading}
                onDelete={handleDeleteVehicle}
              />
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}