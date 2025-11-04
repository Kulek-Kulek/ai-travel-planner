/**
 * Unit tests for geocoding utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocodePlace, calculateCenter, type Location } from '@/lib/utils/geocoding';

// Mock the Google Maps config
vi.mock('@/lib/config/google-maps', () => ({
  GOOGLE_MAPS_CONFIG: {
    apiKey: 'test-api-key',
  },
}));

describe('geocodePlace', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return coordinates for a valid place', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        {
          geometry: {
            location: {
              lat: 48.8566,
              lng: 2.3522,
            },
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await geocodePlace('Eiffel Tower', 'Paris');

    expect(result).toEqual({
      lat: 48.8566,
      lng: 2.3522,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('maps.googleapis.com/maps/api/geocode/json')
    );
  });

  it('should return null if geocoding fails', async () => {
    const mockResponse = {
      status: 'ZERO_RESULTS',
      results: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await geocodePlace('Invalid Place', 'Unknown City');

    expect(result).toBeNull();
  });

  it('should return null if fetch throws an error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await geocodePlace('Eiffel Tower', 'Paris');

    expect(result).toBeNull();
  });

  it('should properly encode special characters in place names', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        {
          geometry: {
            location: { lat: 40.7128, lng: -74.006 },
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    await geocodePlace('Café & Restaurant', 'New York');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Café & Restaurant, New York'))
    );
  });
});

describe('calculateCenter', () => {
  it('should calculate center point of multiple locations', () => {
    const locations: Location[] = [
      { lat: 48.8566, lng: 2.3522 }, // Paris
      { lat: 51.5074, lng: -0.1278 }, // London
      { lat: 52.52, lng: 13.405 }, // Berlin
    ];

    const center = calculateCenter(locations);

    expect(center).not.toBeNull();
    expect(center!.lat).toBeCloseTo(50.9613, 2);
    expect(center!.lng).toBeCloseTo(5.2098, 2);
  });

  it('should return null for empty array', () => {
    const result = calculateCenter([]);

    expect(result).toBeNull();
  });

  it('should return the same location for single item', () => {
    const locations: Location[] = [{ lat: 48.8566, lng: 2.3522 }];

    const center = calculateCenter(locations);

    expect(center).toEqual({ lat: 48.8566, lng: 2.3522 });
  });

  it('should handle negative coordinates', () => {
    const locations: Location[] = [
      { lat: -33.8688, lng: 151.2093 }, // Sydney
      { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    ];

    const center = calculateCenter(locations);

    expect(center).not.toBeNull();
    expect(center!.lat).toBeCloseTo(-34.2362, 2);
    expect(center!.lng).toBeCloseTo(46.4138, 2);
  });
});

