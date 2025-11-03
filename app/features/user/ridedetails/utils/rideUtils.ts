import { Ride } from "../context/RideDetailsContext";

export function isRideTimeReached(ride: Ride): boolean {
  if (!ride.date || ride.date === "N/A" || !ride.time || ride.time === "N/A") return false;
  
  try {
    // Parse the ride date and time
    const rideDateTime = new Date(`${ride.date}T${ride.time}:00`);
    const now = new Date();
    
    // Check if ride time has passed (current time is after ride time)
    const hasRideTimePassed = now >= rideDateTime;
    
    // Also allow starting if ride time is within the next 30 minutes
    const timeUntilRide = rideDateTime.getTime() - now.getTime();
    const isWithin30Minutes = timeUntilRide <= 30 * 60 * 1000 && timeUntilRide > 0;
    
    console.log(`[RideUtils] Ride time: ${rideDateTime}`);
    console.log(`[RideUtils] Current time: ${now}`);
    console.log(`[RideUtils] Time until ride: ${Math.round(timeUntilRide / 1000 / 60)} minutes`);
    console.log(`[RideUtils] Has ride time passed: ${hasRideTimePassed}`);
    console.log(`[RideUtils] Is within 30 minutes: ${isWithin30Minutes}`);
    console.log(`[RideUtils] Ride status: ${ride.status}`);
    console.log(`[RideUtils] Can start ride: ${(hasRideTimePassed || isWithin30Minutes) && ride.status === "Pending"}`);
    
    // Allow starting if ride time has passed OR if it's within 30 minutes
    return (hasRideTimePassed || isWithin30Minutes) && ride.status === "Pending";
  } catch (error) {
    console.error("[RideUtils] Error checking ride time:", error);
    return false;
  }
}

// For testing - only return true in development mode with specific condition
export function isRideTimeReachedTest(ride: Ride): boolean {
  // Check if we're in development mode and if there's a specific test parameter
  const isDevelopment = process.env.NODE_ENV === 'development';
  const urlParams = new URLSearchParams(window.location.search);
  const forceEnable = urlParams.get('testRideStart') === 'true';
  
  if (isDevelopment && forceEnable) {
    console.log(`[RideUtils] TEST MODE - Allowing ride start for: ${ride._id}`);
    return ride.status === "Pending";
  } else {
    // Use real timing logic even in development unless explicitly forced
    console.log(`[RideUtils] Using real timing check for: ${ride._id}`);
    return isRideTimeReached(ride);
  }
}

// Main function to use - combines both logic with proper environment handling
export function canStartRide(ride: Ride): boolean {
  if (process.env.NODE_ENV === 'development') {
    return isRideTimeReachedTest(ride);
  } else {
    return isRideTimeReached(ride);
  }
}

export function calculateHaversineDistance(coord1: [number, number], coord2: [number, number]): number {
  if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2 || 
      coord1.some(isNaN) || coord2.some(isNaN)) {
    console.error("[RideUtils] Invalid coordinates for Haversine:", { coord1, coord2 });
    return Infinity;
  }
  
  try {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
    const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
    const lat1Rad = coord1[0] * Math.PI / 180;
    const lat2Rad = coord2[0] * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  } catch (error) {
    console.error("[RideUtils] Error calculating Haversine distance:", error);
    return Infinity;
  }
}

const placeNameCache: { [key: string]: string } = {};

export const reverseGeocode = async (lat: number, lon: number, retries = 3, delay = 2000): Promise<string> => {
  const cacheKey = `${lat},${lon}`;
  if (placeNameCache[cacheKey]) {
    console.log("[Geocoding] Returning cached place name for", cacheKey);
    return placeNameCache[cacheKey];
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=18&addressdetails=1`,
        {
          headers: { 
            'User-Agent': 'RideEzy/1.0 (contact@rideezy.com)',
            'Accept-Language': 'en'
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract English place name with better formatting
      let placeName = data.display_name;
      
      // Try to get a more structured English address
      if (data.address) {
        const address = data.address;
        
        // Build address in priority order
        if (address.road) {
          placeName = address.road;
          if (address.suburb) placeName += `, ${address.suburb}`;
          else if (address.city) placeName += `, ${address.city}`;
          else if (address.town) placeName += `, ${address.town}`;
          else if (address.village) placeName += `, ${address.village}`;
        } else if (address.suburb) {
          placeName = address.suburb;
          if (address.city) placeName += `, ${address.city}`;
        } else if (address.city) {
          placeName = address.city;
        } else if (address.town) {
          placeName = address.town;
        } else if (address.village) {
          placeName = address.village;
        } else if (address.county) {
          placeName = address.county;
        }
        
        // Add state/country if we have a basic place name
        if (placeName && placeName !== data.display_name) {
          if (address.state) placeName += `, ${address.state}`;
          else if (address.country) placeName += `, ${address.country}`;
        }
      }
      
      // Fallback to display_name but clean it up
      if (!placeName || placeName === data.display_name) {
        placeName = data.display_name.split(',').slice(0, 3).join(','); // Take first 3 parts
      }

      placeNameCache[cacheKey] = placeName;
      console.log("[Geocoding] Successfully fetched place name for", cacheKey, ":", placeName);
      return placeName;
      
    } catch (error) {
      console.error(`[Geocoding] Reverse geocode attempt ${i + 1} failed for ${cacheKey}:`, error);
      if (i < retries - 1) {
        console.log(`[Geocoding] Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.warn(`[Geocoding] All retries failed for ${cacheKey}, returning coordinates`);
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
};

export const getPlaceNamesForRides = async (rides: any[]) => {
  const placePromises = rides.map(async (ride) => {
    try {
      const [startLat, startLon] = ride.startPoint.split(",").map(Number);
      const [endLat, endLon] = ride.endPoint.split(",").map(Number);
      
      if (isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)) {
        console.warn(`[Geocoding] Invalid coordinates for ride ${ride._id}: ${ride.startPoint}, ${ride.endPoint}`);
        return { rideId: ride._id, startPlace: ride.startPoint, endPlace: ride.endPoint };
      }
      
      let startPlace = ride.startPoint;
      let endPlace = ride.endPoint;
      
      try {
        startPlace = await reverseGeocode(startLat, startLon);
        endPlace = await reverseGeocode(endLat, endLon);
      } catch (error) {
        console.error(`[Geocoding] Failed to geocode for ride ${ride._id}:`, error);
      }
      
      return { rideId: ride._id, startPlace, endPlace };
    } catch (error) {
      console.error(`[Geocoding] Error processing place names for ride ${ride._id}:`, error);
      return { rideId: ride._id, startPlace: ride.startPoint, endPlace: ride.endPoint };
    }
  });

  const placeResults = await Promise.all(placePromises);
  return placeResults.reduce((acc, { rideId, startPlace, endPlace }) => {
    acc[rideId] = { startPlace, endPlace };
    return acc;
  }, {} as { [key: string]: { startPlace: string; endPlace: string } });
};