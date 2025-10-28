/**
 * Google Maps Configuration
 * 
 * This file centralizes Google Maps API configuration.
 * Make sure to set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.
 */

export const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
};

export function isGoogleMapsEnabled(): boolean {
  return !!GOOGLE_MAPS_CONFIG.apiKey;
}

