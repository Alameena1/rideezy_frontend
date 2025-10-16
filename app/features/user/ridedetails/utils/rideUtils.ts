import { Ride } from "../context/RideDetailsContext";

export function isRideTimeReached(ride: Ride): boolean {
  if (!ride.date || ride.date === "N/A" || !ride.time || ride.time === "N/A") return false;
  const rideStartTime = new Date(`${ride.date}T${ride.time}:00`).getTime();
  const now = new Date().getTime();
  return now >= rideStartTime && ride.status === "Pending";
}

export function calculateHaversineDistance(coord1: [number, number], coord2: [number, number]): number {
  if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2 || coord1.some(isNaN) || coord2.some(isNaN)) {
    console.error("[RideDetails] Invalid coordinates for Haversine:", { coord1, coord2 });
    return Infinity;
  }
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}