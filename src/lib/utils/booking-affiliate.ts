/**
 * Booking.com Affiliate Integration Utility
 * 
 * This module provides functions to generate deep links to Booking.com
 * with pre-filled search parameters for a seamless user experience.
 */

export interface BookingLinkParams {
  destination: string;
  checkIn?: Date;
  checkOut?: Date;
  adults: number;
  children?: number;
  childAges?: number[];
  rooms?: number;
}

export interface BookingLinks {
  hotels: string;
  apartments: string;
  hostels: string;
  resorts: string;
  all: string;
}

/**
 * Format date to YYYY-MM-DD format required by Booking.com
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Estimate number of rooms needed based on travelers
 * Assumes 2 adults per room as default
 */
function estimateRooms(adults: number, children: number = 0): number {
  // Families often need fewer rooms if children can share with parents
  if (children > 0) {
    return Math.max(1, Math.ceil(adults / 2));
  }
  return Math.max(1, Math.ceil(adults / 2));
}

/**
 * Build URL search parameters for Booking.com
 */
function buildSearchParams(
  params: BookingLinkParams,
  propertyTypeFilter?: string
): URLSearchParams {
  const searchParams = new URLSearchParams();

  // Core search parameters
  searchParams.set('ss', params.destination);
  
  // Add dates only if provided
  if (params.checkIn) {
    searchParams.set('checkin', formatDate(params.checkIn));
  }
  if (params.checkOut) {
    searchParams.set('checkout', formatDate(params.checkOut));
  }
  
  searchParams.set('group_adults', params.adults.toString());
  
  // Optional parameters
  if (params.children && params.children > 0) {
    searchParams.set('group_children', params.children.toString());
    
    // Add child ages if provided
    if (params.childAges && params.childAges.length > 0) {
      params.childAges.forEach((age) => {
        searchParams.append('age', age.toString());
      });
    }
  }

  // Room estimation
  const rooms = params.rooms || estimateRooms(params.adults, params.children);
  searchParams.set('no_rooms', rooms.toString());

  // Affiliate tracking (to be added after registration)
  const affiliateId = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID;
  if (affiliateId) {
    searchParams.set('aid', affiliateId);
  }
  
  // Custom tracking label for analytics
  searchParams.set('label', 'ai-travel-planner');

  // Property type filter
  if (propertyTypeFilter) {
    searchParams.set('nflt', propertyTypeFilter);
  }

  // Additional helpful parameters
  searchParams.set('selected_currency', 'USD');
  searchParams.set('lang', 'en-us');

  return searchParams;
}

/**
 * Generate a Booking.com search link with specified parameters
 */
export function generateBookingLink(
  params: BookingLinkParams,
  propertyTypeFilter?: string
): string {
  const baseUrl = 'https://www.booking.com/searchresults.html';
  const searchParams = buildSearchParams(params, propertyTypeFilter);
  
  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Generate multiple Booking.com links for different accommodation types
 */
export function generateBookingLinks(params: BookingLinkParams): BookingLinks {
  return {
    all: generateBookingLink(params),
    hotels: generateBookingLink(params, 'ht_id=204'), // Hotels only
    apartments: generateBookingLink(params, 'ht_id=201'), // Apartments/Homes
    hostels: generateBookingLink(params, 'ht_id=203'), // Hostels
    resorts: generateBookingLink(params, 'ht_id=206'), // Resorts
  };
}

/**
 * Validate booking parameters before generating links
 */
export function validateBookingParams(params: BookingLinkParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.destination || params.destination.trim().length === 0) {
    errors.push('Destination is required');
  }

  // Dates are optional, but if provided, must be valid
  if (params.checkIn && !(params.checkIn instanceof Date)) {
    errors.push('Check-in date must be a valid Date');
  }

  if (params.checkOut && !(params.checkOut instanceof Date)) {
    errors.push('Check-out date must be a valid Date');
  }

  if (params.checkIn && params.checkOut && params.checkIn >= params.checkOut) {
    errors.push('Check-out date must be after check-in date');
  }

  if (!params.adults || params.adults < 1) {
    errors.push('At least 1 adult is required');
  }

  if (params.adults > 30) {
    errors.push('Maximum 30 adults allowed');
  }

  if (params.children && params.children < 0) {
    errors.push('Number of children cannot be negative');
  }

  if (params.childAges && params.children && params.childAges.length !== params.children) {
    errors.push('Number of child ages must match number of children');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

