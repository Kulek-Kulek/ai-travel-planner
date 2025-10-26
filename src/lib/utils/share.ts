/**
 * Share utility for sharing itineraries
 */

export interface ShareItineraryParams {
  id: string;
  title: string;
  description?: string;
}

/**
 * Share an itinerary using the Web Share API or fallback to clipboard
 * @returns Promise<boolean> - true if shared successfully, false otherwise
 */
export async function shareItinerary({
  id,
  title,
  description,
}: ShareItineraryParams): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'none' }> {
  // Build the full URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const url = `${baseUrl}/itinerary/${id}`;
  
  // Prepare share data
  const shareData = {
    title: `${title} - Travel Itinerary`,
    text: description || `Check out this amazing ${title} travel itinerary!`,
    url,
  };

  // Try Web Share API first (mobile and modern browsers)
  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name === 'AbortError') {
        // User cancelled, not an error
        return { success: false, method: 'none' };
      }
      // Fall through to clipboard method
      console.error('Web Share API failed:', err);
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return { success: true, method: 'clipboard' };
  } catch (err) {
    console.error('Clipboard write failed:', err);
    
    // Last resort: Select and copy using legacy method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return { success: true, method: 'clipboard' };
      }
    } catch (legacyErr) {
      console.error('Legacy copy failed:', legacyErr);
    }
  }

  return { success: false, method: 'none' };
}

/**
 * Get a shareable URL for an itinerary
 */
export function getItineraryShareUrl(id: string): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `${baseUrl}/itinerary/${id}`;
}

