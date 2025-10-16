"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { clientApiService } from "@/services/client/client-api";
import useAuth from "@/app/hooks/useAuth";
import { useRideDetails } from "../context/RideDetailsContext";
import { calculateHaversineDistance } from "../utils/rideUtils";

export function useRideSimulation() {
  const { user, updateRide, rides } = useRideDetails();
  const { isAuthenticated } = useAuth();
  
  const [pickupActions, setPickupActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [dropoffActions, setDropoffActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [pausedPassengerIds, setPausedPassengerIds] = useState<{ [rideId: string]: string[] }>({});
  const [simulationPaused, setSimulationPaused] = useState<{ [rideId: string]: boolean }>({});
  const [activeSimulations, setActiveSimulations] = useState<{ [key: string]: boolean }>({});

  // Refs for map and simulation
  const mapRefs = useRef<{ [key: string]: any }>({});
  const routeLayers = useRef<{ [key: string]: any }>({});
  const vehicleMarkerRefs = useRef<{ [key: string]: any }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: any[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: any[] }>({});
  const animationIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const lastPositions = useRef<{ [key: string]: [number, number] | null }>({});
  const currentIndices = useRef<{ [key: string]: number }>({});

  // Load persisted simulation state from localStorage on mount
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem('rideSimulationState');
      if (persistedState) {
        const state = JSON.parse(persistedState);
        if (state.currentIndices) {
          currentIndices.current = state.currentIndices;
        }
        if (state.lastPositions) {
          lastPositions.current = state.lastPositions;
        }
        console.log("[RideSimulation] Loaded persisted state:", state);
      }
    } catch (error) {
      console.error("[RideSimulation] Error loading persisted state:", error);
    }
  }, []);

  // Persist simulation state to localStorage
  const persistSimulationState = useCallback(() => {
    try {
      const state = {
        currentIndices: currentIndices.current,
        lastPositions: lastPositions.current,
        pickupActions,
        dropoffActions,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('rideSimulationState', JSON.stringify(state));
    } catch (error) {
      console.error("[RideSimulation] Error persisting state:", error);
    }
  }, [pickupActions, dropoffActions]);

  // Sync pickup/dropoff actions with backend data
  const syncPickupDropoffActions = useCallback(() => {
    console.log("[RideSimulation] Syncing pickup/dropoff actions with backend");
    
    const newPickupActions: { [key: string]: { [key: string]: boolean } } = {};
    const newDropoffActions: { [key: string]: { [key: string]: boolean } } = {};

    rides.forEach(ride => {
      if (ride.status === "Started" || ride.status === "Completed") {
        newPickupActions[ride._id] = {};
        newDropoffActions[ride._id] = {};

        // Sync from passengers array
        ride.passengers.forEach(passenger => {
          if (passenger.pickedUp) {
            newPickupActions[ride._id][passenger.passengerId] = true;
          }
          if (passenger.droppedOff) {
            newDropoffActions[ride._id][passenger.passengerId] = true;
          }
        });
      }
    });

    setPickupActions(newPickupActions);
    setDropoffActions(newDropoffActions);
    
    console.log("[RideSimulation] Synced actions from backend:", { newPickupActions, newDropoffActions });
  }, [rides]);

  // Initialize simulation for already started rides and sync state
  useEffect(() => {
    console.log("[RideSimulation] Initializing simulations and syncing state");
    
    // First sync with backend data
    syncPickupDropoffActions();
    
    // Then initialize simulations
    rides.forEach(ride => {
      if (ride.status === "Started" && !activeSimulations[ride._id]) {
        console.log("[RideSimulation] Found started ride, initializing simulation:", ride._id);
        initializeSimulationForStartedRide(ride);
      }
    });
  }, [rides, activeSimulations, syncPickupDropoffActions]);

  const initializeSimulationForStartedRide = useCallback(async (ride: any) => {
    try {
      const routeData = JSON.parse(ride.routeGeometry);
      const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      
      // Use persisted current position or ride's currentPosition or start from beginning
      let startIndex = 0;
      let initialPosition = coordinates[0];
      
      // Check if we have a persisted index for this ride
      if (currentIndices.current[ride._id] !== undefined) {
        startIndex = Math.min(currentIndices.current[ride._id], coordinates.length - 1);
        initialPosition = coordinates[startIndex];
        console.log("[RideSimulation] Using persisted index:", startIndex);
      } 
      // Otherwise use the ride's currentPosition from database
      else if (ride.currentPosition) {
        // Find the closest coordinate to the saved currentPosition
        let minDistance = Infinity;
        coordinates.forEach((coord, index) => {
          const distance = calculateHaversineDistance(coord, ride.currentPosition);
          if (distance < minDistance) {
            minDistance = distance;
            startIndex = index;
          }
        });
        initialPosition = coordinates[startIndex];
        console.log("[RideSimulation] Using ride currentPosition, found index:", startIndex);
      }
      
      console.log("[RideSimulation] Starting simulation from index:", startIndex, "total points:", coordinates.length);
      startSimulation(ride._id, coordinates, ride.distanceKm, initialPosition, startIndex);
      setActiveSimulations(prev => ({ ...prev, [ride._id]: true }));
    } catch (error) {
      console.error("[RideSimulation] Error initializing simulation for started ride:", error);
    }
  }, []);

  const startRide = useCallback(async (rideId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride || !ride.rideId) {
        throw new Error("Ride or rideId not found");
      }

      console.log("[RideSimulation] Starting ride:", rideId);
      
      // Parse route geometry
      const routeData = JSON.parse(ride.routeGeometry);
      const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      const initialPosition = coordinates[0] as [number, number];

      // Start tracking with retry logic
      let trackingStarted = false;
      let retries = 3;
      
      while (retries > 0 && !trackingStarted) {
        try {
          await clientApiService.tracking.startTracking(ride._id, ride.driverId, initialPosition);
          trackingStarted = true;
          console.log("[RideSimulation] Tracking started successfully");
        } catch (trackingError: any) {
          retries--;
          if (retries === 0) {
            console.warn("[RideSimulation] Tracking start failed after retries, continuing without tracking:", trackingError);
          } else {
            console.warn(`[RideSimulation] Tracking start failed, ${retries} retries left:`, trackingError);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Update ride status to Started and set initial position
      await clientApiService.ride.updateRide(ride._id, { 
        status: "Started",
        currentPosition: initialPosition 
      }, ride.driverId);
      
      // Update local state
      updateRide(rideId, { 
        status: "Started", 
        currentPosition: initialPosition 
      });

      // Clear any previous state for this ride and set initial index
      currentIndices.current[rideId] = 0;
      lastPositions.current[rideId] = initialPosition;
      persistSimulationState();

      // Start simulation immediately
      console.log("[RideSimulation] Starting simulation after ride start");
      startSimulation(rideId, coordinates, ride.distanceKm, initialPosition, 0);
      setActiveSimulations(prev => ({ ...prev, [rideId]: true }));

      console.log("[RideSimulation] Ride started successfully with simulation");

    } catch (error: any) {
      console.error("[RideSimulation] Error starting ride:", error);
      throw error;
    }
  }, [rides, updateRide, persistSimulationState]);

  const startSimulation = useCallback((rideId: string, coordinates: [number, number][], distanceKm: number, startPosition: [number, number], startIndex: number = 0) => {
    // Clear existing interval if any
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }

    const stepDuration = 3000; // 3 seconds per step for better visibility
    
    // Set the current index
    currentIndices.current[rideId] = startIndex;

    console.log("[RideSimulation] Starting simulation from index:", startIndex, "total points:", coordinates.length);

    // Initialize vehicle marker if not exists
    if (mapRefs.current[rideId] && !vehicleMarkerRefs.current[rideId]) {
      console.log("[RideSimulation] Creating vehicle marker for simulation");
      const L = require('leaflet');
      vehicleMarkerRefs.current[rideId] = L.marker(startPosition, {
        icon: L.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }).addTo(mapRefs.current[rideId]).bindPopup("Your Vehicle - Moving");
    }

    const simulationInterval = setInterval(async () => {
      try {
        const ride = rides.find((r) => r._id === rideId);
        if (!ride || ride.status !== "Started") {
          console.log("[RideSimulation] Stopping simulation - ride not found or not started:", rideId);
          cleanupSimulation(rideId);
          return;
        }

        // Check if simulation is paused
        if (simulationPaused[rideId]) {
          console.log("[RideSimulation] Simulation paused for ride:", rideId);
          return;
        }

        currentIndices.current[rideId]++;
        const currentIndex = currentIndices.current[rideId];
        
        if (currentIndex >= coordinates.length) {
          // Simulation completed
          console.log("[RideSimulation] Simulation completed for ride:", rideId);
          cleanupSimulation(rideId);
          
          // Update ride status to completed
          await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
          updateRide(rideId, { status: "Completed" });
          
          // Clear persisted state for this ride
          delete currentIndices.current[rideId];
          delete lastPositions.current[rideId];
          persistSimulationState();
          
          // Stop tracking
          try {
            await clientApiService.tracking.stopTracking(ride._id);
          } catch (error) {
            console.warn("[RideSimulation] Error stopping tracking:", error);
          }
          
          return;
        }

        const currentPosition = coordinates[currentIndex];
        lastPositions.current[rideId] = currentPosition;

        console.log("[RideSimulation] Moving to position:", currentPosition, "index:", currentIndex, "/", coordinates.length);

        // Update vehicle marker on map
        if (vehicleMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId].setLatLng(currentPosition);
          // Smooth pan to vehicle position
          mapRefs.current[rideId].panTo(currentPosition, {
            animate: true,
            duration: 0.5
          });
        }

        // Update tracking position with error handling
        try {
          await clientApiService.tracking.updateTrackingPosition(ride._id, currentPosition);
          console.log("[RideSimulation] Tracking position updated");
        } catch (error) {
          console.warn("[RideSimulation] Error updating tracking position, continuing simulation:", error);
          // Continue simulation even if tracking update fails
        }

        // Update ride with current position in database
        try {
          await clientApiService.ride.updateRide(ride._id, { 
            currentPosition: currentPosition 
          }, ride.driverId);
        } catch (error) {
          console.warn("[RideSimulation] Error updating ride position in database:", error);
        }

        // Update local state
        updateRide(rideId, { currentPosition });

        // Persist current state
        persistSimulationState();

        // Check if we should pause for pickup/dropoff AFTER updating position
        const shouldPause = checkForPausePoints(rideId, currentPosition);
        if (shouldPause) {
          setSimulationPaused(prev => ({ ...prev, [rideId]: true }));
          console.log("[RideSimulation] Pausing simulation at point:", currentIndex);
          return;
        }

      } catch (error) {
        console.error("[RideSimulation] Simulation error:", error);
      }
    }, stepDuration);

    animationIntervals.current[rideId] = simulationInterval;
    console.log("[RideSimulation] Simulation started for ride:", rideId);
  }, [rides, updateRide, simulationPaused, persistSimulationState]);

  const cleanupSimulation = useCallback((rideId: string) => {
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    
    // Clear current index
    if (currentIndices.current[rideId]) {
      delete currentIndices.current[rideId];
    }
    
    setActiveSimulations(prev => {
      const newState = { ...prev };
      delete newState[rideId];
      return newState;
    });
    
    console.log("[RideSimulation] Simulation cleaned up for ride:", rideId);
  }, []);

  const checkForPausePoints = (rideId: string, currentPosition: [number, number]): boolean => {
    const ride = rides.find((r) => r._id === rideId);
    if (!ride) return false;

    // Check pickup points
    for (const pickup of ride.pickupPoints) {
      const [pickupLat, pickupLng] = pickup.location.split(",").map(Number);
      const pickupCoord: [number, number] = [pickupLat, pickupLng];
      const distance = calculateHaversineDistance(currentPosition, pickupCoord);
      
      console.log(`[RideSimulation] Distance to pickup ${pickup.passengerId}:`, (distance * 1000).toFixed(1), "meters");
      
      // Check if pickup is not completed in both frontend AND backend
      const passenger = ride.passengers.find(p => p.passengerId === pickup.passengerId);
      const isPickupCompleted = pickupActions[rideId]?.[pickup.passengerId] || passenger?.pickedUp;
      
      if (distance < 0.05 && !isPickupCompleted) {
        if (!pausedPassengerIds[rideId]?.includes(pickup.passengerId)) {
          setPausedPassengerIds(prev => ({
            ...prev,
            [rideId]: [...(prev[rideId] || []), pickup.passengerId]
          }));
          console.log("[RideSimulation] Pausing for pickup:", pickup.passengerId, "distance:", (distance * 1000).toFixed(1), "m");
        }
        return true;
      }
    }

    // Check dropoff points
    for (const dropoff of ride.dropoffPoints) {
      const [dropoffLat, dropoffLng] = dropoff.location.split(",").map(Number);
      const dropoffCoord: [number, number] = [dropoffLat, dropoffLng];
      const distance = calculateHaversineDistance(currentPosition, dropoffCoord);
      
      console.log(`[RideSimulation] Distance to dropoff ${dropoff.passengerId}:`, (distance * 1000).toFixed(1), "meters");
      
      // Check if pickup is done but dropoff is not completed in both frontend AND backend
      const passenger = ride.passengers.find(p => p.passengerId === dropoff.passengerId);
      const isPickupCompleted = pickupActions[rideId]?.[dropoff.passengerId] || passenger?.pickedUp;
      const isDropoffCompleted = dropoffActions[rideId]?.[dropoff.passengerId] || passenger?.droppedOff;
      
      if (distance < 0.05 && isPickupCompleted && !isDropoffCompleted) {
        if (!pausedPassengerIds[rideId]?.includes(dropoff.passengerId)) {
          setPausedPassengerIds(prev => ({
            ...prev,
            [rideId]: [...(prev[rideId] || []), dropoff.passengerId]
          }));
          console.log("[RideSimulation] Pausing for dropoff:", dropoff.passengerId, "distance:", (distance * 1000).toFixed(1), "m");
        }
        return true;
      }
    }

    return false;
  };

  const stopRide = useCallback(async (rideId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) return;

      console.log("[RideSimulation] Stopping ride:", rideId);
      
      // Clean up simulation
      cleanupSimulation(rideId);
      
      // Clear persisted state
      delete currentIndices.current[rideId];
      delete lastPositions.current[rideId];
      persistSimulationState();
      
      // Update ride status
      await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
      updateRide(rideId, { status: "Completed" });
      
      // Stop tracking
      try {
        await clientApiService.tracking.stopTracking(ride._id);
      } catch (error) {
        console.warn("[RideSimulation] Error stopping tracking:", error);
      }
      
      console.log("[RideSimulation] Ride stopped successfully");
    } catch (error) {
      console.error("[RideSimulation] Error stopping ride:", error);
      throw error;
    }
  }, [rides, updateRide, cleanupSimulation, persistSimulationState]);

  const resumeSimulation = useCallback((rideId: string) => {
    console.log("[RideSimulation] Resuming simulation for ride:", rideId);
    setSimulationPaused(prev => ({ ...prev, [rideId]: false }));
    
    // Clear paused passenger IDs for this ride
    setPausedPassengerIds(prev => ({
      ...prev,
      [rideId]: []
    }));
  }, []);

  const handlePickup = useCallback(async (rideId: string, passengerId: string) => {
    console.log("[RideSimulation] Handling pickup for:", passengerId, "in ride:", rideId);
    
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      // Use updateRide instead of updatePassengerStatus
      await clientApiService.ride.updateRide(ride._id, { 
        passengerId: passengerId,
        action: "picked",
        currentPosition: lastPositions.current[rideId]
      }, ride.driverId);

      // Then update frontend state
      setPickupActions(prev => {
        const newActions = {
          ...prev,
          [rideId]: {
            ...prev[rideId],
            [passengerId]: true
          }
        };
        return newActions;
      });

      // Update local state
      updateRide(rideId, {
        passengers: ride.passengers.map(p => 
          p.passengerId === passengerId 
            ? { ...p, pickedUp: true }
            : p
        )
      });

      // Remove from paused passengers
      setPausedPassengerIds(prev => ({
        ...prev,
        [rideId]: prev[rideId]?.filter(id => id !== passengerId) || []
      }));

      // Persist state after pickup
      persistSimulationState();

      // Resume simulation
      resumeSimulation(rideId);

      console.log("[RideSimulation] Pickup completed successfully for:", passengerId);

    } catch (error) {
      console.error("[RideSimulation] Error handling pickup:", error);
      throw error;
    }
  }, [rides, updateRide, resumeSimulation, persistSimulationState]);

  const handleDropoff = useCallback(async (rideId: string, passengerId: string) => {
    console.log("[RideSimulation] Handling dropoff for:", passengerId, "in ride:", rideId);
    
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      // Use updateRide instead of updatePassengerStatus
      await clientApiService.ride.updateRide(ride._id, { 
        passengerId: passengerId,
        action: "dropped",
        currentPosition: lastPositions.current[rideId]
      }, ride.driverId);

      // Then update frontend state
      setDropoffActions(prev => {
        const newActions = {
          ...prev,
          [rideId]: {
            ...prev[rideId],
            [passengerId]: true
          }
        };
        return newActions;
      });

      // Update local state
      updateRide(rideId, {
        passengers: ride.passengers.map(p => 
          p.passengerId === passengerId 
            ? { ...p, droppedOff: true }
            : p
        )
      });

      // Remove from paused passengers
      setPausedPassengerIds(prev => ({
        ...prev,
        [rideId]: prev[rideId]?.filter(id => id !== passengerId) || []
      }));

      // Persist state after dropoff
      persistSimulationState();

      // Resume simulation
      resumeSimulation(rideId);

      console.log("[RideSimulation] Dropoff completed successfully for:", passengerId);

    } catch (error) {
      console.error("[RideSimulation] Error handling dropoff:", error);
      throw error;
    }
  }, [rides, updateRide, resumeSimulation, persistSimulationState]);

  const handleEditRide = useCallback((rideId: string) => {
    console.log("[RideSimulation] Editing ride:", rideId);
    // Implementation depends on your edit modal logic
  }, []);

  const handleEmergencyStop = useCallback(async (rideId: string) => {
    try {
      const ride = rides.find((r) => r._id === rideId);
      if (!ride) return;

      console.log("[RideSimulation] Emergency stop for ride:", rideId);
      
      // Pause simulation
      setSimulationPaused(prev => ({ ...prev, [rideId]: true }));
      
      // Update ride status to indicate emergency
      await clientApiService.ride.updateRide(ride._id, { status: "Emergency" }, ride.driverId);
      updateRide(rideId, { status: "Emergency" });
      
      console.log("[RideSimulation] Emergency stop activated");
    } catch (error) {
      console.error("[RideSimulation] Error during emergency stop:", error);
      throw error;
    }
  }, [rides, updateRide]);

  const handleJoinRequest = useCallback((rideId: string, passengerId: string) => {
    console.log("[RideSimulation] Handling join request for ride:", rideId, "passenger:", passengerId);
    // Implementation depends on your join request logic
  }, []);

  const initializeMap = useCallback(async (ride: any, mapContainer: HTMLDivElement) => {
    if (!mapContainer || mapRefs.current[ride._id]) return;

    try {
      // Dynamically import Leaflet
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Clean up existing map
      if (mapRefs.current[ride._id]) {
        mapRefs.current[ride._id].remove();
      }

      // Create map
      const map = L.default.map(mapContainer).setView([0, 0], 10);
      mapRefs.current[ride._id] = map;

      // Add tile layer
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Set container styles
      mapContainer.style.height = "400px";
      mapContainer.style.width = "100%";

      try {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

        // Create route polyline
        routeLayers.current[ride._id] = L.default.polyline(coordinates, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.7
        }).addTo(map);

        // Create start and end markers
        const [startLat, startLng] = coordinates[0];
        const [endLat, endLng] = coordinates[coordinates.length - 1];

        // Start marker
        L.default.marker([startLat, startLng], {
          icon: L.default.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>Start:</strong> ${ride.startPoint}`);

        // End marker
        L.default.marker([endLat, endLng], {
          icon: L.default.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>End:</strong> ${ride.endPoint}`);

        // Create pickup and dropoff markers
        pickupMarkerRefs.current[ride._id] = [];
        dropoffMarkerRefs.current[ride._id] = [];

        // Add pickup points
        ride.pickupPoints.forEach((pickup: any, index: number) => {
          const [pickupLat, pickupLng] = pickup.location.split(",").map(Number);
          const marker = L.default.marker([pickupLat, pickupLng], {
            icon: L.default.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>Pickup ${index + 1}:</strong> ${pickup.placeName || 'Passenger Location'}`);
          pickupMarkerRefs.current[ride._id].push(marker);
        });

        // Add dropoff points
        ride.dropoffPoints.forEach((dropoff: any, index: number) => {
          const [dropoffLat, dropoffLng] = dropoff.location.split(",").map(Number);
          const marker = L.default.marker([dropoffLat, dropoffLng], {
            icon: L.default.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`<strong>Drop-off ${index + 1}:</strong> ${dropoff.placeName || 'Passenger Destination'}`);
          dropoffMarkerRefs.current[ride._id].push(marker);
        });

        // Determine initial position for vehicle marker
        let initialPosition = coordinates[0];
        if (ride.status === "Started") {
          // Use persisted position if available, otherwise use ride's currentPosition
          if (currentIndices.current[ride._id] !== undefined) {
            const persistedIndex = Math.min(currentIndices.current[ride._id], coordinates.length - 1);
            initialPosition = coordinates[persistedIndex];
            console.log("[RideSimulation] Using persisted position for vehicle:", persistedIndex);
          } else if (ride.currentPosition) {
            initialPosition = ride.currentPosition;
            console.log("[RideSimulation] Using ride currentPosition for vehicle");
          }
          
          vehicleMarkerRefs.current[ride._id] = L.default.marker(initialPosition, {
            icon: L.default.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup("Your Vehicle - Ready");
        }

        // Fit map to show all points
        const allPoints = [
          ...coordinates,
          ...ride.pickupPoints.map((p: any) => {
            const [lat, lng] = p.location.split(",").map(Number);
            return [lat, lng];
          }),
          ...ride.dropoffPoints.map((d: any) => {
            const [lat, lng] = d.location.split(",").map(Number);
            return [lat, lng];
          })
        ];

        if (allPoints.length > 0) {
          const bounds = L.default.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        map.invalidateSize();
        lastPositions.current[ride._id] = initialPosition;
        
        console.log("[RideSimulation] Map initialized for ride:", ride._id);
        
        // If ride is already started, start simulation from current position
        if (ride.status === "Started" && !activeSimulations[ride._id]) {
          console.log("[RideSimulation] Starting simulation for already started ride after map init");
          const startIndex = currentIndices.current[ride._id] || 0;
          startSimulation(ride._id, coordinates, ride.distanceKm, initialPosition, startIndex);
          setActiveSimulations(prev => ({ ...prev, [ride._id]: true }));
        }
      } catch (error) {
        console.error("[RideSimulation] Error rendering route:", error);
      }
    } catch (error) {
      console.error("[RideSimulation] Error initializing map:", error);
    }
  }, [startSimulation, activeSimulations]);

  const cleanupMap = useCallback((rideId: string) => {
    console.log("[RideSimulation] Cleaning up map for ride:", rideId);
    
    // Stop simulation
    cleanupSimulation(rideId);

    // Remove map and markers
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId].remove();
      delete mapRefs.current[rideId];
    }
    
    if (vehicleMarkerRefs.current[rideId]) {
      vehicleMarkerRefs.current[rideId].remove();
      delete vehicleMarkerRefs.current[rideId];
    }
    
    if (routeLayers.current[rideId]) {
      routeLayers.current[rideId].remove();
      delete routeLayers.current[rideId];
    }

    // Cleanup pickup and dropoff markers
    if (pickupMarkerRefs.current[rideId]) {
      pickupMarkerRefs.current[rideId].forEach((marker: any) => marker.remove());
      delete pickupMarkerRefs.current[rideId];
    }

    if (dropoffMarkerRefs.current[rideId]) {
      dropoffMarkerRefs.current[rideId].forEach((marker: any) => marker.remove());
      delete dropoffMarkerRefs.current[rideId];
    }

    if (lastPositions.current[rideId]) {
      delete lastPositions.current[rideId];
    }
  }, [cleanupSimulation]);

  return {
    // State
    pickupActions,
    dropoffActions,
    pausedPassengerIds,
    simulationPaused,
    activeSimulations,
    
    // Actions
    startRide,
    stopRide,
    resumeSimulation,
    handlePickup,
    handleDropoff,
    handleEditRide,
    handleEmergencyStop,
    handleJoinRequest,
    initializeMap,
    cleanupMap,
  };
}