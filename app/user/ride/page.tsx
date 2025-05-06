"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../../services/api';

interface FormData {
  date: string;
  time: string;
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
  passengerCount: number;
  fuelPrice: number;
  vehicleId: string;
}

interface Vehicle {
  _id: string;
  vehicleName: string;
  mileage: number;
}

const RideForm = () => {
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costPerPerson, setCostPerPerson] = useState<number | null>(null);
  const [distanceInKm, setDistanceInKm] = useState<number | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue, getValues, watch } = useForm<FormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      passengerCount: 1,
      fuelPrice: 0,
      vehicleId: '',
      startPoint: '',
      startPlaceName: '',
      endPoint: '',
      endPlaceName: '',
    },
  });

  const startPoint = watch('startPoint');
  const endPoint = watch('endPoint');
  const vehicleId = watch('vehicleId');
  const passengerCount = watch('passengerCount');
  const fuelPrice = watch('fuelPrice');

  // State for debouncing search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  // State for debouncing cost calculation
  const [costCalcTimeout, setCostCalcTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await apiService.getVehicles();
        setVehicles(vehiclesData);
        if (vehiclesData.length > 0) {
          setValue('vehicleId', vehiclesData[0]._id);
        }
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      }
    };
    fetchVehicles();
  }, [setValue]);

  useEffect(() => {
    if (!mapRef.current && typeof window !== 'undefined') {
      mapRef.current = L.map('map').setView([10.8505, 76.2711], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }
  }, []);

  // Effect for route calculation (depends on startPoint and endPoint only)
  useEffect(() => {
    if (startPoint && endPoint) {
      calculateRoute();
    }
  }, [startPoint, endPoint]);

  // Effect for cost calculation (debounced, depends on routeData, vehicleId, passengerCount, fuelPrice)
  useEffect(() => {
    if (routeData && vehicleId && passengerCount !== undefined && fuelPrice !== undefined) {
      // Clear existing timeout
      if (costCalcTimeout) {
        clearTimeout(costCalcTimeout);
      }

      // Set a new timeout for debouncing
      const timeout = setTimeout(() => {
        calculateCost();
      }, 500); // 500ms debounce delay

      setCostCalcTimeout(timeout);
    }
  }, [routeData, vehicleId, passengerCount, fuelPrice]);

  const searchAddress = (query: string, setSuggestions: (suggestions: any[]) => void) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!query || query.length < 3 || typeof window === 'undefined') {
        setSuggestions([]);
        return;
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'Rideezy/1.0 (alameen.alameen8086@gmail.com)' } }
        );
        if (!response.ok) throw new Error(`Nominatim request failed with status ${response.status}`);
        const data = await response.json();
        const keralaResults = data.filter((result: any) => result.address && result.address.state === 'Kerala');
        setSuggestions(keralaResults);
      } catch (error) {
        console.error('Error searching address:', error);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const calculateRoute = async () => {
    if (!mapRef.current || typeof window === 'undefined') return;
    const startPoint = getValues('startPoint');
    const endPoint = getValues('endPoint');

    if (!startPoint || !endPoint) {
      console.log('Missing required fields for calculateRoute:', { startPoint, endPoint });
      return;
    }

    const [startLat, startLng] = startPoint.split(',').map(Number);
    const [endLat, endLng] = endPoint.split(',').map(Number);

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      console.log('Invalid coordinates:', { startLat, startLng, endLat, endLng });
      return;
    }

    if (startMarkerRef.current) mapRef.current.removeLayer(startMarkerRef.current);
    if (endMarkerRef.current) mapRef.current.removeLayer(endMarkerRef.current);
    startMarkerRef.current = L.marker([startLat, startLng], { draggable: true }).addTo(mapRef.current);
    endMarkerRef.current = L.marker([endLat, endLng], { draggable: true }).addTo(mapRef.current);

    try {
      const response = await fetch('http://localhost:3001/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startPoint: `${startLng},${startLat}`, endPoint: `${endLng},${endLat}` }),
      });
      const data = await response.json();
      if (response.ok && data.geometry && data.geometry.coordinates) {
        const route = data.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        if (routeLayer.current) mapRef.current.removeLayer(routeLayer.current);
        routeLayer.current = L.polyline(route, { color: '#3b9ddd', weight: 5 }).addTo(mapRef.current);
        setRouteData(data);
        mapRef.current.fitBounds(L.latLngBounds([[startLat, startLng], [endLat, endLng]]), { padding: [50, 50] });
      } else {
        console.error('Unable to calculate route:', data);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const calculateCost = () => {
    const fuelPrice = Number(getValues('fuelPrice'));
    const passengerCount = Number(getValues('passengerCount'));
    const vehicleId = getValues('vehicleId');

    if (!routeData || !vehicleId || passengerCount === undefined || fuelPrice === undefined) {
      console.log('Missing required fields for calculateCost:', { routeData, vehicleId, passengerCount, fuelPrice });
      return;
    }

    const selectedVehicle = vehicles.find(v => v._id === vehicleId);
    if (!selectedVehicle) {
      console.log('Please select a valid vehicle');
      return;
    }

    const distanceInKm = routeData.distance / 1000;
    setDistanceInKm(distanceInKm);
    const fuelNeeded = distanceInKm / selectedVehicle.mileage;
    const totalFuelCost = fuelNeeded * fuelPrice;
    const totalPeople = passengerCount + 1;
    const perPersonCost = totalFuelCost / totalPeople;
    console.log('Debug:', { distanceInKm, fuelNeeded, totalFuelCost, passengerCount, totalPeople, perPersonCost });
    setCostPerPerson(perPersonCost);
  };

  const handleSuggestionSelect = (field: 'startPoint' | 'endPoint', suggestion: any) => {
    if (suggestion) {
      setValue(field, `${suggestion.lat},${suggestion.lon}`);
      setValue(field === 'startPoint' ? 'startPlaceName' : 'endPlaceName', suggestion.display_name);
    }
    setStartSuggestions([]);
    setEndSuggestions([]);
  };

  const onSubmit = async (data: FormData) => {
    if (!routeData) {
      console.log('Please calculate the route first');
      return;
    }
    const selectedVehicle = vehicles.find(v => v._id === data.vehicleId);
    if (!selectedVehicle) {
      console.log('Invalid vehicle selected');
      return;
    }

    const formattedDate = new Date(data.date).toISOString().split('T')[0];
    const distanceInKm = Number(routeData.distance) / 1000;
    const fuelNeeded = distanceInKm / selectedVehicle.mileage;
    const totalFuelCost = fuelNeeded * Number(data.fuelPrice);
    const totalPeople = Number(data.passengerCount) + 1;
    const perPersonCost = totalFuelCost / totalPeople;

    const rideData = {
      ...data,
      date: formattedDate,
      passengerCount: Number(data.passengerCount),
      fuelPrice: Number(data.fuelPrice),
      fuelCost: totalFuelCost,
      distance: distanceInKm,
      routeGeometry: JSON.stringify(routeData.geometry),
      costPerPerson: perPersonCost,
    };
    try {
      console.log('Submitting ride data:', rideData);
      const response = await apiService.startRide(rideData);
      console.log('Ride started successfully:', response);
      window.location.href = '/';
    } catch (error: any) {
      console.error('Ride submit error:', error.response?.data || error.message);
    }
  };

  const validateCoordinates = (value: string) => {
    const [lat, lng] = value.split(',').map(Number);
    if (!lat || !lng) return 'Invalid coordinate format';
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Coordinates out of range';
    return true;
  };

  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<any[]>([]);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Start a New Ride</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <div id="map" style={{ height: '400px' }} className="rounded-lg overflow-hidden"></div>
        </div>
        <div className="w-full md:w-1/2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.date && <p className="text-red-600 text-sm">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                {...register('time', { required: 'Time is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.time && <p className="text-red-600 text-sm">{errors.time.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle</label>
              <select
                {...register('vehicleId', { required: 'Vehicle is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.vehicleName} (Mileage: {vehicle.mileage} km/l)
                  </option>
                ))}
              </select>
              {errors.vehicleId && <p className="text-red-600 text-sm">{errors.vehicleId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Point</label>
              <input
                type="text"
                {...register('startPlaceName', { required: 'Start point is required' })}
                onChange={(e) => searchAddress(e.target.value, setStartSuggestions)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {startSuggestions.length > 0 && (
                <ul className="border mt-1 rounded-md">
                  {startSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionSelect('startPoint', suggestion)}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                    >
                      {suggestion.display_name}
                    </li>
                  ))}
                </ul>
              )}
              {errors.startPoint && <p className="text-red-600 text-sm">{errors.startPoint.message}</p>}
              <input type="hidden" {...register('startPoint', { validate: validateCoordinates })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Point</label>
              <input
                type="text"
                {...register('endPlaceName', { required: 'End point is required' })}
                onChange={(e) => searchAddress(e.target.value, setEndSuggestions)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {endSuggestions.length > 0 && (
                <ul className="border mt-1 rounded-md">
                  {endSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionSelect('endPoint', suggestion)}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                    >
                      {suggestion.display_name}
                    </li>
                  ))}
                </ul>
              )}
              {errors.endPoint && <p className="text-red-600 text-sm">{errors.endPoint.message}</p>}
              <input type="hidden" {...register('endPoint', { validate: validateCoordinates })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passenger Count</label>
              <input
                type="number"
                {...register('passengerCount', { required: 'Passenger count is required', min: 1, max: 4 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.passengerCount && <p className="text-red-600 text-sm">{errors.passengerCount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fuel Price (per liter)</label>
              <input
                type="number"
                {...register('fuelPrice', { required: 'Fuel price is required', min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.fuelPrice && <p className="text-red-600 text-sm">{errors.fuelPrice.message}</p>}
            </div>
            {distanceInKm !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Distance</label>
                <p className="mt-1 text-lg font-semibold">{distanceInKm.toFixed(2)} km</p>
              </div>
            )}
            {costPerPerson !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Per Person</label>
                <p className="mt-1 text-lg font-semibold">{costPerPerson.toFixed(2)} INR</p>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800"
            >
              Start Ride
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RideForm;