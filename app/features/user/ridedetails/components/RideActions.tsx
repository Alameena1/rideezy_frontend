"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit3, X, Play, Navigation, AlertTriangle, Square, Pause, PlayCircle } from "lucide-react";
import { useRideDetails } from "../context/RideDetailsContext";
import { useRideSimulation } from "../hooks/useRideSimulation";
import { canStartRide } from "../utils/rideUtils";
import type { Ride } from "../context/RideDetailsContext";

interface RideActionsProps {
  ride: Ride;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function RideActions({ ride, isExpanded, onToggleExpand }: RideActionsProps) {
  const { openEditModal, openEmergencyStopModal } = useRideDetails();
  const { 
    startRide, 
    stopRide, 
    resumeSimulation, 
    simulationPaused, 
    activeSimulations, 
    currentPausedPassenger,
    manualPause,
    toggleManualPause // NEW: Import manual pause toggle
  } = useRideSimulation();

  const handleStartRide = async () => {
    try {
      console.log("Starting ride:", ride._id);
      await startRide(ride._id);
      alert("Ride started successfully! Simulation will begin automatically.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error starting ride:", error);
      alert(`Failed to start ride: ${error.message}`);
    }
  };

  const canStartRideNow = canStartRide(ride);
  const hasRouteGeometry = ride.routeGeometry && ride.routeGeometry !== "";
  const hasPausedPassenger = currentPausedPassenger[ride._id];
  const isManuallyPaused = manualPause[ride._id]; // NEW: Check manual pause state

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {ride.status === "Pending" && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditModal(ride)}
            disabled={canStartRideNow}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* Handle cancel */}}
            disabled={canStartRideNow}
            className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </>
      )}
      
      {canStartRideNow && ride.status === "Pending" && (
        <Button
          onClick={handleStartRide}
          disabled={!hasRouteGeometry}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Play className="h-4 w-4" />
          {hasRouteGeometry ? "Start Ride" : "No Route Data"}
        </Button>
      )}
      
      {ride.status === "Started" && (
        <>
          {/* NEW: Manual Pause/Resume Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleManualPause(ride._id)}
            className={`flex items-center gap-2 ${
              isManuallyPaused 
                ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" 
                : "border-blue-300 text-blue-600 hover:bg-blue-50"
            }`}
          >
            {isManuallyPaused ? (
              <>
                <PlayCircle className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>

          {/* Auto-pause resume button */}
          {simulationPaused[ride._id] && !isManuallyPaused && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resumeSimulation(ride._id)}
              className="flex items-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Resume Auto
            </Button>
          )}
          
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

      {/* Enhanced Debug info
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Debug: {ride.status} | Route: {hasRouteGeometry ? 'Yes' : 'No'} | 
          CanStart: {canStartRideNow ? 'Yes' : 'No'} | 
          Active: {activeSimulations[ride._id] ? 'Yes' : 'No'} | 
          AutoPaused: {simulationPaused[ride._id] ? 'Yes' : 'No'} | 
          ManualPaused: {isManuallyPaused ? 'Yes' : 'No'} | 
          PausedPassenger: {hasPausedPassenger ? 'Yes' : 'No'}
        </div>
      )} */}
    </div>
  );
}