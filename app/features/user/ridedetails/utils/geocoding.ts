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