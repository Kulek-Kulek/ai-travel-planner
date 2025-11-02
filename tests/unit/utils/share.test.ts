/**
 * Unit tests for share utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareItinerary, getItineraryShareUrl } from '@/lib/utils/share';

describe('shareItinerary', () => {
  beforeEach(() => {
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use native share API when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: mockCanShare,
      writable: true,
    });

    const result = await shareItinerary({
      id: 'test-123',
      title: 'Paris Trip',
      description: 'Amazing trip to Paris',
    });

    expect(result).toEqual({ success: true, method: 'native' });
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Paris Trip - Travel Itinerary',
      text: 'Amazing trip to Paris',
      url: 'http://localhost:3000/itinerary/test-123',
    });
  });

  it('should fallback to clipboard when native share fails', async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error('Share failed'));
    const mockWriteText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });

    const result = await shareItinerary({
      id: 'test-123',
      title: 'Paris Trip',
    });

    expect(result).toEqual({ success: true, method: 'clipboard' });
    expect(mockWriteText).toHaveBeenCalledWith(
      'http://localhost:3000/itinerary/test-123'
    );
  });

  it('should return false when user cancels native share', async () => {
    const mockShare = vi.fn().mockRejectedValue(
      Object.assign(new Error('Cancelled'), { name: 'AbortError' })
    );

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      writable: true,
    });

    const result = await shareItinerary({
      id: 'test-123',
      title: 'Paris Trip',
    });

    expect(result).toEqual({ success: false, method: 'none' });
  });

  it('should use default description when not provided', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: () => true,
      writable: true,
    });

    await shareItinerary({
      id: 'test-123',
      title: 'Paris Trip',
    });

    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Check out this amazing Paris Trip travel itinerary!',
      })
    );
  });

  it('should handle when clipboard write fails', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
    
    // Remove native share
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
    });

    // Mock document methods for legacy fallback
    const mockExecCommand = vi.fn().mockReturnValue(false);
    const mockRemoveChild = vi.fn();
    const mockAppendChild = vi.fn();

    document.execCommand = mockExecCommand;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    const result = await shareItinerary({
      id: 'test-123',
      title: 'Paris Trip',
    });

    expect(result).toEqual({ success: false, method: 'none' });
  });
});

describe('getItineraryShareUrl', () => {
  it('should generate correct URL', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });

    const url = getItineraryShareUrl('test-123');

    expect(url).toBe('http://localhost:3000/itinerary/test-123');
  });

  it('should handle different origins', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://myapp.com' },
      writable: true,
    });

    const url = getItineraryShareUrl('abc-456');

    expect(url).toBe('https://myapp.com/itinerary/abc-456');
  });
});

