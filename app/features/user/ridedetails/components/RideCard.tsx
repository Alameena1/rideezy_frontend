"use client";

import { memo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Car, MapPin, Users, DollarSign, Calendar, Clock, Fuel, UserCheck, UserX, Pause } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import RideActions from "./RideActions";
import RideMap from "./RideMap";
import PassengerList from "./PassengerList";
import PendingRequests from "./PendingRequests";
import StatusBadge from "./StatusBadge";
import { useRideSimulation } from "../hooks/useRideSimulation";
import type { Ride } from "../context/RideDetailsContext";

interface RideCardProps {
  ride: Ride;
}

function RideCardComponent({ ride }: RideCardProps) {
  const { expandedRide, toggleRideExpansion, placeNames } = useRideDetails();
  const { 
    simulationPaused, 
    currentPausedPassenger, 
    handlePickup, 
    handleDropoff,
    manualPause 
  } = useRideSimulation();
  
  const isExpanded = expandedRide === ride._id;
  const seatsLeft = ride.passengerCount - (ride.passengers?.length || 0);
  const hasPendingRequests = ride.pendingRequests?.some(req => req.status === "pending");

  const place = placeNames[ride._id] || { 
    startPlace: ride.startPoint, 
    endPlace: ride.endPoint 
  };

  // Check if simulation is paused for this ride
  const isSimulationPaused = simulationPaused[ride._id];
  const pausedPassengerId = currentPausedPassenger[ride._id];
  const isManuallyPaused = manualPause[ride._id];

  // Find the paused passenger details
  const pausedPassenger = pausedPassengerId && ride.passengers 
    ? ride.passengers.find(p => p.passengerId === pausedPassengerId) 
    : null;

  // Find if it's pickup or dropoff
  const isPickupPause = pausedPassengerId && pausedPassenger && !pausedPassenger.pickedUp;
  const isDropoffPause = pausedPassengerId && pausedPassenger && pausedPassenger.pickedUp && !pausedPassenger.droppedOff;

  // Format the place names to show only the first part for better readability
  const formatPlaceName = (placeName: string) => {
    if (placeName.includes(',')) {
      return placeName.split(',')[0];
    }
    return placeName;
  };

  const handlePickupAction = async () => {
    if (pausedPassengerId) {
      await handlePickup(ride._id, pausedPassengerId);
    }
  };

  const handleDropoffAction = async () => {
    if (pausedPassengerId) {
      await handleDropoff(ride._id, pausedPassengerId);
    }
  };

  return (
    <Card key={ride._id} className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {formatPlaceName(place.startPlace)} → {formatPlaceName(place.endPlace)}
                </CardTitle>
                <CardDescription className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    {ride.date !== "N/A" ? new Date(ride.date).toLocaleDateString("en-GB") : "N/A"}
                  </div>
                  {ride.time && ride.time !== "N/A" && (
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4" />
                      {ride.time}
                    </div>
                  )}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={ride.status} />
              <Badge variant="outline" className="bg-white border-gray-300">
                <Users className="h-3 w-3 mr-1" />
                {ride.passengers?.length || 0}/{ride.passengerCount} passengers
              </Badge>
              <Badge variant="outline" className="bg-white border-gray-300">
                <MapPin className="h-3 w-3 mr-1" />
                {(ride.distanceKm ?? 0).toFixed(1)} km
              </Badge>
              {hasPendingRequests && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  <Users className="h-3 w-3 mr-1" />
                  Pending Requests
                </Badge>
              )}
              {isSimulationPaused && !isManuallyPaused && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Auto-Paused
                </Badge>
              )}
              {isManuallyPaused && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Pause className="h-3 w-3 mr-1" />
                  Manually Paused
                </Badge>
              )}
            </div>
          </div>

          <RideActions ride={ride} isExpanded={isExpanded} onToggleExpand={() => toggleRideExpansion(ride._id)} />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-6">
          <Separator className="mb-6" />
          
          {/* Enhanced Pause Action Banner */}
          {(isSimulationPaused || isManuallyPaused) && (
            <div className="mb-6 p-4 rounded-lg border-2 animate-pulse">
              {isSimulationPaused && pausedPassenger ? (
                // Auto-pause for pickup/dropoff
                <div className="bg-yellow-50 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        {isPickupPause ? (
                          <UserCheck className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <UserX className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-yellow-800">
                          {isPickupPause ? "Passenger Pickup Required" : "Passenger Dropoff Required"}
                        </h4>
                        <p className="text-yellow-700 text-sm">
                          {isPickupPause 
                            ? `Pick up ${pausedPassenger.passengerName} to continue the ride.`
                            : `Drop off ${pausedPassenger.passengerName} to continue the ride.`
                          }
                        </p>
                        <p className="text-yellow-600 text-xs mt-1">
                          ⚡ Auto-paused when vehicle reached {isPickupPause ? 'pickup' : 'dropoff'} location
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={isPickupPause ? handlePickupAction : handleDropoffAction}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      {isPickupPause ? "Confirm Pickup" : "Confirm Dropoff"}
                    </Button>
                  </div>
                </div>
              ) : isManuallyPaused ? (
                // Manual pause
                <div className="bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Pause className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-800">
                          Ride Manually Paused
                        </h4>
                        <p className="text-blue-700 text-sm">
                          Use the "Resume" button in the ride actions to continue the simulation.
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          ⏸️ You manually paused the ride simulation
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      Manual Pause
                    </Badge>
                  </div>
                </div>
              ) : (
                // Generic pause
                <div className="bg-gray-50 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Pause className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Ride Paused
                        </h4>
                        <p className="text-gray-700 text-sm">
                          The ride simulation is currently paused.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                      Paused
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ride Information */}
            <div className="space-y-6">
              <RideInfo ride={ride} seatsLeft={seatsLeft} />
              <PassengerList ride={ride} />
            </div>

            {/* Map */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-600" />
                Route Map
              </h4>
              <RideMap ride={ride} />
            </div>
          </div>

          {/* Pending Requests */}
          <PendingRequests ride={ride} />
        </CardContent>
      )}
    </Card>
  );
}

function RideInfo({ ride, seatsLeft }: { ride: Ride; seatsLeft: number }) {
  const { placeNames } = useRideDetails();
  const place = placeNames[ride._id] || { 
    startPlace: ride.startPoint, 
    endPlace: ride.endPoint 
  };

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Car className="h-5 w-5 text-blue-600" />
        Ride Information
      </h4>
      
      <div className="space-y-4">
        {/* Route Details */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Route Details</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Start:</span>
              <span className="text-blue-900 font-medium">{place.startPlace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">End:</span>
              <span className="text-blue-900 font-medium">{place.endPlace}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Vehicle</p>
              <p className="text-gray-900">Car</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Distance</p>
              <p className="text-gray-900 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-blue-500" />
                {(ride.distanceKm ?? 0).toFixed(2)} km
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fuel Cost</p>
              <p className="text-gray-900 flex items-center gap-1">
                <Fuel className="h-4 w-4 text-orange-500" />
                ₹{(ride.totalFuelCost ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Passenger Capacity</p>
              <p className="text-gray-900 flex items-center gap-1">
                <Users className="h-4 w-4 text-green-500" />
                {ride.passengerCount} seats
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Seats Available</p>
              <p className="text-gray-900">{seatsLeft > 0 ? seatsLeft : "Full"}</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RideCardComponent);