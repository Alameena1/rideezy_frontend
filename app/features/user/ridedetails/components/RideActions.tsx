"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit3, X, Play, Navigation, AlertTriangle, Square } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import { useRideSimulation } from "../hooks/useRideSimulation";
import { isRideTimeReached } from "../utils/rideUtils";
import type { Ride } from "../context/RideDetailsContext";

interface RideActionsProps {
  ride: Ride;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function RideActions({ ride, isExpanded, onToggleExpand }: RideActionsProps) {
  const { openEditModal, openEmergencyStopModal } = useRideDetails();
  const { startRide, stopRide, resumeSimulation, simulationPaused } = useRideSimulation();

  const handleStartRide = async () => {
    try {
      console.log("Starting ride:", ride._id);
      await startRide(ride._id);
      // Force map refresh by toggling expansion
      onToggleExpand();
      setTimeout(() => onToggleExpand(), 100);
    } catch (error) {
      console.error("Error starting ride:", error);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {ride.status === "Pending" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal(ride)}
            disabled={isRideTimeReached(ride)}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* Handle cancel */}}
            disabled={isRideTimeReached(ride)}
            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </>
      )}
      {ride.status === "Pending" && isRideTimeReached(ride) && (
        <Button
          onClick={handleStartRide}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Play className="h-4 w-4" />
          Start Ride
        </Button>
      )}
      {ride.status === "Started" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resumeSimulation(ride._id)}
            disabled={!simulationPaused[ride._id]}
            className="flex items-center gap-2"
          >
            <Navigation className="h-4 w-4" />
            Resume
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEmergencyStopModal(ride)}
            className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <AlertTriangle className="h-4 w-4" />
            Emergency Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => stopRide(ride._id)}
            className="flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50"
          >
            <Square className="h-4 w-4" />
            Complete
          </Button>
        </>
      )}
      
      <Button
        variant={isExpanded ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleExpand}
        className="flex items-center gap-2"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Show Details
          </>
        )}
      </Button>
    </div>
  );
}