"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import MapComponent from './MapComponent';
import AddressSearch from './AddressSearch';
import RideFormFields from './RideFormFields';
import { apiService } from '../../../../services/api';
import { Vehicle } from '../../../types/vehicle';

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

const RideFormContainer: React.FC = () => {
  const [routeData, setRouteData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costPerPerson, setCostPerPerson] = useState<number | null>(null);
  const [distanceInKm, setDistanceInKm] = useState<number | null>(null);
  const [costCalcTimeout, setCostCalcTimeout] = useState<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await apiService.vehicle.getVehicles();
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
    if (routeData && vehicleId && passengerCount !== undefined && fuelPrice !== undefined) {
      if (costCalcTimeout) {
        clearTimeout(costCalcTimeout);
      }

      const timeout = setTimeout(() => {
        calculateCost();
      }, 500);

      setCostCalcTimeout(timeout);
    }
  }, [routeData, vehicleId, passengerCount, fuelPrice]);

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
    setCostPerPerson(perPersonCost);
  };

const onSubmit = async (data: FormData) => {
  if (!routeData) {
    console.log('Please calculate the route first');
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Route data is missing. Please ensure a valid route is calculated.',
    });
    return;
  }
  const selectedVehicle = vehicles.find(v => v._id === data.vehicleId);
  if (!selectedVehicle) {
    console.log('Invalid vehicle selected');
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Invalid vehicle selected. Please select a valid vehicle.',
    });
    return;
  }

  const formattedDate = new Date(data.date).toISOString().split('T')[0];
  const distanceInKm = Number(routeData.distance) / 1000;
  const fuelNeeded = distanceInKm / selectedVehicle.mileage;
  const totalFuelCost = fuelNeeded * Number(data.fuelPrice);
  const totalPeople = Number(data.passengerCount) + 1;
  const perPersonCost = totalFuelCost / totalPeople;

  // Ensure routeGeometry is a valid string
  let routeGeometry = '';
  if (routeData.geometry && Array.isArray(routeData.geometry) && routeData.geometry[0]) {
    routeGeometry = JSON.stringify(routeData.geometry[0]);
  } else if (routeData.geometry && routeData.geometry.coordinates) {
    routeGeometry = JSON.stringify(routeData.geometry);
  } else {
    console.error('Invalid route geometry:', routeData.geometry);
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Failed to calculate a valid route. Please try again.',
    });
    return;
  }

  const rideData = {
    vehicleId: data.vehicleId,
    date: formattedDate,
    time: data.time,
    startPoint: data.startPoint,
    endPoint: data.endPoint,
    passengerCount: Number(data.passengerCount),
    fuelPrice: Number(data.fuelPrice),
    distanceKm: distanceInKm,
    totalFuelCost: totalFuelCost,
    costPerPerson: perPersonCost,
    routeGeometry: routeGeometry,
  };

  console.log('Submitting rideData:', rideData);

  try {
    const response = await apiService.ride.startRide(rideData);
    Swal.fire({
      icon: 'success',
      title: 'Ride Initiated Successfully!',
      text: 'Would you like to view the ride details or go to the homepage?',
      showCancelButton: true,
      confirmButtonText: 'View Ride',
      cancelButtonText: 'Go Home',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = `/user/RideDetails`; 
      } else {
        window.location.href = '/';
      }
    });
  } catch (error: any) {
    console.error('Ride submit error:', error.response?.data || error.message);
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Failed to initiate the ride. Please try again.',
    });
  }
};
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Start a New Ride</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <MapComponent startPoint={startPoint} endPoint={endPoint} routeData={routeData} setRouteData={setRouteData} />
        </div>
        <div className="w-full md:w-1/2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AddressSearch
              label="Start Point"
              field="startPoint"
              placeNameField="startPlaceName"
              register={register}
              setValue={setValue}
              error={errors.startPoint?.message}
            />
            <AddressSearch
              label="End Point"
              field="endPoint"
              placeNameField="endPlaceName"
              register={register}
              setValue={setValue}
              error={errors.endPoint?.message}
            />
            <RideFormFields
              vehicles={vehicles}
              register={register}
              errors={errors}
              distanceInKm={distanceInKm}
              costPerPerson={costPerPerson}
            />
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

export default RideFormContainer;