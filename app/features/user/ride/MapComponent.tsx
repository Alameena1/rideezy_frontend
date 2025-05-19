"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../../../services/api';

interface MapComponentProps {
  startPoint: string;
  endPoint: string;
  routeData: any;
  setRouteData: (data: any) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ startPoint, endPoint, routeData, setRouteData }) => {
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current && typeof window !== 'undefined') {
      mapRef.current = L.map('map').setView([10.8505, 76.2711], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !startPoint || !endPoint || typeof window === 'undefined') return;

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

    const fetchRoute = async () => {
      try {
        const data = await apiService.geo.calculateRoute(startPoint, endPoint);
        if (data.geometry && data.geometry.coordinates) {
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

    fetchRoute();
  }, [startPoint, endPoint, setRouteData]);

  return <div id="map" style={{ height: '400px' }} className="rounded-lg overflow-hidden" />;
};

export default MapComponent;