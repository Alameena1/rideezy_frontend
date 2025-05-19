"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as L from "leaflet";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "@/app/comp/MainLayout";

import "leaflet/dist/leaflet.css";

interface Ride {
  _id: string;
  rideId?: string;
  driverId: string;
  vehicleId: string;
  date: string;
  time?: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  mileage?: number;
  fuelPrice: number;
  passengerCount: number;
  totalFuelCost: number;
  costPerPerson: number;
  totalPeople: number;
  passengers: string[];
  status: "Pending" | "Started" | "Completed";
  routeGeometry: string;
}

interface PlaceName {
  startPlace: string;
  endPlace: string;
}

export default function RideDetails() {
  useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const [placeNames, setPlaceNames] = useState<{ [key: string]: PlaceName }>({});
  const [leafletLoaded, setLeafletLoaded] = useState<typeof L | null>(null);

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Load Leaflet dynamically on the client side
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

  // Fetch rides on mount
  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    setIsLoading(true);
    try {
      const ridesData = await apiService.ride.getRides();
      const fetchedRides = Array.isArray(ridesData.data) ? ridesData.data : [];
      setRides(fetchedRides);

      // Fetch place names for each ride
      const placePromises = fetchedRides.map(async (ride: Ride) => {
        const [startLat, startLon] = ride.startPoint.split(",").map(Number);
        const [endLat, endLon] = ride.endPoint.split(",").map(Number);

        const startPlace = await reverseGeocode(startLat, startLon);
        const endPlace = await reverseGeocode(endLat, endLon);

        return { rideId: ride._id, startPlace, endPlace };
      });

      const placeResults = await Promise.all(placePromises);
      const newPlaceNames = placeResults.reduce((acc, { rideId, startPlace, endPlace }) => {
        acc[rideId] = { startPlace, endPlace };
        return acc;
      }, {} as { [key: string]: PlaceName });

      setPlaceNames(newPlaceNames);
    } catch (error) {
      console.error("Error fetching rides:", error);
      setError("Failed to fetch rides. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reverse geocode coordinates to place names using Nominatim
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await response.json();
      return data.display_name || `${lat},${lon}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat},${lon}`; // Fallback to coordinates if geocoding fails
    }
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
    // Only initialize if the map doesn't already exist and Leaflet is loaded
    if (mapRefs.current[ride._id] || !leafletLoaded || !leafletLoaded.map) {
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
        startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng]).addTo(map);
        endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng]).addTo(map);

        map.fitBounds(leafletLoaded.latLngBounds(coordinates), { padding: [50, 50] });
      } else {
        console.error("Invalid route geometry:", routeData);
      }
    } catch (error) {
      console.error("Error parsing route geometry:", error);
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
    mapContainerRefs.current[rideId] = null;
  }, []);

  const toggleCollapsible = (rideId: string) => {
    if (openCollapsible === rideId) {
      cleanupMap(rideId);
      setOpenCollapsible(null);
    } else {
      setOpenCollapsible(rideId);
    }
  };

  // Initialize maps when collapsible is opened and Leaflet is loaded
  useEffect(() => {
    if (!openCollapsible || !leafletLoaded || !leafletLoaded.map) return;

    const ride = rides.find((r) => r._id === openCollapsible);
    if (ride && mapContainerRefs.current[ride._id]) {
      initializeMap(ride, mapContainerRefs.current[ride._id]!);
    }
  }, [openCollapsible, rides, initializeMap]);

  return (
    <MainLayout activeItem="Rides">
      <div className="mx-auto max-w-5xl p-4">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Your Rides</CardTitle>
                <CardDescription className="text-gray-500">{currentDate}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {error && <ErrorAlert message={error} />}
            {isLoading ? (
              <p className="text-gray-600">Loading rides...</p>
            ) : rides.length === 0 ? (
              <p className="text-gray-600">No rides found.</p>
            ) : (
              <div className="grid gap-6">
                {rides.map((ride) => {
                  const seatsLeft = (ride.totalPeople - 1) - (ride.passengers?.length || 0);
                  const place = placeNames[ride._id] || { startPlace: ride.startPoint, endPlace: ride.endPoint };

                  return (
                    <Card key={ride._id} className="p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {place.startPlace} to {place.endPlace}
                            </h3>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Date:</span>{" "}
                                {new Date(ride.date).toLocaleDateString()}
                                {ride.time && (
                                  <>
                                    {" | "}
                                    <span className="font-medium">Time:</span> {ride.time}
                                  </>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Status:</span>{" "}
                                <span
                                  className={`${
                                    ride.status === "Pending"
                                      ? "text-yellow-600"
                                      : ride.status === "Started"
                                      ? "text-blue-600"
                                      : "text-green-600"
                                  } font-medium`}
                                >
                                  {ride.status}
                                </span>
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Distance:</span>{" "}
                                {(ride.distanceKm ?? 0).toFixed(2)} km{" | "}
                                <span className="font-medium">Cost per Person:</span>{" "}
                                {(ride.costPerPerson ?? 0).toFixed(2)} INR
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Seats Left:</span> {seatsLeft}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                        <Collapsible
                          open={openCollapsible === ride._id}
                          onOpenChange={() => toggleCollapsible(ride._id)}
                        >
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2">
                              {openCollapsible === ride._id ? "Hide Details" : "Show More"}
                              {openCollapsible === ride._id ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4">
                            <Separator className="mb-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">
                                  Additional Details
                                </h4>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Passenger Count:</span>{" "}
                                  {ride.passengers?.length || 0}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Total People:</span> {ride.totalPeople}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Fuel Price:</span> {ride.fuelPrice} INR
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Total Fuel Cost:</span>{" "}
                                  {(ride.totalFuelCost ?? 0).toFixed(2)} INR
                                </p>
                              </div>
                              <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">Route Map</h4>
                                <div
                                  id={`map-${ride._id}`}
                                  className="h-64 w-full rounded-lg"
                                  ref={(el) => {
                                    mapContainerRefs.current[ride._id] = el;
                                  }}
                                />
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}