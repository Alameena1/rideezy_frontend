import { Button } from "@/components/ui/button";
import { Navigation, MapPin } from "lucide-react";
import { useRideSimulation } from "../hooks/useRideSimulation";
import type { Ride } from "../context/RideDetailsContext";

interface PassengerListProps {
  ride: Ride;
}

export default function PassengerList({ ride }: PassengerListProps) {
  const { handlePickup, handleDropoff, pickupActions, dropoffActions, pausedPassengerIds } = useRideSimulation();

  if (ride.status !== "Started") {
    return null;
  }

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Navigation className="h-5 w-5 text-green-600" />
        Passenger Actions
      </h4>
      
      {/* Show pickup and dropoff points */}
      <div className="mb-4 space-y-3">
        <h5 className="font-medium text-gray-700">Passenger Locations:</h5>
        {ride.passengers.map((passenger, index) => {
          const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
          const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
          
          return (
            <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-gray-900">{passenger.passengerName}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
                {pickup && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span><strong>Pickup:</strong> {pickup.placeName}</span>
                  </div>
                )}
                {dropoff && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span><strong>Drop-off:</strong> {dropoff.placeName}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {ride.passengers.map((passenger, index) => {
          const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
          const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
          const isPausedForPickup = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && !pickupActions[ride._id]?.[passenger.passengerId];
          const isPausedForDropoff = pausedPassengerIds[ride._id]?.includes(passenger.passengerId) && pickupActions[ride._id]?.[passenger.passengerId] && !dropoffActions[ride._id]?.[passenger.passengerId];

          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{passenger.passengerName}</p>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>Pickup: {pickupActions[ride._id]?.[passenger.passengerId] ? "✓ Completed" : "Pending"}</span>
                  <span>Dropoff: {dropoffActions[ride._id]?.[passenger.passengerId] ? "✓ Completed" : "Pending"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {isPausedForPickup && pickup && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handlePickup(ride._id, passenger.passengerId)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm Pick Up
                  </Button>
                )}
                {isPausedForDropoff && dropoff && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDropoff(ride._id, passenger.passengerId)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Confirm Drop Off
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}