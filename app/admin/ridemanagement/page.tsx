"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "@/services/api";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Ride {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  distanceKm: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  status: string;
  createdAt: string;
  passengers: { passengerId: string; passengerName: string }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  routeGeometry: string;
}

interface PassengerDetails {
  id: string;
  name: string;
  pickupLocation: string;
  pickupPlaceName: string;
  dropoffLocation: string;
  dropoffPlaceName: string;
}

export default function RideManagement() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [passengerDetails, setPassengerDetails] = useState<{ [rideId: string]: PassengerDetails[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRide, setExpandedRide] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((module) => {
        setLeafletLoaded(module.default);
      }).catch((err) => {
        console.error("Failed to load Leaflet:", err);
        setError("Failed to load map library. Please try again.");
      });
    }
  }, []);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        const fetchedRides = await apiService.admin.ride.getRides();
        console.log("Fetched rides:", fetchedRides);

        const mappedRides: Ride[] = fetchedRides.map((ride: any) => ({
          _id: ride._id.toString(),
          rideId: ride.rideId || "N/A",
          driverId: ride.driverId || "N/A",
          driverName: ride.driverName || "N/A",
          vehicleId: ride.vehicleId || "N/A",
          date: ride.date || "N/A",
          time: ride.time || "N/A",
          startPoint: ride.startPoint || "N/A",
          startPlaceName: ride.startPlaceName || ride.startPoint,
          endPoint: ride.endPoint || "N/A",
          endPlaceName: ride.endPlaceName || ride.endPoint,
          distanceKm: ride.distanceKm || 0,
          fuelPrice: ride.fuelPrice || 0,
          passengerCount: ride.passengerCount || 0,
          totalFuelCost: ride.totalFuelCost || 0,
          costPerPerson: ride.costPerPerson || 0,
          totalPeople: ride.totalPeople || 0,
          status: ride.status || "Pending",
          createdAt: ride.createdAt
            ? new Date(ride.createdAt).toLocaleDateString()
            : "N/A",
          passengers: ride.passengers || [],
          pickupPoints: ride.pickupPoints || [],
          dropoffPoints: ride.dropoffPoints || [],
          routeGeometry: ride.routeGeometry || "",
        }));

        setRides(mappedRides);

        const newPassengerDetails = mappedRides.reduce((acc, ride) => {
          acc[ride._id] = ride.passengers.map((passenger) => {
            const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
            const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
            return {
              id: passenger.passengerId,
              name: passenger.passengerName,
              pickupLocation: pickup ? pickup.location : "N/A",
              pickupPlaceName: pickup ? pickup.placeName : "N/A",
              dropoffLocation: dropoff ? dropoff.location : "N/A",
              dropoffPlaceName: dropoff ? dropoff.placeName : "N/A",
            };
          });
          return acc;
        }, {} as { [rideId: string]: PassengerDetails[] });

        setPassengerDetails(newPassengerDetails);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch rides";
        console.error("Fetch rides failed:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  const handleCancelRide = async (ride: Ride) => {
    try {
      await apiService.admin.ride.cancelRide(ride._id);
      setRides(rides.map((r) =>
        r._id === ride._id ? { ...r, status: "Canceled" } : r
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cancel ride";
      console.error("Cancel ride failed:", err);
      setError(errorMessage);
    }
  };

  const handleBlockRide = async (ride: Ride) => {
    try {
      await apiService.admin.ride.blockRide(ride._id);
      setRides(rides.map((r) =>
        r._id === ride._id ? { ...r, status: "Blocked" } : r
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to block ride";
      console.error("Block ride failed:", err);
      setError(errorMessage);
    }
  };

  const toggleDetails = (rideId: string) => {
    if (expandedRide === rideId) {
      cleanupMap(rideId);
      setExpandedRide(null);
    } else {
      setExpandedRide(rideId);
    }
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
    if (!ride.routeGeometry || mapRefs.current[ride._id] || !leafletLoaded || !leafletLoaded.map) {
      console.error("Cannot initialize map: Missing routeGeometry, Leaflet not loaded, or map already initialized");
      return;
    }

    const map = leafletLoaded.map(mapContainer, { zoomControl: true }).setView([0, 0], 8);
    leafletLoaded.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRefs.current[ride._id] = map;

    try {
      const routeData = JSON.parse(ride.routeGeometry);
      if (routeData.type === "LineString" && routeData.coordinates) {
        const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        routeLayers.current[ride._id] = leafletLoaded.polyline(coordinates, { color: "#3b9ddd", weight: 5 }).addTo(map);

        const [startLat, startLng] = coordinates[0];
        const [endLat, endLng] = coordinates[coordinates.length - 1];
        startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`Start: ${ride.startPlaceName}`);

        endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`End: ${ride.endPlaceName}`);

        pickupMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
          const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
          if (!pickup) return null;

          const [lat, lng] = pickup.location.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`Invalid pickup location for passenger ${passenger.passengerId}: ${pickup.location}`);
            return null;
          }

          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Pickup: ${pickup.placeName}`);
        }).filter((marker): marker is L.Marker => marker !== null);

        dropoffMarkerRefs.current[ride._id] = ride.passengers.map((passenger, index) => {
          const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
          if (!dropoff) return null;

          const [lat, lng] = dropoff.location.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) {
            console.error(`Invalid drop-off location for passenger ${passenger.passengerId}: ${dropoff.location}`);
            return null;
          }

          return leafletLoaded.marker([lat, lng], {
            icon: leafletLoaded.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            }),
          }).addTo(map).bindPopup(`Passenger ${index + 1} (${passenger.passengerName}) - Drop-off: ${dropoff.placeName}`);
        }).filter((marker): marker is L.Marker => marker !== null);

        map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [50, 50] });
      } else {
        console.error("Invalid route geometry:", routeData);
      }
    } catch (error) {
      console.error("Error parsing route geometry:", error);
      setError("Failed to render route map. Invalid route data.");
    }
  }, [leafletLoaded]);

  const cleanupMap = useCallback((rideId: string) => {
    if (mapRefs.current[rideId]) {
      mapRefs.current[rideId]?.remove();
      mapRefs.current[rideId] = null;
    }
    routeLayers.current[rideId] = null;
    startMarkerRefs.current[rideId] = null;
    endMarkerRefs.current[rideId] = null;
    pickupMarkerRefs.current[rideId]?.forEach(marker => marker.remove());
    pickupMarkerRefs.current[rideId] = [];
    dropoffMarkerRefs.current[rideId]?.forEach(marker => marker.remove());
    dropoffMarkerRefs.current[rideId] = [];
    mapContainerRefs.current[rideId] = null;
  }, []);

  useEffect(() => {
    if (!expandedRide || !leafletLoaded || !leafletLoaded.map) return;

    const ride = rides.find((r) => r._id === expandedRide);
    if (ride && mapContainerRefs.current[ride._id]) {
      initializeMap(ride, mapContainerRefs.current[ride._id]!);
    }
  }, [expandedRide, rides, initializeMap, leafletLoaded]);

  const renderStatus = (status: string) => {
    const color = status === "Pending" ? "text-orange-500" : status === "Canceled" ? "text-red-500" : status === "Blocked" ? "text-yellow-500" : "text-green-500";
    return <span className={color}>{status}</span>;
  };

  const formatNumber = (num: number): string => {
    return num.toFixed(1);
  };

  const truncateId = (id: string, length: number = 8): string => {
    if (id === "N/A") return id;
    return id.length > length ? `${id.substring(0, length)}...` : id;
  };

  return (
    <div className="bg-gray-900 text-white p-6 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6">Ride Management</h2>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-300 rounded-md border border-red-800 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400">Loading rides...</div>
      ) : rides.length === 0 ? (
        <div className="text-center text-gray-400">No rides found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="w-full border-collapse bg-gray-800 text-gray-200">
            <thead>
              <tr className="bg-gray-700 text-left text-sm uppercase tracking-wider">
                <th className="p-4 border-b border-gray-600 font-medium">#</th>
                <th className="p-4 border-b border-gray-600 font-medium">Ride ID</th>
                <th className="p-4 border-b border-gray-600 font-medium">Driver Name</th>
                <th className="p-4 border-b border-gray-600 font-medium">Date</th>
                <th className="p-4 border-b border-gray-600 font-medium">Start Location</th>
                <th className="p-4 border-b border-gray-600 font-medium">End Location</th>
                <th className="p-4 border-b border-gray-600 font-medium">Status</th>
                <th className="p-4 border-b border-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride, index) => {
                const isExpanded = expandedRide === ride._id;
                const passengersForRide = passengerDetails[ride._id] || [];

                return (
                  <>
                    <tr key={ride._id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4 font-mono text-sm">{truncateId(ride.rideId)}</td>
                      <td className="p-4">{ride.driverName}</td>
                      <td className="p-4">{ride.date}</td>
                      <td className="p-4">{ride.startPlaceName}</td>
                      <td className="p-4">{ride.endPlaceName}</td>
                      <td className="p-4">{renderStatus(ride.status)}</td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          {ride.status === "Pending" && (
                            <>
                              <button
                                onClick={() => handleCancelRide(ride)}
                                className="bg-red-700 text-white rounded px-3 py-1 hover:bg-red-600 transition-colors text-sm"
                              >
                                Cancel Ride
                              </button>
                              <button
                                onClick={() => handleBlockRide(ride)}
                                className="bg-yellow-700 text-white rounded px-3 py-1 hover:bg-yellow-600 transition-colors text-sm"
                              >
                                Block Ride
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => toggleDetails(ride._id)}
                            className="bg-gray-600 text-white rounded px-3 py-1 hover:bg-gray-500 transition-colors text-sm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-750">
                        <td colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-gray-200">Ride Details</h4>
                              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                <li><span className="font-medium">Ride ID:</span> {ride.rideId}</li>
                                <li><span className="font-medium">Driver ID:</span> {truncateId(ride.driverId)}</li>
                                <li><span className="font-medium">Driver Name:</span> {ride.driverName}</li>
                                <li><span className="font-medium">Vehicle ID:</span> {truncateId(ride.vehicleId)}</li>
                                <li><span className="font-medium">Date:</span> {ride.date}</li>
                                <li><span className="font-medium">Time:</span> {ride.time}</li>
                                <li><span className="font-medium">Start Location:</span> {ride.startPlaceName} ({ride.startPoint})</li>
                                <li><span className="font-medium">End Location:</span> {ride.endPlaceName} ({ride.endPoint})</li>
                                <li><span className="font-medium">Distance:</span> {formatNumber(ride.distanceKm)} km</li>
                                <li><span className="font-medium">Fuel Price:</span> {formatNumber(ride.fuelPrice)}</li>
                                <li><span className="font-medium">Passenger Count:</span> {ride.passengerCount}</li>
                                <li><span className="font-medium">Total Fuel Cost:</span> {formatNumber(ride.totalFuelCost)}</li>
                                <li><span className="font-medium">Cost Per Person:</span> {formatNumber(ride.costPerPerson)}</li>
                                <li><span className="font-medium">Total People:</span> {ride.totalPeople}</li>
                                <li><span className="font-medium">Status:</span> {renderStatus(ride.status)}</li>
                                <li><span className="font-medium">Created At:</span> {ride.createdAt}</li>
                              </ul>
                              <h4 className="text-lg font-semibold mt-4 mb-3 text-gray-200">Passenger Details</h4>
                              {passengersForRide.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                                  {passengersForRide.map((passenger, idx) => (
                                    <li key={idx}>
                                      <span className="font-medium">Passenger {idx + 1}:</span> {passenger.name} (ID: {truncateId(passenger.id)}) <br />
                                      <span className="font-medium">Pickup Location:</span> {passenger.pickupPlaceName} ({passenger.pickupLocation}) <br />
                                      <span className="font-medium">Drop-off Location:</span> {passenger.dropoffPlaceName} ({passenger.dropoffLocation})
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-400">No passengers assigned.</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold mb-3 text-gray-200">Route Map</h4>
                              <div
                                id={`map-${ride._id}`}
                                className="h-72 w-full rounded-lg border border-gray-600"
                                ref={(el) => {
                                  mapContainerRefs.current[ride._id] = el;
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}