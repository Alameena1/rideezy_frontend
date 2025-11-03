"use client";

import { useEffect, useRef, useState } from "react";
import { useRideSimulation } from "../hooks/useRideSimulation";
import type { Ride } from "../context/RideDetailsContext";

interface RideMapProps {
  ride: Ride;
}

export default function RideMap({ ride }: RideMapProps) {
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { initializeMap, cleanupMap, simulationPaused, activeSimulations } = useRideSimulation();
  const initializationAttempted = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || initializationAttempted.current) return;

    const initMap = async () => {
      try {
        console.log("[RideMap] Initializing map for ride:", ride._id);
        console.log("[RideMap] Ride status:", ride.status);
        console.log("[RideMap] Route geometry available:", !!ride.routeGeometry);
        
        setIsLoading(true);
        initializationAttempted.current = true;
        await initializeMap(ride, mapContainerRef.current!);
        setMapInitialized(true);
        setMapError(null);
      } catch (error: any) {
        console.error("[RideMap] Error initializing map:", error);
        setMapError(`Failed to load map: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInitialized) {
        console.log("[RideMap] Cleanup triggered for ride:", ride._id);
        cleanupMap(ride._id);
        initializationAttempted.current = false;
        setMapInitialized(false);
      }
    };
  }, [ride, initializeMap, cleanupMap, mapInitialized]);

  return (
    <div className="w-full">
      {mapError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{mapError}</p>
        </div>
      )}
      
      {simulationPaused[ride._id] && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-yellow-800 text-sm font-medium">
            ⚠️ Simulation paused - Action required at passenger location
          </p>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="h-80 w-full rounded-lg border border-gray-200 bg-gray-100"
      />
      
      {isLoading && (
        <div className="flex items-center justify-center h-80 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {mapInitialized && ride.status === "Started" && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">
            🚗 <strong>Simulation Active:</strong> Vehicle is moving along the route
            {simulationPaused[ride._id] && " - PAUSED for passenger action"}
          </p>
          <p className="text-blue-700 text-xs mt-1">
            Vehicle position updates every 2 seconds. Look for the gold marker moving along the blue route.
          </p>
          {activeSimulations[ride._id] && (
            <p className="text-green-700 text-xs mt-1">
              ✅ Simulation is running automatically
            </p>
          )}
        </div>
      )}
    </div>
  );
}