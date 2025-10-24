/**
 * Utility functions for travel information extraction
 * 
 * These are pure client-side helper functions that work with ExtractedTravelInfo.
 * They don't need to be Server Actions, so they're in a separate file.
 */

import type { ExtractedTravelInfo } from "@/lib/types/extract-travel-info-types";

/**
 * Calculate confidence score for extracted information (0-100)
 * Higher score means more required information was extracted
 */
export function calculateExtractionConfidence(extracted: ExtractedTravelInfo): number {
  let score = 0;
  
  // Required fields (most important)
  if (extracted.destination) score += 40;
  if (extracted.days) score += 30;
  if (extracted.travelers) score += 30;
  
  return score;
}

/**
 * Check if extracted information is sufficient to generate an itinerary
 */
export function hasRequiredInformation(extracted: ExtractedTravelInfo): {
  isValid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  if (!extracted.destination) missing.push("destination");
  if (!extracted.days) missing.push("trip length");
  if (!extracted.travelers) missing.push("number of travelers");
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

