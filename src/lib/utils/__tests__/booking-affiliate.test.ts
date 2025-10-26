/**
 * Tests for Booking.com Affiliate Utility
 */

import { 
  generateBookingLink, 
  generateBookingLinks, 
  validateBookingParams,
  type BookingLinkParams 
} from '../booking-affiliate';

describe('booking-affiliate', () => {
  const mockParams: BookingLinkParams = {
    destination: 'Paris, France',
    checkIn: new Date('2025-06-01'),
    checkOut: new Date('2025-06-07'),
    adults: 2,
    children: 1,
    childAges: [8],
  };

  describe('generateBookingLink', () => {
    it('should generate a valid booking.com link', () => {
      const link = generateBookingLink(mockParams);
      
      expect(link).toContain('https://www.booking.com/searchresults.html');
      expect(link).toContain('ss=Paris%2C+France');
      expect(link).toContain('checkin=2025-06-01');
      expect(link).toContain('checkout=2025-06-07');
      expect(link).toContain('group_adults=2');
      expect(link).toContain('group_children=1');
      expect(link).toContain('age=8');
    });

    it('should include property type filter when provided', () => {
      const link = generateBookingLink(mockParams, 'ht_id=204');
      
      expect(link).toContain('nflt=ht_id%3D204');
    });

    it('should handle trips without children', () => {
      const paramsWithoutChildren: BookingLinkParams = {
        destination: 'Tokyo, Japan',
        checkIn: new Date('2025-07-15'),
        checkOut: new Date('2025-07-20'),
        adults: 1,
      };

      const link = generateBookingLink(paramsWithoutChildren);
      
      expect(link).toContain('group_adults=1');
      expect(link).not.toContain('group_children');
    });

    it('should estimate rooms correctly', () => {
      const link = generateBookingLink(mockParams);
      
      // 2 adults + 1 child should estimate 1 room
      expect(link).toContain('no_rooms=1');
    });

    it('should handle multiple adults', () => {
      const largeGroupParams: BookingLinkParams = {
        destination: 'Barcelona, Spain',
        checkIn: new Date('2025-08-01'),
        checkOut: new Date('2025-08-05'),
        adults: 6,
      };

      const link = generateBookingLink(largeGroupParams);
      
      // 6 adults should estimate 3 rooms
      expect(link).toContain('no_rooms=3');
    });
  });

  describe('generateBookingLinks', () => {
    it('should generate links for all accommodation types', () => {
      const links = generateBookingLinks(mockParams);
      
      expect(links).toHaveProperty('all');
      expect(links).toHaveProperty('hotels');
      expect(links).toHaveProperty('apartments');
      expect(links).toHaveProperty('hostels');
      expect(links).toHaveProperty('resorts');
      
      expect(links.all).toContain('booking.com');
      expect(links.hotels).toContain('ht_id=204');
      expect(links.apartments).toContain('ht_id=201');
      expect(links.hostels).toContain('ht_id=203');
      expect(links.resorts).toContain('ht_id=206');
    });
  });

  describe('validateBookingParams', () => {
    it('should validate correct parameters', () => {
      const result = validateBookingParams(mockParams);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing destination', () => {
      const invalidParams = { ...mockParams, destination: '' };
      const result = validateBookingParams(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Destination is required');
    });

    it('should reject checkout before checkin', () => {
      const invalidParams: BookingLinkParams = {
        ...mockParams,
        checkIn: new Date('2025-06-10'),
        checkOut: new Date('2025-06-05'),
      };
      const result = validateBookingParams(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Check-out date must be after check-in date');
    });

    it('should reject zero adults', () => {
      const invalidParams = { ...mockParams, adults: 0 };
      const result = validateBookingParams(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 1 adult is required');
    });

    it('should reject too many adults', () => {
      const invalidParams = { ...mockParams, adults: 35 };
      const result = validateBookingParams(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 30 adults allowed');
    });

    it('should reject mismatched child ages', () => {
      const invalidParams: BookingLinkParams = {
        ...mockParams,
        children: 2,
        childAges: [8], // Only 1 age for 2 children
      };
      const result = validateBookingParams(invalidParams);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Number of child ages must match number of children');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in destination', () => {
      const specialParams: BookingLinkParams = {
        destination: 'São Paulo, Brazil',
        checkIn: new Date('2025-09-01'),
        checkOut: new Date('2025-09-05'),
        adults: 2,
      };

      const link = generateBookingLink(specialParams);
      
      expect(link).toContain('booking.com');
      // URL encoding should handle special characters
      expect(link).toContain('S%C3%A3o+Paulo');
    });

    it('should handle same-day stays', () => {
      const sameDayParams: BookingLinkParams = {
        destination: 'London, UK',
        checkIn: new Date('2025-10-01'),
        checkOut: new Date('2025-10-01'),
        adults: 1,
      };

      const validation = validateBookingParams(sameDayParams);
      
      // Same day checkout should be invalid (checkout must be after checkin)
      expect(validation.isValid).toBe(false);
    });

    it('should handle long stays', () => {
      const longStayParams: BookingLinkParams = {
        destination: 'Bali, Indonesia',
        checkIn: new Date('2025-11-01'),
        checkOut: new Date('2025-12-01'), // 30 days
        adults: 2,
      };

      const link = generateBookingLink(longStayParams);
      
      expect(link).toContain('checkin=2025-11-01');
      expect(link).toContain('checkout=2025-12-01');
    });
  });
});

