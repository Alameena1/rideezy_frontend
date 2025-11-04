"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Edit, Trash2, RefreshCcw, Car, Users, Gauge, FileText } from "lucide-react";
import VehicleForm from "./VehicleForm";
import { clientApiService } from "@/services/client/client-api";
import Swal from "sweetalert2";
import { useVehicleStore } from "../../../stores/vehicleStore";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insurance?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  pollution?: {
    number: string;
    image: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string;
  mileage: number;
  seatCapacity: number;
  user: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  note?: string;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onDelete?: (vehicleId: string) => void;
  onReapply?: (vehicleId: string) => void;
  onImageLoad?: () => void;
  onImageError?: (imageUrl: string) => void;
}

// Debug image component
const DebugImage = ({ src, alt, onLoad, onError }: { 
  src: string; 
  alt: string;
  onLoad?: () => void;
  onError?: (src: string) => void;
}) => {
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    console.log(`✅ Image loaded successfully: ${src}`);
    onLoad?.();
  };

  const handleError = () => {
    console.error(`❌ Failed to load image: ${src}`);
    setHasError(true);
    onError?.(src);
  };

  return (
    <img
      src={hasError ? "/placeholder.svg" : src}
      alt={alt}
      className="w-full h-full object-cover"
      onLoad={handleLoad}
      onError={handleError}
      crossOrigin="anonymous" // Add this for CORS issues
    />
  );
};

export default function VehicleCard({ vehicle, onDelete, onReapply, onImageLoad, onImageError }: VehicleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { updateVehicle } = useVehicleStore();

  console.log(`Rendering VehicleCard for: ${vehicle.vehicleName}`, {
    vehicleImage: vehicle.vehicleImage,
    insuranceImage: vehicle.insurance?.image,
    pollutionImage: vehicle.pollution?.image
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Approved":
        return { 
          color: "bg-green-100 text-green-800 border-green-200",
          icon: "✅"
        };
      case "Rejected":
        return { 
          color: "bg-red-100 text-red-800 border-red-200",
          icon: "❌"
        };
      default:
        return { 
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: "⏳"
        };
    }
  };

  const statusConfig = getStatusConfig(vehicle.status);

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${vehicle.vehicleName}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      background: '#fff',
      color: '#374151',
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        await useVehicleStore.getState().deleteVehicle(vehicle._id);
        onDelete?.(vehicle._id);
        Swal.fire({
          title: "Deleted!",
          text: `${vehicle.vehicleName} has been deleted.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#374151',
        });
      } catch (error: any) {
        setError(error.message || "Failed to delete vehicle. Please try again.");
        Swal.fire({
          title: "Error!",
          text: error.message || "Failed to delete the vehicle. Please try again.",
          icon: "error",
          confirmButtonColor: "#3085d6",
          background: '#fff',
          color: '#374151',
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleReapply = async () => {
    const result = await Swal.fire({
      title: "Reapply Vehicle?",
      text: `Do you want to reapply ${vehicle.vehicleName} for approval?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, reapply!",
      cancelButtonText: "Cancel",
      background: '#fff',
      color: '#374151',
    });

    if (result.isConfirmed) {
      setIsReapplying(true);
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex flex-col lg:flex-row">
        {/* Vehicle Image */}
        <div className="lg:w-1/4 h-48 lg:h-auto relative">
          <DebugImage 
            src={vehicle.vehicleImage || "/placeholder.svg"}
            alt={vehicle.vehicleName}
            onLoad={onImageLoad}
            onError={onImageError}
          />
          <div className="absolute top-3 left-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge className={`${statusConfig.color} font-medium`}>
                    <span className="mr-1">{statusConfig.icon}</span>
                    {vehicle.status}
                  </Badge>
                </TooltipTrigger>
                {vehicle.status === "Rejected" && vehicle.note && (
                  <TooltipContent>
                    <p className="max-w-xs">Reason: {vehicle.note}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="flex-1 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{vehicle.vehicleName}</h3>
                <p className="text-gray-600 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  {vehicle.vehicleType}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>
                    <strong className="text-gray-500">License:</strong> {vehicle.licensePlate}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vehicle.color || '#6b7280' }} />
                  <span>
                    <strong className="text-gray-500">Color:</strong> {vehicle.color || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Gauge className="h-4 w-4 text-green-500" />
                  <span>
                    <strong className="text-gray-500">Mileage:</strong> {vehicle.mileage} km
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>
                    <strong className="text-gray-500">Seats:</strong> {vehicle.seatCapacity}
                  </span>
                </div>
                {vehicle.insurance?.number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span>
                      <strong className="text-gray-500">Insurance:</strong> {vehicle.insurance.number}
                    </span>
                  </div>
                )}
                {vehicle.pollution?.number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span>
                      <strong className="text-gray-500">Pollution:</strong> {vehicle.pollution.number}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Registered on {new Date(vehicle.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex lg:flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              {vehicle.status === "Rejected" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={handleReapply}
                  disabled={isReapplying}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {isReapplying ? "Reapplying..." : "Reapply"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit/Reapply Form */}
      {(isEditing || isReapplying) && (
        <div className="border-t border-gray-100 bg-white p-6">
          <VehicleForm
            vehicleId={vehicle._id}
            onSubmit={async (updatedVehicle) => {
              try {
                if (isReapplying) {
                  await clientApiService.vehicle.reapplyVehicle(vehicle._id, updatedVehicle);
                  onReapply?.(vehicle._id);
                  Swal.fire({
                    title: "Reapplied!",
                    text: `${vehicle.vehicleName} has been reapplied.`,
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#374151',
                  });
                } else {
                  await updateVehicle(vehicle._id, updatedVehicle);
                  Swal.fire({
                    title: "Updated!",
                    text: `${vehicle.vehicleName} has been updated.`,
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#374151',
                  });
                }
                setIsEditing(false);
                setIsReapplying(false);
              } catch (error: any) {
                setError(error.response?.data?.message || "Failed to save vehicle. Please try again.");
                Swal.fire({
                  title: "Error!",
                  text: error.response?.data?.message || "Failed to save the vehicle. Please try again.",
                  icon: "error",
                  confirmButtonColor: "#3085d6",
                  background: '#fff',
                  color: '#374151',
                });
              }
            }}
            onCancel={() => {
              setIsEditing(false);
              setIsReapplying(false);
            }}
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="m-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}