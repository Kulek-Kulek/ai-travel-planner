import React from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Itinerary } from '@/lib/actions/itinerary-actions';

/**
 * Generate and download a PDF for an itinerary
 * @param itinerary - The itinerary data
 * @param filename - Optional custom filename (without extension)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function generateAndDownloadPDF(
  itinerary: Itinerary,
  filename?: string
): Promise<boolean> {
  try {
    // Dynamically import the PDF document component (code splitting)
    const { ItineraryPDFDocument } = await import('@/components/pdf/itinerary-pdf-document');
    
    // Create the PDF document
    const doc = <ItineraryPDFDocument itinerary={itinerary} />;
    
    // Generate the PDF blob
    const blob = await pdf(doc).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const cityName = itinerary.ai_plan.city || itinerary.destination;
    const sanitizedName = cityName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const defaultFilename = `${sanitizedName}-itinerary`;
    link.download = `${filename || defaultFilename}.pdf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Generate a PDF blob without downloading (for preview or server upload)
 * @param itinerary - The itinerary data
 * @returns Promise<Blob | null> - The PDF blob or null if failed
 */
export async function generatePDFBlob(
  itinerary: Itinerary
): Promise<Blob | null> {
  try {
    const { ItineraryPDFDocument } = await import('@/components/pdf/itinerary-pdf-document');
    const doc = <ItineraryPDFDocument itinerary={itinerary} />;
    const blob = await pdf(doc).toBlob();
    return blob;
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    return null;
  }
}

/**
 * Get suggested filename for an itinerary PDF
 * @param itinerary - The itinerary data
 * @returns string - Suggested filename (without extension)
 */
export function getItineraryPDFFilename(itinerary: Itinerary): string {
  const cityName = itinerary.ai_plan.city || itinerary.destination;
  const sanitizedName = cityName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  // Add date if available
  if (itinerary.start_date) {
    const date = new Date(itinerary.start_date);
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const year = date.getFullYear();
    return `${sanitizedName}-${month}-${year}-itinerary`;
  }
  
  return `${sanitizedName}-itinerary`;
}

