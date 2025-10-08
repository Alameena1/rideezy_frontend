"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; 
import { useRouter } from "next/navigation"; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Car } from "lucide-react";
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

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    if (status === "loading") return;
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

  const handleReapplyVehicle = (vehicleId: string) => {
    // Reapply logic here
    fetchVehicles(); // Refresh the list
  };

  if (status === "loading") {
    return (
      <MainLayout activeItem="Vehicles">
        <div className="mx-auto max-w-6xl p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="Vehicles">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Vehicles
          </h1>
          <p className="text-gray-600 text-lg">Manage and track your registered vehicles</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{currentDate}</span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Vehicle Management</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {vehicles.length} vehicles
                    </Badge>
                    <span>•</span>
                    <span>Register and manage your vehicles for ride sharing</span>
                  </CardDescription>
                </div>
              </div>
              
              <Button
                onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                className={`flex items-center gap-2 ${
                  isAddingVehicle 
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" 
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
                size="lg"
              >
                <Plus className="h-5 w-5" />
                {isAddingVehicle ? "Cancel" : "Register Vehicle"}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
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
                onReapply={handleReapplyVehicle}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}