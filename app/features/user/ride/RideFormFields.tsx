import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Car, Users, Fuel, MapPin, DollarSign, Shield } from "lucide-react";

interface FormData {
  date: string;
  time: string;
  vehicleId: string;
  passengerCount: number;
  fuelPrice: number;
  startPlaceName: string;
  endPlaceName: string;
}

interface Vehicle {
  _id: string;
  vehicleName: string;
  mileage: number;
  seatCapacity: number;
  vehicleType?: string;
}

interface RideFormFieldsProps {
  vehicles: Vehicle[];
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  distanceInKm: number | null;
  perKmRate: number | null;
  platformFee: number | null;
  selectedVehicleId: string;
  isLoading?: boolean;
  onVehicleChange?: (value: string) => void;
  startPlaceName?: string;
  endPlaceName?: string;
  onStartPlaceNameChange?: (value: string) => void;
  onEndPlaceNameChange?: (value: string) => void;
}

const RideFormFields: React.FC<RideFormFieldsProps> = ({
  vehicles,
  register,
  errors,
  distanceInKm,
  perKmRate,
  platformFee,
  selectedVehicleId,
  isLoading = false,
  onVehicleChange,
  startPlaceName = "",
  endPlaceName = "",
  onStartPlaceNameChange,
  onEndPlaceNameChange,
}) => {
  const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
  const maxPassengerCount = selectedVehicle?.seatCapacity || 4;
  const availableSeats = maxPassengerCount - 1;

  const handleVehicleSelect = (value: string) => {
    if (onVehicleChange) {
      onVehicleChange(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Date
          </Label>
          <Input
            id="date"
            type="date"
            {...register("date", { required: "Date is required" })}
            className="w-full"
            min={new Date().toISOString().split('T')[0]}
            disabled={isLoading}
          />
          {errors.date && (
            <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="time" className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Time
          </Label>
          <Input
            id="time"
            type="time"
            {...register("time", { required: "Time is required" })}
            className="w-full"
            disabled={isLoading}
          />
          {errors.time && (
            <p className="text-red-600 text-sm mt-1">{errors.time.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startPlaceName" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            Start Location Name
          </Label>
          <Input
            id="startPlaceName"
            type="text"
            {...register("startPlaceName", { required: "Start location name is required" })}
            className="w-full"
            placeholder="e.g., Home, Office, Airport"
            disabled={isLoading}
            value={startPlaceName}
            onChange={(e) => onStartPlaceNameChange?.(e.target.value)}
          />
          {errors.startPlaceName && (
            <p className="text-red-600 text-sm mt-1">{errors.startPlaceName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endPlaceName" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-600" />
            End Location Name
          </Label>
          <Input
            id="endPlaceName"
            type="text"
            {...register("endPlaceName", { required: "End location name is required" })}
            className="w-full"
            placeholder="e.g., Work, Mall, Station"
            disabled={isLoading}
            value={endPlaceName}
            onChange={(e) => onEndPlaceNameChange?.(e.target.value)}
          />
          {errors.endPlaceName && (
            <p className="text-red-600 text-sm mt-1">{errors.endPlaceName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vehicleId" className="text-sm font-medium flex items-center gap-2">
          <Car className="h-4 w-4 text-blue-600" />
          Vehicle
        </Label>
        <Select
          value={selectedVehicleId}
          onValueChange={handleVehicleSelect}
          disabled={isLoading || vehicles.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={vehicles.length === 0 ? "No vehicles available" : "Select a vehicle"} />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle._id} value={vehicle._id}>
                <div className="flex flex-col">
                  <span className="font-medium">{vehicle.vehicleName}</span>
                  <span className="text-xs text-gray-500">
                    {vehicle.vehicleType && `${vehicle.vehicleType} • `}
                    {vehicle.mileage} km/l • {vehicle.seatCapacity} seats
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vehicleId && (
          <p className="text-red-600 text-sm mt-1">{errors.vehicleId.message}</p>
        )}
        {selectedVehicle && (
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {selectedVehicle.vehicleName}
                </span>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                {selectedVehicle.vehicleType || "Vehicle"}
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-blue-600">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{selectedVehicle.seatCapacity} seats total</span>
              </div>
              <div className="flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                <span>{selectedVehicle.mileage} km/l</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
              <Users className="h-3 w-3" />
              Available passenger seats: {availableSeats}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="passengerCount" className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          Passenger Count
        </Label>
        <Input
          id="passengerCount"
          type="number"
          {...register("passengerCount", {
            required: "Passenger count is required",
            min: { 
              value: 1, 
              message: "At least 1 passenger is required" 
            },
            max: {
              value: availableSeats,
              message: `Cannot exceed available seats (${availableSeats})`,
            },
            valueAsNumber: true,
          })}
          className="w-full"
          min="1"
          max={availableSeats}
          disabled={isLoading || !selectedVehicle}
          placeholder={selectedVehicle ? `1 to ${availableSeats}` : "Select a vehicle first"}
        />
        {errors.passengerCount && (
          <p className="text-red-600 text-sm mt-1">{errors.passengerCount.message}</p>
        )}
        {selectedVehicle && (
          <p className="text-xs text-gray-500 mt-1">
            You can take up to {availableSeats} passengers (driver excluded)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fuelPrice" className="text-sm font-medium flex items-center gap-2">
          <Fuel className="h-4 w-4 text-blue-600" />
          Fuel Price (₹ per liter)
        </Label>
        <Input
          id="fuelPrice"
          type="number"
          {...register("fuelPrice", { 
            required: "Fuel price is required", 
            min: { 
              value: 0, 
              message: "Fuel price cannot be negative" 
            },
            valueAsNumber: true,
          })}
          className="w-full"
          step="0.01"
          min="0"
          placeholder="e.g., 95.50"
          disabled={isLoading}
        />
        {errors.fuelPrice && (
          <p className="text-red-600 text-sm mt-1">{errors.fuelPrice.message}</p>
        )}
      </div>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Ride Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Distance</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {distanceInKm !== null ? `${distanceInKm.toFixed(2)} km` : "---"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Platform Fee</span>
            </div>
            <span className={`text-lg font-semibold ${
              platformFee && platformFee > 0 ? 'text-orange-600' : 'text-green-600'
            }`}>
              {platformFee !== null ? 
                `₹${platformFee.toFixed(2)}` : 
                "Calculating..."
              }
            </span>
          </div>

          {perKmRate !== null && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Rate Per Kilometer</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">
                ₹{perKmRate.toFixed(2)}/km
              </span>
            </div>
          )}

          {distanceInKm !== null && perKmRate !== null && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Estimated Total</span>
                <span className="text-xl font-bold text-green-600">
                  ₹{(distanceInKm * perKmRate).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 bg-blue-50">
        <CardContent className="p-4">
          <div className="text-sm text-blue-700 space-y-1">
            <p className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Platform fee is 10% of fuel cost for non-subscribed users
            </p>
            <p className="flex items-center gap-2">
              <Fuel className="h-3 w-3" />
              Fuel cost is calculated based on vehicle mileage and distance
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              Passenger count excludes the driver
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RideFormFields;