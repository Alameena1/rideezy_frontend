"use client";

import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { apiService } from '../../../../services/api';
import Swal from "sweetalert2";

interface FormData {
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
}

interface AddressSearchProps {
  label: string;
  field: 'startPoint' | 'endPoint';
  placeNameField: 'startPlaceName' | 'endPlaceName';
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
  error?: string;
  allowCurrentLocation?: boolean;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  label,
  field,
  placeNameField,
  register,
  setValue,
  error,
  allowCurrentLocation = false,
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleSearch = (query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!query || query.length < 3 || typeof window === 'undefined') {
        setSuggestions([]);
        return;
      }
      try {
        const results = await apiService.geo.searchAddress(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Error searching address:', error);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSelect = (suggestion: any) => {
    if (suggestion) {
      setValue(field, `${suggestion.lat},${suggestion.lon}`);
      setValue(placeNameField, suggestion.display_name);
      setSuggestions([]);
    }
  };


const handleUseCurrentLocation = async () => {
  if (typeof window === "undefined" || !navigator.geolocation) {
    await Swal.fire({
      icon: "error",
      title: "Geolocation Not Supported",
      text: "Your browser does not support location services. Please enter your location manually.",
    });
    return;
  }

  setIsLoadingLocation(true);

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
    });

    const { latitude, longitude, accuracy } = position.coords;

    console.log("[Geo] Raw device coordinates:", {
      latitude,
      longitude,
      accuracy,
    });

    // Check if this is IP-based (huge accuracy value)
    if (accuracy && accuracy > 50000) {
      await Swal.fire({
        icon: "warning",
        title: "Approximate Location Detected",
        html: `
          Your device does not have GPS.<br/>
          Location is being determined using your IP address.<br/>
          <b>Accuracy:</b> about ${Math.round(accuracy / 1000)} km.
        `,
      });
    }

    // Reverse geocode
    let placeName: string;
    try {
      const geoResult = await apiService.geo.reverseGeocode(latitude, longitude);
      placeName =
        geoResult?.display_name ||
        `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } catch (error) {
      console.error("[Geo] Reverse geocoding failed:", error);
      placeName = `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }

    setValue(field, `${latitude},${longitude}`);
    setValue(placeNameField, placeName);
    setSuggestions([]);

    console.log("[Geo] Final Location:", {
      coords: `${latitude},${longitude}`,
      placeName,
      accuracy: accuracy ? `${accuracy}m` : "unknown",
    });
  } catch (error: any) {
    console.error("[Geo] Error fetching location:", error);

    if (error.code === error.PERMISSION_DENIED) {
      await Swal.fire({
        icon: "error",
        title: "Permission Denied",
        text: "Location access was denied. Please enable it in your browser settings.",
      });
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      await Swal.fire({
        icon: "error",
        title: "Location Unavailable",
        text: "Location services are not available. Please check your device settings.",
      });
    } else if (error.code === error.TIMEOUT) {
      await Swal.fire({
        icon: "error",
        title: "Request Timed Out",
        text: "Location request timed out. Try again outdoors or use manual search.",
      });
    } else {
      await Swal.fire({
        icon: "error",
        title: "Failed to Get Location",
        text: "Unable to fetch location. Please enter it manually.",
      });
    }
  } finally {
    setIsLoadingLocation(false);
  }
};


  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          {...register(placeNameField, { required: `${label} is required` })}
          onChange={(e) => handleSearch(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder={`Enter ${label.toLowerCase()}...`}
          suppressHydrationWarning
          data-1p-ignore
          data-lpignore="true"
        />
        {allowCurrentLocation && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            className={`mt-1 px-4 py-2 rounded-md text-sm font-medium ${
              isLoadingLocation 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoadingLocation ? '📡 Locating...' : '📍 Current'}
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <ul className="border border-gray-300 mt-1 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="p-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
            >
              <div className="text-sm font-medium">{suggestion.display_name.split(',')[0]}</div>
              <div className="text-xs text-gray-500">
                {suggestion.display_name.split(',').slice(1).join(',').trim()}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      <input
        type="hidden"
        {...register(field, {
          validate: (value: string) => {
            if (!value) return `${label} coordinates are required`;
            const [lat, lng] = value.split(',').map(Number);
            if (!lat || !lng) return 'Invalid coordinate format';
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Coordinates out of range';
            return true;
          },
        })}
      />
    </div>
  );
};


export default AddressSearch; 