"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, RefreshCcw } from "lucide-react";
import VehicleForm from "../../user/vehicles/VehicleForm";
import { apiService } from "@/services/api";
import Swal from "sweetalert2";

interface Vehicle {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  licensePlate: string;
  color?: string;
  insuranceNumber?: string;
  status: "Pending" | "Approved" | "Rejected";
  vehicleImage: string; // Updated to match vehicleApi
  documentImage: string; // Added
  mileage: number;
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
  onReapply?: (vehicleId: string) => void; // Added for reapply callback
}

export default function VehicleCard({ vehicle, onDelete, onReapply }: VehicleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReapplying, setIsReapplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${vehicle.vehicleName}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        await apiService.vehicle.deleteVehicle(vehicle._id);
        onDelete?.(vehicle._id);
        Swal.fire({
          title: "Deleted!",
          text: `${vehicle.vehicleName} has been deleted.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        setError("Failed to delete vehicle. Please try again.");
        Swal.fire({
          title: "Error!",
          text: "Failed to delete the vehicle. Please try again.",
          icon: "error",
          confirmButtonColor: "#3085d6",
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
    });

    if (result.isConfirmed) {
      setIsReapplying(true);
    }
  };

  return (
    <div className="overflow-hidden border rounded-lg">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/4 h-48 sm:h-auto">
          <img
            src={vehicle.vehicleImage || "/placeholder.svg"} // Updated to vehicleImage
            alt={vehicle.vehicleName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-4 sm:p-6 flex flex-col sm:flex-row justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{vehicle.vehicleName}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className={getStatusBadgeColor(vehicle.status)}>{vehicle.status}</Badge>
                    </TooltipTrigger>
                    {vehicle.status === "Rejected" && vehicle.note && (
                      <TooltipContent>
                        <p>Reason: {vehicle.note}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-gray-500">{vehicle.vehicleType}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500 font-medium">License:</span> {vehicle.licensePlate}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Color:</span> {vehicle.color || "N/A"}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Insurance:</span> {vehicle.insuranceNumber || "N/A"}
              </div>
              <div>
                <span className="text-gray-500 font-medium">Mileage:</span> {vehicle.mileage} km
              </div>
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 mt-4 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </Button>
            {vehicle.status === "Rejected" && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleReapply}
                disabled={isReapplying}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>{isReapplying ? "Reapplying..." : "Reapply"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      {(isEditing || isReapplying) && (
        <div className="p-4">
          <VehicleForm
            vehicleId={vehicle._id}
            initialData={{
              vehicleName: vehicle.vehicleName,
              vehicleType: vehicle.vehicleType,
              licensePlate: vehicle.licensePlate,
              color: vehicle.color,
              insuranceNumber: vehicle.insuranceNumber,
              vehicleImage: vehicle.vehicleImage,
              documentImage: vehicle.documentImage,
              mileage: vehicle.mileage,
            }}
            onSubmit={async (updatedVehicle) => {
              try {
                if (isReapplying) {
                  await apiService.vehicle.reapplyVehicle(vehicle._id, updatedVehicle);
                  onReapply?.(vehicle._id);
                  Swal.fire({
                    title: "Reapplied!",
                    text: `${vehicle.vehicleName} has been reapplied.`,
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                  });
                } else {
                  await apiService.vehicle.updateVehicle(vehicle._id, updatedVehicle);
                  Swal.fire({
                    title: "Updated!",
                    text: `${vehicle.vehicleName} has been updated.`,
                    icon: "success",
                    timer: 1500,
                    showConfirmButton: false,
                  });
                }
                setIsEditing(false);
                setIsReapplying(false);
              } catch (error) {
                setError("Failed to save vehicle. Please try again.");
                Swal.fire({
                  title: "Error!",
                  text: "Failed to save the vehicle. Please try again.",
                  icon: "error",
                  confirmButtonColor: "#3085d6",
                });
              }
            }}
            onCancel={() => {
              setIsEditing(false);
              setIsReapplying(false);
            }}
            setError={setError}
          />
        </div>
      )}
      {error && <div className="p-4 text-red-600">{error}</div>}
    </div>
  );
}