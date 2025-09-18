import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Vehicle } from "../../../types/vehicle";

interface FormData {
  date: string;
  time: string;
  vehicleId: string;
  passengerCount: number;
  fuelPrice: number;
}

interface RideFormFieldsProps {
  vehicles: Vehicle[];
  register: UseFormRegister<FormData>;
  errors: FieldErrors<FormData>;
  distanceInKm: number | null;
  perKmRate: number | null; // Changed from costPerPerson
  platformFee: number | null;
  selectedVehicleId: string;
}

const RideFormFields: React.FC<RideFormFieldsProps> = ({
  vehicles,
  register,
  errors,
  distanceInKm,
  perKmRate,
  platformFee,
  selectedVehicleId,
}) => {
  const selectedVehicle = vehicles.find((v) => v._id === selectedVehicleId);
  const maxPassengerCount = selectedVehicle?.seatCapacity || 4;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          {...register("date", { required: "Date is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.date && <p className="text-red-600 text-sm">{errors.date.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Time</label>
        <input
          type="time"
          {...register("time", { required: "Time is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.time && <p className="text-red-600 text-sm">{errors.time.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle</label>
        <select
          {...register("vehicleId", { required: "Vehicle is required" })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle._id} value={vehicle._id}>
              {vehicle.vehicleName} (Mileage: {vehicle.mileage} km/l, Seats: {vehicle.seatCapacity})
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="text-red-600 text-sm">{errors.vehicleId.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Passenger Count</label>
        <input
          type="number"
          {...register("passengerCount", {
            required: "Passenger count is required",
            min: { value: 1, message: "Passenger count must be at least 1" },
            max: {
              value: maxPassengerCount,
              message: `Passenger count cannot exceed vehicle seat capacity (${maxPassengerCount})`,
            },
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.passengerCount && <p className="text-red-600 text-sm">{errors.passengerCount.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Fuel Price (per liter)</label>
        <input
          type="number"
          {...register("fuelPrice", { required: "Fuel price is required", min: 0 })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.fuelPrice && <p className="text-red-600 text-sm">{errors.fuelPrice.message}</p>}
      </div>
      {distanceInKm !== null && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Distance</label>
          <p className="mt-1 text-lg font-semibold">{distanceInKm.toFixed(2)} km</p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Platform Fee</label>
        <p className="mt-1 text-lg font-semibold">{platformFee !== null ? `${platformFee.toFixed(2)} INR` : "Calculating..."}</p>
      </div>
      {perKmRate !== null && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Rate Per Kilometer</label>
          <p className="mt-1 text-lg font-semibold">{perKmRate.toFixed(2)} INR/km</p>
        </div>
      )}
    </div>
  );
};

export default RideFormFields;