'use client';

import { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_CONFIG } from '@/lib/config/google-maps';
import { geocodeItineraryPlaces, calculateCenter, type GeocodedPlace } from '@/lib/utils/geocoding';
import { MapPin, Loader2 } from 'lucide-react';

// Declare global google namespace
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

interface ItineraryMapProps {
  days: Array<{
    title: string;
    places: Array<{
      name: string;
      desc: string;
      time: string;
    }>;
  }>;
  city: string;
  className?: string;
}

/**
 * Interactive Google Maps component showing all itinerary locations
 */
export function ItineraryMap({ days, city, className = '' }: ItineraryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const googleMapsCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocodedPlaces, setGeocodedPlaces] = useState<GeocodedPlace[]>([]);

  useEffect(() => {
    if (!GOOGLE_MAPS_CONFIG.apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadGoogleMapsScript(): Promise<void> {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        // Check if script is already being loaded
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
          // Wait for it to load
          googleMapsCheckIntervalRef.current = setInterval(() => {
            if (window.google && window.google.maps) {
              if (googleMapsCheckIntervalRef.current) {
                clearInterval(googleMapsCheckIntervalRef.current);
                googleMapsCheckIntervalRef.current = null;
              }
              resolve();
            }
          }, 100);
          return;
        }

        // Load the script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=places,geometry&v=${GOOGLE_MAPS_CONFIG.version}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
      });
    }

    async function initMap() {
      try {
        // Load Google Maps JavaScript API
        await loadGoogleMapsScript();

        if (!isMounted || !mapRef.current) return;

        // Geocode all places
        const places = await geocodeItineraryPlaces(days, city);
        
        if (!isMounted) return;
        
        setGeocodedPlaces(places);

        // Filter places that have valid locations
        const validLocations = places
          .filter((p) => p.location !== null)
          .map((p) => p.location!);

        if (validLocations.length === 0) {
          setError('Could not find locations for any places');
          setIsLoading(false);
          return;
        }

        // Calculate center
        const center = calculateCenter(validLocations);
        
        if (!center) {
          setError('Could not calculate map center');
          setIsLoading(false);
          return;
        }

        // Create map using the global google.maps API
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        googleMapRef.current = map;

        // Clear old markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Create info window for markers
        const infoWindow = new google.maps.InfoWindow();

        // Add markers for each place
        places.forEach((place, index) => {
          if (!place.location) return;

          const marker = new google.maps.Marker({
            position: place.location,
            map,
            title: place.name,
            label: {
              text: (index + 1).toString(),
              color: 'white',
              fontWeight: 'bold',
            },
            animation: google.maps.Animation.DROP,
          });

          // Add click listener to show info
          marker.addListener('click', () => {
            infoWindow.setContent(`
              <div style="padding: 8px; max-width: 200px;">
                <strong style="font-size: 14px;">${place.name}</strong>
              </div>
            `);
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit map to show all markers
        if (validLocations.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          validLocations.forEach((loc) => bounds.extend(loc));
          map.fitBounds(bounds);
          
          // Add padding so markers aren't at the edge
          google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const currentZoom = map.getZoom();
            if (currentZoom && currentZoom > 15) {
              map.setZoom(15);
            }
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        if (isMounted) {
          setError('Failed to load map');
          setIsLoading(false);
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      
      // Cleanup Google Maps check interval if still running
      if (googleMapsCheckIntervalRef.current) {
        clearInterval(googleMapsCheckIntervalRef.current);
        googleMapsCheckIntervalRef.current = null;
      }
      // Cleanup markers
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [days, city]);

  if (!GOOGLE_MAPS_CONFIG.apiKey) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">
          Map view is not available. Please configure Google Maps API key.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-8 text-center ${className}`}>
        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
            <p className="text-xs text-gray-500 mt-1">Geocoding {days.flatMap(d => d.places).length} locations</p>
          </div>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Show geocoding results summary */}
      {!isLoading && geocodedPlaces.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg text-xs">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">
              {geocodedPlaces.filter(p => p.location !== null).length}
            </span>
            {' of '}
            <span className="font-semibold text-gray-900">
              {geocodedPlaces.length}
            </span>
            {' locations found'}
          </p>
        </div>
      )}
    </div>
  );
}

