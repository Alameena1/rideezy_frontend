"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { clientApiService } from "@/services/client/client-api";
import { useRideDetails } from "../context/RideDetailsContext";
import { calculateHaversineDistance } from "../utils/rideUtils";

export function useRideSimulation() {
  const { updateRide, rides } = useRideDetails();
  
  const [pickupActions, setPickupActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [dropoffActions, setDropoffActions] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [pausedPassengerIds, setPausedPassengerIds] = useState<{ [rideId: string]: string[] }>({});
  const [simulationPaused, setSimulationPaused] = useState<{ [rideId: string]: boolean }>({});
  const [activeSimulations, setActiveSimulations] = useState<{ [key: string]: boolean }>({});
  const [currentPausedPassenger, setCurrentPausedPassenger] = useState<{ [rideId: string]: string | null }>({});
  const [manualPause, setManualPause] = useState<{ [rideId: string]: boolean }>({});

  // Refs for everything to avoid dependencies
  const mapRefs = useRef<{ [key: string]: any }>({});
  const routeLayers = useRef<{ [key: string]: any }>({});
  const vehicleMarkerRefs = useRef<{ [key: string]: any }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: any[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: any[] }>({});
  const animationIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const lastPositions = useRef<{ [key: string]: [number, number] | null }>({});
  const currentIndices = useRef<{ [key: string]: number }>({});
  const isPausedRef = useRef<{ [key: string]: boolean }>({});
  const lastTrackingUpdate = useRef<{ [rideId: string]: number }>({});
  const simulationInitialized = useRef<{ [rideId: string]: boolean }>({});

  // FIXED: Use refs for ALL state and functions to avoid dependencies
  const ridesRef = useRef(rides);
  const pickupActionsRef = useRef(pickupActions);
  const dropoffActionsRef = useRef(dropoffActions);
  const manualPauseRef = useRef(manualPause);
  const updateRideRef = useRef(updateRide);

  const isClient = typeof window !== 'undefined';

  // Update refs when state changes
  useEffect(() => {
    ridesRef.current = rides;
  }, [rides]);

  useEffect(() => {
    pickupActionsRef.current = pickupActions;
  }, [pickupActions]);

  useEffect(() => {
    dropoffActionsRef.current = dropoffActions;
  }, [dropoffActions]);

  useEffect(() => {
    manualPauseRef.current = manualPause;
  }, [manualPause]);

  useEffect(() => {
    updateRideRef.current = updateRide;
  }, [updateRide]);

  // Rate limiting for API calls
  const canUpdateTracking = useCallback((rideId: string): boolean => {
    const now = Date.now();
    const lastUpdate = lastTrackingUpdate.current[rideId] || 0;
    if (now - lastUpdate < 5000) {
      return false;
    }
    lastTrackingUpdate.current[rideId] = now;
    return true;
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
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
      }
    } catch (error) {
      console.error("[RideSimulation] Error loading persisted state:", error);
    }
  }, [isClient]);

  // Persist simulation state to localStorage
  const persistSimulationState = useCallback(() => {
    if (!isClient) return;
    
    try {
      const state = {
        currentIndices: currentIndices.current,
        lastPositions: lastPositions.current,
        pickupActions: pickupActionsRef.current,
        dropoffActions: dropoffActionsRef.current,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('rideSimulationState', JSON.stringify(state));
    } catch (error) {
      console.error("[RideSimulation] Error persisting state:", error);
    }
  }, [isClient]);

  // Sync pickup/dropoff actions with backend data
  const syncPickupDropoffActions = useCallback(() => {
    const newPickupActions: { [key: string]: { [key: string]: boolean } } = {};
    const newDropoffActions: { [key: string]: { [key: string]: boolean } } = {};

    ridesRef.current.forEach(ride => {
      if (ride.status === "Started" || ride.status === "Completed") {
        newPickupActions[ride._id] = {};
        newDropoffActions[ride._id] = {};

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
  }, []);

  // Memoized started rides
  const startedRides = useMemo(() => {
    return rides.filter(ride => ride.status === "Started");
  }, [rides]);

  // FIXED: Pause detection with NO dependencies
  const checkForPausePoints = useCallback((rideId: string, currentPosition: [number, number]) => {
    const ride = ridesRef.current.find((r) => r._id === rideId);
    if (!ride) {
      return { shouldPause: false, passengerId: null, action: null };
    }

    const DISTANCE_THRESHOLD_KM = 0.1;

    // Check pickup points
    if (ride.pickupPoints && ride.pickupPoints.length > 0) {
      for (const pickup of ride.pickupPoints) {
        try {
          const [pickupLat, pickupLng] = pickup.location.split(",").map(Number);
          if (isNaN(pickupLat) || isNaN(pickupLng)) continue;
          
          const pickupCoord: [number, number] = [pickupLat, pickupLng];
          const distance = calculateHaversineDistance(currentPosition, pickupCoord);
          
          const passenger = ride.passengers.find(p => p.passengerId === pickup.passengerId);
          const isPickupCompleted = pickupActionsRef.current[rideId]?.[pickup.passengerId] || passenger?.pickedUp;
          
          if (distance <= DISTANCE_THRESHOLD_KM && !isPickupCompleted) {
            return { shouldPause: true, passengerId: pickup.passengerId, action: 'pickup' };
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Check dropoff points
    if (ride.dropoffPoints && ride.dropoffPoints.length > 0) {
      for (const dropoff of ride.dropoffPoints) {
        try {
          const [dropoffLat, dropoffLng] = dropoff.location.split(",").map(Number);
          if (isNaN(dropoffLat) || isNaN(dropoffLng)) continue;
          
          const dropoffCoord: [number, number] = [dropoffLat, dropoffLng];
          const distance = calculateHaversineDistance(currentPosition, dropoffCoord);
          
          const passenger = ride.passengers.find(p => p.passengerId === dropoff.passengerId);
          const isPickupCompleted = pickupActionsRef.current[rideId]?.[dropoff.passengerId] || passenger?.pickedUp;
          const isDropoffCompleted = dropoffActionsRef.current[rideId]?.[dropoff.passengerId] || passenger?.droppedOff;
          
          if (distance <= DISTANCE_THRESHOLD_KM && isPickupCompleted && !isDropoffCompleted) {
            return { shouldPause: true, passengerId: dropoff.passengerId, action: 'dropoff' };
          }
        } catch (error) {
          continue;
        }
      }
    }

    return { shouldPause: false, passengerId: null, action: null };
  }, []);

  // Cleanup simulation
  const cleanupSimulation = useCallback((rideId: string) => {
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }
    
    if (currentIndices.current[rideId]) {
      delete currentIndices.current[rideId];
    }
    
    delete isPausedRef.current[rideId];
    delete lastTrackingUpdate.current[rideId];
    delete simulationInitialized.current[rideId];
    
    setActiveSimulations(prev => {
      const newState = { ...prev };
      delete newState[rideId];
      return newState;
    });
  }, []);

  // FIXED: startSimulation with NO dependencies that change
  const startSimulation = useCallback((rideId: string, coordinates: [number, number][], distanceKm: number, startPosition: [number, number], startIndex: number = 0) => {
    if (!isClient) return;
    
    if (animationIntervals.current[rideId]) {
      clearInterval(animationIntervals.current[rideId]!);
      animationIntervals.current[rideId] = null;
    }

    const stepDuration = 1000;
    
    currentIndices.current[rideId] = startIndex;
    isPausedRef.current[rideId] = false;

    let isRunning = true;

    const simulationInterval = setInterval(async () => {
      if (!isRunning) return;

      try {
        const ride = ridesRef.current.find((r) => r._id === rideId);
        if (!ride || ride.status !== "Started") {
          cleanupSimulation(rideId);
          isRunning = false;
          return;
        }

        // Check if simulation is paused
        if (isPausedRef.current[rideId] || manualPauseRef.current[rideId]) {
          return;
        }

        currentIndices.current[rideId]++;
        const currentIndex = currentIndices.current[rideId];
        
        if (currentIndex >= coordinates.length) {
          // Simulation completed
          cleanupSimulation(rideId);
          isRunning = false;
          
          await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
          updateRideRef.current(rideId, { status: "Completed" });
          
          delete currentIndices.current[rideId];
          delete lastPositions.current[rideId];
          persistSimulationState();
          
          try {
            await clientApiService.tracking.stopTracking(ride._id);
          } catch (error) {
            console.warn("[RideSimulation] Error stopping tracking:", error);
          }
          
          return;
        }

        const currentPosition = coordinates[currentIndex];
        lastPositions.current[rideId] = currentPosition;

        // Update vehicle marker on map
        if (vehicleMarkerRefs.current[rideId] && mapRefs.current[rideId]) {
          vehicleMarkerRefs.current[rideId].setLatLng(currentPosition);
          if (currentIndex % 10 === 0) {
            mapRefs.current[rideId].panTo(currentPosition, {
              animate: true,
              duration: 0.5
            });
          }
        }

        // Check for pause points
        const pauseResult = checkForPausePoints(rideId, currentPosition);
        if (pauseResult.shouldPause && pauseResult.passengerId && pauseResult.action) {
          setSimulationPaused(prev => ({ ...prev, [rideId]: true }));
          isPausedRef.current[rideId] = true;
          setCurrentPausedPassenger(prev => ({ ...prev, [rideId]: pauseResult.passengerId }));
          
          if (!pausedPassengerIds[rideId]?.includes(pauseResult.passengerId)) {
            setPausedPassengerIds(prev => ({
              ...prev,
              [rideId]: [...(prev[rideId] || []), pauseResult.passengerId!]
            }));
          }
          
          return;
        }

        // Update tracking and position with rate limiting
        if (canUpdateTracking(rideId)) {
          try {
            await clientApiService.tracking.updateTrackingPosition(ride._id, currentPosition);
          } catch (error) {
            console.warn("[RideSimulation] Error updating tracking position:", error);
          }

          try {
            await clientApiService.ride.updateRide(ride._id, { 
              currentPosition: currentPosition 
            }, ride.driverId);
          } catch (error) {
            console.warn("[RideSimulation] Error updating ride position:", error);
          }
        }

        // FIXED: Use ref to avoid dependency on updateRide
        updateRideRef.current(rideId, { currentPosition });
        persistSimulationState();

      } catch (error) {
        console.error("[RideSimulation] Simulation error:", error);
        isRunning = false;
      }
    }, stepDuration);

    animationIntervals.current[rideId] = simulationInterval;

    return () => {
      isRunning = false;
      if (animationIntervals.current[rideId]) {
        clearInterval(animationIntervals.current[rideId]!);
        animationIntervals.current[rideId] = null;
      }
    };
  }, [isClient, cleanupSimulation, persistSimulationState, checkForPausePoints, canUpdateTracking]);

  // Initialize simulation for a ride that's already started
  const initializeSimulationForStartedRide = useCallback(async (ride: any) => {
    try {
      const routeData = JSON.parse(ride.routeGeometry);
      const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      
      let startIndex = 0;
      let initialPosition = coordinates[0];
      
      if (currentIndices.current[ride._id] !== undefined) {
        startIndex = Math.min(currentIndices.current[ride._id], coordinates.length - 1);
        initialPosition = coordinates[startIndex];
      } else if (ride.currentPosition) {
        let minDistance = Infinity;
        coordinates.forEach((coord, index) => {
          const distance = calculateHaversineDistance(coord, ride.currentPosition);
          if (distance < minDistance) {
            minDistance = distance;
            startIndex = index;
          }
        });
        initialPosition = coordinates[startIndex];
      }
      
      startSimulation(ride._id, coordinates, ride.distanceKm, initialPosition, startIndex);
      setActiveSimulations(prev => ({ ...prev, [ride._id]: true }));
    } catch (error) {
      console.error("[RideSimulation] Error initializing simulation for started ride:", error);
    }
  }, [startSimulation]);

  // Initialize simulations
  useEffect(() => {
    syncPickupDropoffActions();
    
    startedRides.forEach(ride => {
      if (!activeSimulations[ride._id] && !simulationInitialized.current[ride._id]) {
        simulationInitialized.current[ride._id] = true;
        initializeSimulationForStartedRide(ride);
      }
    });
  }, [startedRides, activeSimulations, syncPickupDropoffActions, initializeSimulationForStartedRide]);

  // Manual pause function
  const toggleManualPause = useCallback((rideId: string) => {
    setManualPause(prev => {
      const newPauseState = !prev[rideId];
      
      if (newPauseState) {
        setSimulationPaused(prevSim => ({ ...prevSim, [rideId]: true }));
        isPausedRef.current[rideId] = true;
      } else {
        setSimulationPaused(prevSim => ({ ...prevSim, [rideId]: false }));
        isPausedRef.current[rideId] = false;
      }
      
      return { ...prev, [rideId]: newPauseState };
    });
  }, []);

  // Start a new ride
  const startRide = useCallback(async (rideId: string) => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride || !ride.rideId) {
        throw new Error("Ride or rideId not found");
      }

      const routeData = JSON.parse(ride.routeGeometry);
      const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      const initialPosition = coordinates[0] as [number, number];

      // Start tracking
      let trackingStarted = false;
      let retries = 3;
      
      while (retries > 0 && !trackingStarted) {
        try {
          await clientApiService.tracking.startTracking(ride._id, ride.driverId, initialPosition);
          trackingStarted = true;
        } catch (trackingError: any) {
          retries--;
          if (retries === 0) {
            console.warn("[RideSimulation] Tracking start failed after retries, continuing without tracking:", trackingError);
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Update ride status
      await clientApiService.ride.updateRide(ride._id, { 
        status: "Started",
        currentPosition: initialPosition 
      }, ride.driverId);
      
      updateRideRef.current(rideId, { 
        status: "Started", 
        currentPosition: initialPosition 
      });

      // Clear any previous state
      currentIndices.current[rideId] = 0;
      lastPositions.current[rideId] = initialPosition;
      isPausedRef.current[rideId] = false;
      simulationInitialized.current[rideId] = true;
      persistSimulationState();

      // Start simulation
      startSimulation(rideId, coordinates, ride.distanceKm, initialPosition, 0);
      setActiveSimulations(prev => ({ ...prev, [rideId]: true }));

    } catch (error: any) {
      console.error("[RideSimulation] Error starting ride:", error);
      throw error;
    }
  }, [persistSimulationState, startSimulation]);

  // Stop a ride
  const stopRide = useCallback(async (rideId: string) => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride) return;

      cleanupSimulation(rideId);
      
      delete currentIndices.current[rideId];
      delete lastPositions.current[rideId];
      delete isPausedRef.current[rideId];
      delete lastTrackingUpdate.current[rideId];
      delete simulationInitialized.current[rideId];
      
      setManualPause(prev => {
        const newState = { ...prev };
        delete newState[rideId];
        return newState;
      });
      
      persistSimulationState();
      
      await clientApiService.ride.updateRide(ride._id, { status: "Completed" }, ride.driverId);
      updateRideRef.current(rideId, { status: "Completed" });
      
      try {
        await clientApiService.tracking.stopTracking(ride._id);
      } catch (error) {
        console.warn("[RideSimulation] Error stopping tracking:", error);
      }
      
    } catch (error) {
      console.error("[RideSimulation] Error stopping ride:", error);
      throw error;
    }
  }, [cleanupSimulation, persistSimulationState]);

  // Resume simulation after pause
  const resumeSimulation = useCallback((rideId: string) => {
    setSimulationPaused(prev => ({ ...prev, [rideId]: false }));
    isPausedRef.current[rideId] = false;
    setCurrentPausedPassenger(prev => ({ ...prev, [rideId]: null }));
    
    setPausedPassengerIds(prev => ({
      ...prev,
      [rideId]: []
    }));
  }, []);

  // Handle passenger pickup
  const handlePickup = useCallback(async (rideId: string, passengerId: string) => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      await clientApiService.ride.updateRide(ride._id, { 
        passengerId: passengerId,
        action: "picked",
        currentPosition: lastPositions.current[rideId]
      }, ride.driverId);

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

      updateRideRef.current(rideId, {
        passengers: ride.passengers.map(p => 
          p.passengerId === passengerId 
            ? { ...p, pickedUp: true }
            : p
        )
      });

      setPausedPassengerIds(prev => ({
        ...prev,
        [rideId]: prev[rideId]?.filter(id => id !== passengerId) || []
      }));

      persistSimulationState();
      resumeSimulation(rideId);

    } catch (error) {
      console.error("[RideSimulation] Error handling pickup:", error);
      throw error;
    }
  }, [resumeSimulation, persistSimulationState]);

  // Handle passenger dropoff
  const handleDropoff = useCallback(async (rideId: string, passengerId: string) => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      await clientApiService.ride.updateRide(ride._id, { 
        passengerId: passengerId,
        action: "dropped",
        currentPosition: lastPositions.current[rideId]
      }, ride.driverId);

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

      updateRideRef.current(rideId, {
        passengers: ride.passengers.map(p => 
          p.passengerId === passengerId 
            ? { ...p, droppedOff: true }
            : p
        )
      });

      setPausedPassengerIds(prev => ({
        ...prev,
        [rideId]: prev[rideId]?.filter(id => id !== passengerId) || []
      }));

      persistSimulationState();
      resumeSimulation(rideId);

    } catch (error) {
      console.error("[RideSimulation] Error handling dropoff:", error);
      throw error;
    }
  }, [resumeSimulation, persistSimulationState]);

  // Other functions remain the same but use refs...
  const initializeMap = useCallback(async (ride: any, mapContainer: HTMLDivElement) => {
    if (!isClient || !mapContainer || mapRefs.current[ride._id]) return;

    try {
      const L = await import('leaflet');
      
      try {
        await import('leaflet/dist/leaflet.css');
      } catch (cssError) {
        console.warn("[RideSimulation] Could not load Leaflet CSS:", cssError);
      }

      if (mapRefs.current[ride._id]) {
        mapRefs.current[ride._id].remove();
      }

      const map = L.default.map(mapContainer).setView([20.5937, 78.9629], 5);
      mapRefs.current[ride._id] = map;

      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      mapContainer.style.height = "400px";
      mapContainer.style.width = "100%";

      try {
        const routeData = JSON.parse(ride.routeGeometry);
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

        routeLayers.current[ride._id] = L.default.polyline(coordinates, {
          color: "#3b82f6",
          weight: 5,
          opacity: 0.7
        }).addTo(map);

        const [startLat, startLng] = coordinates[0];
        const [endLat, endLng] = coordinates[coordinates.length - 1];

        L.default.marker([startLat, startLng], {
          icon: L.default.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>Start:</strong> ${ride.startPoint}`);

        L.default.marker([endLat, endLng], {
          icon: L.default.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`<strong>End:</strong> ${ride.endPoint}`);

        pickupMarkerRefs.current[ride._id] = [];
        dropoffMarkerRefs.current[ride._id] = [];

        ride.pickupPoints?.forEach((pickup: any, index: number) => {
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

        ride.dropoffPoints?.forEach((dropoff: any, index: number) => {
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

        let initialPosition = coordinates[0];
        if (ride.status === "Started") {
          if (currentIndices.current[ride._id] !== undefined) {
            const persistedIndex = Math.min(currentIndices.current[ride._id], coordinates.length - 1);
            initialPosition = coordinates[persistedIndex];
          } else if (ride.currentPosition) {
            initialPosition = ride.currentPosition;
          }
          
          vehicleMarkerRefs.current[ride._id] = L.default.marker(initialPosition, {
            icon: L.default.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup("Your Vehicle - Ready");
        }

        const allPoints = [
          ...coordinates,
          ...(ride.pickupPoints || []).map((p: any) => {
            const [lat, lng] = p.location.split(",").map(Number);
            return [lat, lng];
          }),
          ...(ride.dropoffPoints || []).map((d: any) => {
            const [lat, lng] = d.location.split(",").map(Number);
            return [lat, lng];
          })
        ];

        if (allPoints.length > 0) {
          const bounds = L.default.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [20, 20] });
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 100);

        lastPositions.current[ride._id] = initialPosition;
        
        if (ride.status === "Started" && !activeSimulations[ride._id]) {
          const startIndex = currentIndices.current[ride._id] || 0;
          startSimulation(ride._id, coordinates, ride.distanceKm, initialPosition, startIndex);
          setActiveSimulations(prev => ({ ...prev, [ride._id]: true }));
        }
      } catch (error) {
        console.error("[RideSimulation] Error rendering route:", error);
        map.setView([20.5937, 78.9629], 5);
      }
    } catch (error) {
      console.error("[RideSimulation] Error initializing map:", error);
    }
  }, [startSimulation, activeSimulations, isClient]);

  const cleanupMap = useCallback((rideId: string) => {
    cleanupSimulation(rideId);

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
    
    if (isPausedRef.current[rideId]) {
      delete isPausedRef.current[rideId];
    }
    
    if (lastTrackingUpdate.current[rideId]) {
      delete lastTrackingUpdate.current[rideId];
    }
    
    if (simulationInitialized.current[rideId]) {
      delete simulationInitialized.current[rideId];
    }
  }, [cleanupSimulation]);

  const handleEditRide = useCallback((rideId: string) => {
    console.log("[RideSimulation] Editing ride:", rideId);
  }, []);

  const handleEmergencyStop = useCallback(async (rideId: string) => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride) return;

      setSimulationPaused(prev => ({ ...prev, [rideId]: true }));
      isPausedRef.current[rideId] = true;
      
      await clientApiService.ride.updateRide(ride._id, { status: "Emergency" }, ride.driverId);
      updateRideRef.current(rideId, { status: "Emergency" });
      
    } catch (error) {
      console.error("[RideSimulation] Error during emergency stop:", error);
      throw error;
    }
  }, []);

  const handleJoinRequest = useCallback(async (rideId: string, passengerId: string, action: "accept" | "reject") => {
    try {
      const ride = ridesRef.current.find((r) => r._id === rideId);
      if (!ride) {
        throw new Error("Ride not found");
      }

      await clientApiService.ride.handleJoinRequest(rideId, ride.driverId, passengerId, action);
      
    } catch (error) {
      console.error("[RideSimulation] Error handling join request:", error);
      throw error;
    }
  }, []);

  return {
    pickupActions,
    dropoffActions,
    pausedPassengerIds,
    simulationPaused,
    activeSimulations,
    currentPausedPassenger,
    manualPause,
    
    startRide,
    stopRide,
    resumeSimulation,
    handlePickup,
    handleDropoff,
    handleEditRide,
    handleEmergencyStop,
    handleJoinRequest,
    toggleManualPause,
    initializeMap,
    cleanupMap,
  };
}