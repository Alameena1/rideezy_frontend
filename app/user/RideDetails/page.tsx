"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useAuth from "@/app/hooks/useAuth";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as L from "leaflet";
import ErrorAlert from "../../features/user/vehicles/ErrorAlert";
import MainLayout from "../../comp/MainLayout"; 

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
  passengers: { passengerId: string; passengerName: string }[];
  pickupPoints: { passengerId: string; location: string; placeName: string }[];
  dropoffPoints: { passengerId: string; location: string; placeName: string }[];
  status: "Pending" | "Started" | "Completed" | "Cancelled";
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const mapRefs = useRef<{ [key: string]: L.Map | null }>({});
  const routeLayers = useRef<{ [key: string]: L.Polyline | null }>({});
  const startMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const endMarkerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const pickupMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const dropoffMarkerRefs = useRef<{ [key: string]: L.Marker[] }>({});
  const mapContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
    fetchRides();
  }, []);

  const fetchRides = async () => {
    setIsLoading(true);
    try {
      const ridesData = await apiService.ride.getRides();
      const fetchedRides = Array.isArray(ridesData.data) ? ridesData.data : [];
      const mappedRides: Ride[] = fetchedRides.map((ride: any) => ({
        _id: ride._id.toString(),
        rideId: ride.rideId || "N/A",
        driverId: ride.driverId || "N/A",
        vehicleId: ride.vehicleId || "N/A",
        date: ride.date || "N/A",
        time: ride.time || "N/A",
        startPoint: ride.startPoint || "N/A",
        endPoint: ride.endPoint || "N/A",
        distanceKm: ride.distanceKm || 0,
        mileage: ride.mileage || 0,
        fuelPrice: ride.fuelPrice || 0,
        passengerCount: ride.passengerCount || 0,
        totalFuelCost: ride.totalFuelCost || 0,
        costPerPerson: ride.costPerPerson || 0,
        totalPeople: ride.totalPeople || 0,
        passengers: ride.passengers || [],
        pickupPoints: ride.pickupPoints || [],
        dropoffPoints: ride.dropoffPoints || [],
        status: ride.status || "Pending",
        routeGeometry: ride.routeGeometry || "",
      }));
      setRides(mappedRides);

      const placePromises = mappedRides.map(async (ride: Ride) => {
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

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await response.json();
      return data.display_name || `${lat},${lon}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${lat},${lon}`;
    }
  };

  const initializeMap = useCallback((ride: Ride, mapContainer: HTMLDivElement) => {
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
        startMarkerRefs.current[ride._id] = leafletLoaded.marker([startLat, startLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`Start: ${placeNames[ride._id]?.startPlace || ride.startPoint}`);

        endMarkerRefs.current[ride._id] = leafletLoaded.marker([endLat, endLng], {
          icon: leafletLoaded.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(map).bindPopup(`End: ${placeNames[ride._id]?.endPlace || ride.endPoint}`);

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
  }, [leafletLoaded, placeNames]);

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

  const toggleCollapsible = (rideId: string) => {
    if (openCollapsible === rideId) {
      cleanupMap(rideId);
      setOpenCollapsible(null);
    } else {
      setOpenCollapsible(rideId);
    }
  };

  const openEditModal = (ride: Ride) => {
    setSelectedRide(ride);
    setEditDate(new Date(ride.date).toISOString().split("T")[0]);
    setEditTime(ride.time || "");
    setEditModalOpen(true);
  };

  const handleEditRide = async () => {
    if (!selectedRide) return;

    try {
      await apiService.ride.editRide(selectedRide.rideId!, {
        date: editDate,
        time: editTime,
      });
      setEditModalOpen(false);
      setSelectedRide(null);
      await fetchRides(); // Refresh the rides list
    } catch (error: any) {
      setError(error.message || "Failed to edit ride");
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (confirm("Are you sure you want to cancel this ride?")) {
      try {
        await apiService.ride.cancelRide(rideId);
        await fetchRides(); // Refresh the rides list
      } catch (error: any) {
        setError(error.message || "Failed to cancel ride");
      }
    }
  };

  useEffect(() => {
    if (!openCollapsible || !leafletLoaded || !leafletLoaded.map) return;

    const ride = rides.find((r) => r._id === openCollapsible);
    if (ride && mapContainerRefs.current[ride._id]) {
      initializeMap(ride, mapContainerRefs.current[ride._id]!);
    }
  }, [openCollapsible, rides, initializeMap, leafletLoaded]);

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
                  const seatsLeft = (ride.totalPeople - 1) - ride.passengerCount;
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
                                      : ride.status === "Completed"
                                      ? "text-green-600"
                                      : "text-red-600"
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
                          <div className="flex space-x-2">
                            {ride.status === "Pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(ride)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelRide(ride.rideId!)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
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
                                  {ride.passengerCount}
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
                            <div>
                              <h4 className="text-md font-semibold text-gray-700 mb-2 mt-4">Passenger Details</h4>
                              {ride.passengers.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                                  {ride.passengers.map((passenger, index) => {
                                    const pickup = ride.pickupPoints.find(p => p.passengerId === passenger.passengerId);
                                    const dropoff = ride.dropoffPoints.find(p => p.passengerId === passenger.passengerId);
                                    return (
                                      <li key={index}>
                                        <span className="font-medium">Passenger {index + 1}:</span> {passenger.passengerName} (ID: {passenger.passengerId}) <br />
                                        <span className="font-medium">Pickup Location:</span> {pickup ? pickup.placeName : "N/A"} ({pickup ? pickup.location : "N/A"}) <br />
                                        <span className="font-medium">Drop-off Location:</span> {dropoff ? dropoff.placeName : "N/A"} ({dropoff ? dropoff.location : "N/A"})
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-600">No passengers assigned.</p>
                              )}
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

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ride</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="col-span-3"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRide}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}