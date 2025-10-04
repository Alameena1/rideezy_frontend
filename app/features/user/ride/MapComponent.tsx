"use client";

import React, { useEffect, useRef, useState } from 'react';

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    console.log('MapComponent - Coordinates:', { startPoint, endPoint });
    
    if (!isClient || !startPoint || !endPoint) {
      console.log('MapComponent - Missing data:', { isClient, startPoint, endPoint });
      return;
    }

    const initializeMap = async () => {
      // Dynamically import Leaflet
      const L = await import('leaflet');
      
      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      if (!mapRef.current) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        
        mapRef.current = L.map('map').setView([10.8505, 76.2711], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current);
      }

      const [startLat, startLng] = startPoint.split(',').map(Number);
      const [endLat, endLng] = endPoint.split(',').map(Number);

      console.log('Parsed coordinates:', { startLat, startLng, endLat, endLng });

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        console.error('Invalid coordinates:', { startLat, startLng, endLat, endLng });
        return;
      }

      // Check if coordinates are the same
      if (startLat === endLat && startLng === endLng) {
        console.warn('Start and end points are identical!');
      }

      // Clear existing markers and route
      if (startMarkerRef.current) mapRef.current!.removeLayer(startMarkerRef.current);
      if (endMarkerRef.current) mapRef.current!.removeLayer(endMarkerRef.current);
      if (routeLayer.current) mapRef.current!.removeLayer(routeLayer.current);

      // Add markers with custom icons
      const startIcon = L.divIcon({
        html: '<div style="background-color: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: 'custom-start-marker',
        iconSize: [20, 20],
      });

      const endIcon = L.divIcon({
        html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: 'custom-end-marker',
        iconSize: [20, 20],
      });

      startMarkerRef.current = L.marker([startLat, startLng], { icon: startIcon })
        .addTo(mapRef.current!)
        .bindPopup('Start Point');
      
      endMarkerRef.current = L.marker([endLat, endLng], { icon: endIcon })
        .addTo(mapRef.current!)
        .bindPopup('End Point');

      // Fetch and draw route
      const fetchRoute = async () => {
        try {
          console.log('Fetching route from:', startPoint, 'to:', endPoint);
          
          const { clientApiService } = await import('@/services/client/client-api');
          const data = await clientApiService.geo.calculateRoute(startPoint, endPoint);
          
          console.log('Route API response:', data);

          if (data && data.distance > 0 && data.geometry && data.geometry.coordinates) {
            console.log('Valid route data received, drawing route');
            const route = data.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
            
            routeLayer.current = L.polyline(route, { 
              color: '#3b82f6', 
              weight: 5,
              opacity: 0.7
            }).addTo(mapRef.current!);
            
            setRouteData(data);
            
            // Fit bounds to show both markers and route
            const bounds = L.latLngBounds([[startLat, startLng], [endLat, endLng]]);
            route.forEach((coord: [number, number]) => bounds.extend(coord));
            mapRef.current!.fitBounds(bounds, { padding: [50, 50] });
          } else {
            console.warn('Invalid route data, using fallback');
            drawFallbackRoute(L, startLat, startLng, endLat, endLng);
          }
        } catch (error: any) {
          console.error('Error calculating route:', error);
          drawFallbackRoute(L, startLat, startLng, endLat, endLng);
        }
      };

      const drawFallbackRoute = (L: any, startLat: number, startLng: number, endLat: number, endLng: number) => {
        console.log('Drawing fallback route');
        const fallbackRoute = [[startLat, startLng], [endLat, endLng]];
        routeLayer.current = L.polyline(fallbackRoute, { 
          color: '#f59e0b', 
          weight: 3,
          dashArray: '5, 10',
          opacity: 0.6
        }).addTo(mapRef.current!);
        
        // Calculate actual distance for the fallback route
        const distance = L.latLng([startLat, startLng]).distanceTo(L.latLng([endLat, endLng]));
        
        const mockRouteData = {
          distance: distance,
          geometry: {
            type: "LineString",
            coordinates: [[startLng, startLat], [endLng, endLat]]
          }
        };
        
        console.log('Fallback route data:', mockRouteData);
        setRouteData(mockRouteData);
        
        // Fit bounds to markers
        mapRef.current!.fitBounds(L.latLngBounds([[startLat, startLng], [endLat, endLng]]), { padding: [50, 50] });
      };

      fetchRoute();
    };

    initializeMap();

    return () => {
      // Cleanup
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, startPoint, endPoint, setRouteData]);

  if (!isClient) {
    return (
      <div className="bg-gray-200 rounded-lg flex items-center justify-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div id="map" style={{ height: '400px' }} className="rounded-lg overflow-hidden" />;
};

export default MapComponent;