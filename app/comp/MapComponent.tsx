"use client";

import React, { useEffect, useRef, useState, memo } from 'react';
import dynamic from 'next/dynamic';
import { useMap } from 'react-leaflet';

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), {
  ssr: false,
});

interface LeafletMouseEvent {
  latlng: {
    lat: number;
    lng: number;
  };
}

interface MapComponentProps {
  mapCenter: [number, number];
  userLocation: string;
  destination: string;
  setLocation: (loc: string, isUserLocation: boolean) => void;
  L: any;
  selectedRide: { routeGeometry: string } | null; // Add selectedRide prop for route
  joinLocation: string | null; // Add joinLocation prop
}

const MapComponent: React.FC<MapComponentProps> = memo(
  ({ mapCenter, userLocation, destination, setLocation, L, selectedRide, joinLocation }) => {
    const [isSettingLocation, setIsSettingLocation] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const isInitializedRef = useRef(false);

    useEffect(() => {
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        isInitializedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (L && !isMounted) {
        setIsMounted(true);
      }
    }, [L, isMounted]);

    const MapClickHandler: React.FC = () => {
      const map = useMap();
      useEffect(() => {
        if (!L) return;

        const clickHandler = (e: LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          if (isSettingLocation) {
            setLocation(`${lat},${lng}`, true);
            setIsSettingLocation(false);
          } else {
            setLocation(`${lat},${lng}`, false);
            setIsSettingLocation(true);
          }
        };
        map.on('click', clickHandler);
        return () => {
          map.off('click', clickHandler);
        };
      }, [map, isSettingLocation, L]);
      return null;
    };

    // Parse route geometry and fit map bounds when a ride is selected
    useEffect(() => {
      if (!L || !mapRef.current || !selectedRide || !selectedRide.routeGeometry) return;

      try {
        const routeData = JSON.parse(selectedRide.routeGeometry);
        if (routeData.type === "LineString" && routeData.coordinates) {
          const coordinates = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          const bounds = L.latLngBounds(coordinates);
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error("Error parsing route geometry:", error);
      }
    }, [selectedRide, L]);

    if (!L || !isMounted) {
      return <div>Loading map...</div>;
    }

    if (isInitializedRef.current) {
      return null;
    }

    isInitializedRef.current = true;

    // Parse route geometry for Polyline
    let routePositions: [number, number][] = [];
    if (selectedRide && selectedRide.routeGeometry) {
      try {
        const routeData = JSON.parse(selectedRide.routeGeometry);
        if (routeData.type === "LineString" && routeData.coordinates) {
          routePositions = routeData.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
        }
      } catch (error) {
        console.error("Error parsing route geometry:", error);
      }
    }

    return (
      <div ref={mapContainerRef}>
        <div id={`map-${Math.random().toString(36).substring(2, 9)}`}>
          <MapContainer
            center={mapCenter}
            zoom={8}
            style={{ height: '400px', width: '100%' }}
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {userLocation && (
              <Marker position={userLocation.split(',').map(Number) as [number, number]}>
                <Popup>Your Location</Popup>
              </Marker>
            )}
            {destination && (
              <Marker position={destination.split(',').map(Number) as [number, number]}>
                <Popup>Destination</Popup>
              </Marker>
            )}
            {joinLocation && (
              <Marker position={joinLocation.split(',').map(Number) as [number, number]} icon={L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
                shadowSize: [41, 41],
              })}>
                <Popup>Join Location</Popup>
              </Marker>
            )}
            {routePositions.length > 0 && (
              <Polyline positions={routePositions} color="#3b9ddd" weight={5} />
            )}
            <MapClickHandler />
          </MapContainer>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.mapCenter[0] === nextProps.mapCenter[0] &&
      prevProps.mapCenter[1] === nextProps.mapCenter[1] &&
      prevProps.userLocation === nextProps.userLocation &&
      prevProps.destination === nextProps.destination &&
      prevProps.L === nextProps.L &&
      prevProps.setLocation === nextProps.setLocation &&
      prevProps.selectedRide === nextProps.selectedRide &&
      prevProps.joinLocation === nextProps.joinLocation
    );
  }
);

export default MapComponent;