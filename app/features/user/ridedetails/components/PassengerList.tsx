"use client";

import { Button } from "@/components/ui/button";
import { Navigation, MapPin, UserCheck, UserX } from "lucide-react";
import { useRideSimulation } from "../hooks/useRideSimulation";
import type { Ride } from "../context/RideDetailsContext";

interface PassengerListProps {
  ride: Ride;
}

export default function PassengerList({ ride }: PassengerListProps) {
  const { handlePickup, handleDropoff, pickupActions, dropoffActions, pausedPassengerIds, simulationPaused, currentPausedPassenger } = useRideSimulation();

  // FIXED: Show passenger list for all ride statuses, not just "Started"
  if (!ride.passengers || ride.passengers.length === 0) {
    return null;
  }

  const hasPausedPassengers = pausedPassengerIds[ride._id] && pausedPassengerIds[ride._id].length > 0;
  const currentPausedPassengerId = currentPausedPassenger[ride._id];

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Navigation className="h-5 w-5 text-green-600" />
        Passengers ({ride.passengers.length})
        {simulationPaused[ride._id] && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            PAUSED
          </span>
        )}
      </h4>
      
      <div className="mb-4 space-y-3">
        <h5 className="font-medium text-gray-700">Passenger Details:</h5>
        {ride.passengers.map((passenger, index) => {
          const pickup = ride.pickupPoints?.find((p) => p.passengerId === passenger.passengerId);
          const dropoff = ride.dropoffPoints?.find((p) => p.passengerId === passenger.passengerId);
          const isPausedForThisPassenger = pausedPassengerIds[ride._id]?.includes(passenger.passengerId);
          const isCurrentPausedPassenger = currentPausedPassengerId === passenger.passengerId;
          const isPickupDone = pickupActions[ride._id]?.[passenger.passengerId] || passenger.pickedUp;
          const isDropoffDone = dropoffActions[ride._id]?.[passenger.passengerId] || passenger.droppedOff;
          
          const shouldShowPickupButton = isPausedForThisPassenger && !isPickupDone && pickup;
          const shouldShowDropoffButton = isPausedForThisPassenger && isPickupDone && !isDropoffDone && dropoff && isCurrentPausedPassenger;
          
          return (
            <div key={`${passenger.passengerId}-${index}`} className={`p-3 rounded-lg border ${
              isPausedForThisPassenger ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  {passenger.passengerName || `Passenger ${index + 1}`}
                  {isPausedForThisPassenger && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Action Required
                    </span>
                  )}
                </p>
                <div className="flex gap-2 text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    isPickupDone ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isPickupDone ? 'Picked Up' : 'Not Picked Up'}
                  </span>
                  <span className={`px-2 py-1 rounded-full ${
                    isDropoffDone ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isDropoffDone ? 'Dropped Off' : 'Not Dropped Off'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-sm">
                {pickup && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <strong className="text-blue-700">Pickup:</strong>
                      <p className="text-gray-700">{pickup.placeName || 'Location'}</p>
                    </div>
                    {isPickupDone ? (
                      <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <UserX className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                )}
                {dropoff && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                    <div>
                      <strong className="text-orange-700">Drop-off:</strong>
                      <p className="text-gray-700">{dropoff.placeName || 'Destination'}</p>
                    </div>
                    {isDropoffDone ? (
                      <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <UserX className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                )}
              </div>

              {/* Show cost and distance information */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                {passenger.cost && (
                  <div>
                    <strong>Cost:</strong> ₹{passenger.cost.toFixed(2)}
                  </div>
                )}
                {passenger.distanceKm && (
                  <div>
                    <strong>Distance:</strong> {passenger.distanceKm.toFixed(2)} km
                  </div>
                )}
              </div>

              {isPausedForThisPassenger && (
                <div className="mt-3 flex gap-2">
                  {shouldShowPickupButton && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handlePickup(ride._id, passenger.passengerId)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Confirm Pick Up
                    </Button>
                  )}
                  {shouldShowDropoffButton && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDropoff(ride._id, passenger.passengerId)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Confirm Drop Off
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ride.status === "Started" && !hasPausedPassengers && (
        <div className="text-center text-gray-500 text-sm py-4">
          No actions required. Vehicle is moving to the next destination.
        </div>
      )}
    </div>
  );
}