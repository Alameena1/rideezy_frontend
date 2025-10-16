"use client";

import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import { useRideSimulation } from "../hooks/useRideSimulation";
import type { Ride } from "../context/RideDetailsContext";

interface PendingRequestsProps {
  ride: Ride;
}

export default function PendingRequests({ ride }: PendingRequestsProps) {
  const { user } = useRideDetails();
  const { handleJoinRequest, pickupActions, dropoffActions } = useRideSimulation();

  return (
    <div className="mt-8">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-purple-600" />
        Passengers & Requests
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confirmed Passengers */}
        <div>
          <h5 className="font-medium text-gray-700 mb-3">Confirmed Passengers</h5>
          {ride.passengers.length > 0 ? (
            <div className="space-y-3">
              {ride.passengers.map((passenger, index) => {
                const pickup = ride.pickupPoints.find((p) => p.passengerId === passenger.passengerId);
                const dropoff = ride.dropoffPoints.find((p) => p.passengerId === passenger.passengerId);
                
                return (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{passenger.passengerName}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>Pickup: {pickup?.placeName || "N/A"}</p>
                          <p>Dropoff: {dropoff?.placeName || "N/A"}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                          pickupActions[ride._id]?.[passenger.passengerId] 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {pickupActions[ride._id]?.[passenger.passengerId] ? "✓ Picked" : "Awaiting Pickup"}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full mt-1 ${
                          dropoffActions[ride._id]?.[passenger.passengerId] 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {dropoffActions[ride._id]?.[passenger.passengerId] ? "✓ Dropped" : "In Transit"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No confirmed passengers yet.</p>
          )}
        </div>

        {/* Pending Requests */}
        <div>
          <h5 className="font-medium text-gray-700 mb-3">Pending Join Requests</h5>
          {ride.pendingRequests?.filter(req => req.status === "pending").length > 0 ? (
            <div className="space-y-3">
              {ride.pendingRequests
                .filter((request) => request.status === "pending")
                .map((request, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{request.passengerName}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>From: {request.pickupLocation}</p>
                          <p>To: {request.dropoffLocation}</p>
                        </div>
                      </div>
                      {user?.driverId === ride.driverId && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleJoinRequest(ride._id, request.passengerId, "accept")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleJoinRequest(ride._id, request.passengerId, "reject")}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No pending requests.</p>
          )}
        </div>
      </div>
    </div>
  );
}