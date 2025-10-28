/**
 * Geocoding Utilities
 * 
 * Convert place names to coordinates using Google Maps Geocoding API
 */

import { GOOGLE_MAPS_CONFIG } from '@/lib/config/google-maps';

export interface Location {
  lat: number;
  lng: number;
}

export interface GeocodedPlace {
  name: string;
  location: Location | null;
  formattedAddress?: string;
}

/**
 * Geocode a place name to coordinates
 */
export async function geocodePlace(
  placeName: string,
  city: string
): Promise<Location | null> {
  if (!GOOGLE_MAPS_CONFIG.apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    // Combine place name with city for better accuracy
    const query = `${placeName}, ${city}`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&key=${GOOGLE_MAPS_CONFIG.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }

    console.warn(`Geocoding failed for "${query}":`, data.status);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Geocode multiple places from an itinerary
 */
export async function geocodeItineraryPlaces(
  days: Array<{
    title: string;
    places: Array<{ name: string; desc: string; time: string }>;
  }>,
  city: string
): Promise<GeocodedPlace[]> {
  const allPlaces = days.flatMap((day) =>
    day.places.map((place) => place.name)
  );

  const geocodedPlaces: GeocodedPlace[] = [];

  // Geocode each place (with a small delay to avoid rate limiting)
  for (const placeName of allPlaces) {
    const location = await geocodePlace(placeName, city);
    geocodedPlaces.push({
      name: placeName,
      location,
    });

    // Small delay to avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return geocodedPlaces;
}

/**
 * Calculate the center point of multiple locations
 */
export function calculateCenter(locations: Location[]): Location | null {
  if (locations.length === 0) return null;

  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length,
  };
}



