'use client';

import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoogleMapsButtonProps {
  places: Array<{
    name: string;
    desc: string;
    time: string;
  }>;
  destination: string;
  className?: string;
}

/**
 * Simple button that opens Google Maps in a new tab with all the itinerary locations
 * This doesn't require an API key and works immediately
 */
export function GoogleMapsButton({
  places,
  destination,
  className,
}: GoogleMapsButtonProps) {
  const handleOpenGoogleMaps = () => {
    // Extract all place names
    const locations = places.map((place) => place.name);

    // Create Google Maps directions URL
    // Format: https://www.google.com/maps/dir/Place1/Place2/Place3
    const baseUrl = 'https://www.google.com/maps/dir/';
    
    // Add destination as the starting context, then all places
    const allLocations = [destination, ...locations];
    const mapsUrl = baseUrl + allLocations.map((loc) => encodeURIComponent(loc)).join('/');

    // Open in new tab
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      onClick={handleOpenGoogleMaps}
      variant="outline"
      className={className}
    >
      <MapPin className="w-4 h-4 mr-2" />
      Open in Google Maps
    </Button>
  );
}




