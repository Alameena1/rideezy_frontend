"use client";

import React, { useState, useEffect } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { clientApiService } from "@/services/client/client-api";
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation } from "lucide-react";

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSearch = (query: string) => {
    if (!isClient) return;

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }
      try {
        const results = await clientApiService.geo.searchAddress(query);
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
    if (!isClient || typeof window === "undefined" || !navigator.geolocation) {
      await Swal.fire({
        icon: "error",
        title: "Geolocation Not Supported",
        text: "Your browser does not support location services. Please enter your location manually.",
        background: '#fff',
        color: '#374151',
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
          background: '#fff',
          color: '#374151',
        });
      }

      // Reverse geocode
      let placeName: string;
      try {
        const geoResult = await clientApiService.geo.reverseGeocode(latitude, longitude);
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
          background: '#fff',
          color: '#374151',
        });
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        await Swal.fire({
          icon: "error",
          title: "Location Unavailable",
          text: "Location services are not available. Please check your device settings.",
          background: '#fff',
          color: '#374151',
        });
      } else if (error.code === error.TIMEOUT) {
        await Swal.fire({
          icon: "error",
          title: "Request Timed Out",
          text: "Location request timed out. Try again outdoors or use manual search.",
          background: '#fff',
          color: '#374151',
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Failed to Get Location",
          text: "Unable to fetch location. Please enter it manually.",
          background: '#fff',
          color: '#374151',
        });
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={placeNameField} className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-600" />
        {label}
      </Label>
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id={placeNameField}
            type="text"
            {...register(placeNameField, { required: `${label} is required` })}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
            placeholder={`Enter ${label.toLowerCase()}...`}
            suppressHydrationWarning
            data-1p-ignore
            data-lpignore="true"
          />
          
          {suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 border shadow-lg max-h-60 overflow-y-auto">
              <CardContent className="p-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    onClick={() => handleSelect(suggestion)}
                    className="p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors border-b last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {suggestion.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.display_name.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {isClient && allowCurrentLocation && (
          <Button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            title="Use current location"
          >
            {isLoadingLocation ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
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