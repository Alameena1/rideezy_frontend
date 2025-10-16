"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Car, MapPin, Users, DollarSign, Calendar, Clock, Fuel } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import RideActions from "./RideActions";
import RideMap from "./RideMap";
import PassengerList from "./PassengerList";
import PendingRequests from "./PendingRequests";
import StatusBadge from "./StatusBadge";
import type { Ride } from "../context/RideDetailsContext";

interface RideCardProps {
  ride: Ride;
}

export default function RideCard({ ride }: RideCardProps) {
  const { expandedRide, toggleRideExpansion, placeNames } = useRideDetails();
  const isExpanded = expandedRide === ride._id;
  const seatsLeft = ride.passengerCount - ride.passengers.length;
  const hasPendingRequests = ride.pendingRequests?.some(req => req.status === "pending");

  const place = placeNames[ride._id] || { 
    startPlace: ride.startPoint, 
    endPlace: ride.endPoint 
  };

  // Format the place names to show only the first part for better readability
  const formatPlaceName = (placeName: string) => {
    if (placeName.includes(',')) {
      return placeName.split(',')[0];
    }
    return placeName;
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
                {ride.passengers.length}/{ride.passengerCount} passengers
              </Badge>
              <Badge variant="outline" className="bg-white border-gray-300">
                <MapPin className="h-3 w-3 mr-1" />
                {(ride.distanceKm ?? 0).toFixed(1)} km
              </Badge>
              <Badge variant="outline" className="bg-white border-gray-300">
                <DollarSign className="h-3 w-3 mr-1" />
                ₹{(ride.costPerPerson ?? 0).toFixed(2)}/person
              </Badge>
              {hasPendingRequests && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  <Users className="h-3 w-3 mr-1" />
                  Pending Requests
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
              <p className="text-sm font-medium text-gray-500">Vehicle ID</p>
              <p className="text-gray-900">{ride.vehicleId}</p>
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
            <div>
              <p className="text-sm font-medium text-gray-500">Cost per Person</p>
              <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ₹{(ride.costPerPerson ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}