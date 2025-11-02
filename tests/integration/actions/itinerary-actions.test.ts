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

  describe('getItinerary', () => {
    it('should fetch a single itinerary by ID', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const mockItinerary: Partial<Itinerary> = {
        id: '1',
        destination: 'Paris',
        days: 5,
        travelers: 2,
        ai_plan: {
          city: 'Paris',
          days: [
            {
              title: 'Day 1',
              places: [
                {
                  name: 'Eiffel Tower',
                  desc: 'Iconic landmark',
                  time: '09:00',
                },
              ],
            },
          ],
        },
        tags: ['culture'],
        is_private: false,
      };

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockItinerary,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getItinerary } = await import('@/lib/actions/itinerary-actions');
      const result = await getItinerary('1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('1');
        expect(result.data.destination).toBe('Paris');
      }
    });

    it('should return error for non-existent itinerary', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const { getItinerary } = await import('@/lib/actions/itinerary-actions');
      const result = await getItinerary('non-existent');

      expect(result.success).toBe(false);
    });
  });

  describe('deleteItinerary', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { deleteItinerary } = await import('@/lib/actions/itinerary-actions');
      const result = await deleteItinerary('1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should delete itinerary when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockEq2 = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq1,
        }),
      });

      const { deleteItinerary } = await import('@/lib/actions/itinerary-actions');
      const result = await deleteItinerary('1');

      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockEq2 = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const mockEq1 = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockEq1,
        }),
      });

      const { deleteItinerary } = await import('@/lib/actions/itinerary-actions');
      const result = await deleteItinerary('1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to delete itinerary');
      }
    });
  });
});

