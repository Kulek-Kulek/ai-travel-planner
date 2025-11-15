/**
 * Integration tests for itinerary actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Itinerary } from '@/lib/actions/itinerary-actions';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { createClient } from '@/lib/supabase/server';

describe('Itinerary Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('getPublicItineraries', () => {
    it('should fetch public itineraries successfully', async () => {
      const mockItineraries: Partial<Itinerary>[] = [
        {
          id: '1',
          destination: 'Paris',
          days: 5,
          travelers: 2,
          is_private: false,
          status: 'published',
          tags: ['culture', 'food'],
        },
        {
          id: '2',
          destination: 'Tokyo',
          days: 7,
          travelers: 1,
          is_private: false,
          status: 'published',
          tags: ['adventure'],
        },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockItineraries,
          error: null,
          count: 2,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getPublicItineraries } = await import('@/lib/actions/itinerary-actions');
      const result = await getPublicItineraries({ limit: 10, offset: 0 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.itineraries).toHaveLength(2);
        expect(result.data.total).toBe(2);
      }
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getPublicItineraries } = await import('@/lib/actions/itinerary-actions');
      const result = await getPublicItineraries();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to fetch itineraries');
      }
    });

    it('should filter by tags correctly', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getPublicItineraries } = await import('@/lib/actions/itinerary-actions');
      await getPublicItineraries({ tags: ['culture', 'food'] });

      expect(mockQuery.contains).toHaveBeenCalledWith('tags', ['culture', 'food']);
    });

    it('should filter by destination correctly', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getPublicItineraries } = await import('@/lib/actions/itinerary-actions');
      await getPublicItineraries({ destination: 'Paris' });

      expect(mockQuery.ilike).toHaveBeenCalledWith('destination', '%Paris%');
    });
  });
});

