"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Clock, Check, X, User } from "lucide-react";
import { useRideSimulation } from "../hooks/useRideSimulation";
import { useRideDetails } from "../context/RideDetailsContext";
import type { Ride } from "../context/RideDetailsContext";

interface PendingRequestsProps {
  ride: Ride;
}

export default function PendingRequests({ ride }: PendingRequestsProps) {
  const { handleJoinRequest } = useRideSimulation();
  const { updateRide, fetchRides } = useRideDetails();
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  if (!ride.pendingRequests || ride.pendingRequests.length === 0) {
    return null;
  }

  // FIXED: Remove duplicates by passengerId
  const uniquePendingRequests = ride.pendingRequests.filter((req, index, self) => 
    index === self.findIndex(r => r.passengerId === req.passengerId)
  );

  const pendingRequests = uniquePendingRequests.filter(req => req.status === "pending");

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleRequestAction = async (passengerId: string, action: "accept" | "reject") => {
    setProcessingRequest(passengerId);
    try {
      await handleJoinRequest(ride._id, passengerId, action);
      
      // FIXED: Update local state immediately
      const updatedRequests = ride.pendingRequests?.filter(req => 
        !(req.passengerId === passengerId && req.status === "pending")
      ) || [];
      
      updateRide(ride._id, {
        pendingRequests: updatedRequests
      });

      console.log(`Successfully ${action}ed request for passenger ${passengerId}`);
      
      // Refresh rides to get updated data
      setTimeout(() => {
        fetchRides();
      }, 1000);
      
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      alert(`Failed to ${action} request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  return (
    <Card className="mt-6 border-orange-200">
      <CardHeader className="pb-3 bg-orange-50">
        <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pending Join Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {pendingRequests.map((request, index) => (
            <div
              key={`${request.passengerId}-${index}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50"
            >
              <div className="flex-1 mb-3 sm:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{request.passengerName}</h4>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                      Waiting for approval
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">Pickup:</span>
                    <span className="truncate">{request.pickupPlaceName || request.pickupLocation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-green-500" />
                    <span className="font-medium">Dropoff:</span>
                    <span className="truncate">{request.dropoffPlaceName || request.dropoffLocation}</span>
                  </div>
                </div>
                
                {request.requestedAt && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Requested: {new Date(request.requestedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2 sm:flex-col sm:gap-1">
                <Button
                  size="sm"
                  onClick={() => handleRequestAction(request.passengerId, "accept")}
                  disabled={processingRequest === request.passengerId}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                >
                  {processingRequest === request.passengerId ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {processingRequest === request.passengerId ? "Processing..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRequestAction(request.passengerId, "reject")}
                  disabled={processingRequest === request.passengerId}
                  className="border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1"
                >
                  {processingRequest === request.passengerId ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {processingRequest === request.passengerId ? "Processing..." : "Reject"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}