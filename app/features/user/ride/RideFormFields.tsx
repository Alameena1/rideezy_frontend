import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";

interface FormData {
  date: string;
  time: string;
  vehicleId: string;
  passengerCount: number;
  fuelPrice: number;
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
}) => {
  const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
  const maxPassengerCount = selectedVehicle?.seatCapacity || 4;
  const availableSeats = maxPassengerCount - 1; // Subtract driver seat

  return (
    <div className="space-y-4">
      {/* Date Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          {...register("date", { required: "Date is required" })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
          min={new Date().toISOString().split('T')[0]}
          disabled={isLoading}
        />
        {errors.date && (
          <p className="text-red-600 text-sm mt-1">{errors.date.message}</p>
        )}
      </div>

      {/* Time Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Time
        </label>
        <input
          type="time"
          {...register("time", { required: "Time is required" })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
          disabled={isLoading}
        />
        {errors.time && (
          <p className="text-red-600 text-sm mt-1">{errors.time.message}</p>
        )}
      </div>

      {/* Vehicle Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vehicle
        </label>
        <select
          {...register("vehicleId", { required: "Vehicle is required" })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
          disabled={isLoading || vehicles.length === 0}
        >
          <option value="">
            {vehicles.length === 0 ? "No vehicles available" : "Select a vehicle"}
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle._id} value={vehicle._id}>
              {vehicle.vehicleName} 
              {vehicle.vehicleType && ` (${vehicle.vehicleType})`}
              {` - ${vehicle.mileage} km/l, ${vehicle.seatCapacity} seats`}
            </option>
          ))}
        </select>
        {errors.vehicleId && (
          <p className="text-red-600 text-sm mt-1">{errors.vehicleId.message}</p>
        )}
        {selectedVehicle && (
          <p className="text-xs text-gray-500 mt-1">
            Available passenger seats: {availableSeats}
          </p>
        )}
      </div>

      {/* Passenger Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Passenger Count
        </label>
        <input
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
          min="1"
          max={availableSeats}
          disabled={isLoading}
        />
        {errors.passengerCount && (
          <p className="text-red-600 text-sm mt-1">{errors.passengerCount.message}</p>
        )}
      </div>

      {/* Fuel Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fuel Price (₹ per liter)
        </label>
        <input
          type="number"
          {...register("fuelPrice", { 
            required: "Fuel price is required", 
            min: { 
              value: 0, 
              message: "Fuel price cannot be negative" 
            },
            valueAsNumber: true,
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
          step="0.01"
          min="0"
          placeholder="e.g., 95.50"
          disabled={isLoading}
        />
        {errors.fuelPrice && (
          <p className="text-red-600 text-sm mt-1">{errors.fuelPrice.message}</p>
        )}
      </div>

      {/* Calculated Information */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h3 className="font-medium text-gray-900 mb-2">Ride Summary</h3>
        
        {/* Distance */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Distance:</span>
          <span className="text-lg font-semibold text-gray-900">
            {distanceInKm !== null ? `${distanceInKm.toFixed(2)} km` : "---"}
          </span>
        </div>

        {/* Platform Fee */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Platform Fee:</span>
          <span className={`text-lg font-semibold ${
            platformFee && platformFee > 0 ? 'text-orange-600' : 'text-green-600'
          }`}>
            {platformFee !== null ? 
              `₹${platformFee.toFixed(2)}` : 
              "Calculating..."
            }
          </span>
        </div>

        {/* Rate Per Kilometer */}
        {perKmRate !== null && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Rate Per Kilometer:</span>
            <span className="text-lg font-semibold text-blue-600">
              ₹{perKmRate.toFixed(2)}/km
            </span>
          </div>
        )}

        {/* Total Cost Estimate */}
        {distanceInKm !== null && perKmRate !== null && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm font-bold text-gray-900">Estimated Total:</span>
            <span className="text-lg font-bold text-green-600">
              ₹{(distanceInKm * perKmRate).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500">
        <p>• Platform fee is 10% of fuel cost for non-subscribed users</p>
        <p>• Fuel cost is calculated based on vehicle mileage and distance</p>
      </div>
    </div>
  );
};

export default RideFormFields;