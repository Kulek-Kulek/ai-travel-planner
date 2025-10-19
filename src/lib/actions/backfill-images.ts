'use server';

import { createClient } from '@/lib/supabase/server';
import { fetchDestinationPhoto } from '@/lib/pexels/client';

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Backfill images for existing itineraries that don't have them
 * This is useful for adding images to itineraries created before the image feature
 */
export async function backfillItineraryImages(): Promise<ActionResult<{
  processed: number;
  updated: number;
  failed: number;
}>> {
  try {
    const supabase = await createClient();
    
    // Get all itineraries without images
    const { data: itineraries, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, destination, notes')
      .is('image_url', null)
      .order('created_at', { ascending: false })
      .limit(100); // Process in batches to avoid timeout
    
    if (fetchError) {
      console.error('Error fetching itineraries:', fetchError);
      return { success: false, error: 'Failed to fetch itineraries' };
    }
    
    if (!itineraries || itineraries.length === 0) {
      return { 
        success: true, 
        data: { processed: 0, updated: 0, failed: 0 } 
      };
    }
    
    let updated = 0;
    let failed = 0;
    
    console.log(`Processing ${itineraries.length} itineraries...`);
    
    // Process each itinerary
    for (const itinerary of itineraries) {
      try {
        // Fetch photo for this destination
        const photo = await fetchDestinationPhoto(
          itinerary.destination,
          itinerary.notes || undefined
        );
        
        if (photo) {
          // Update itinerary with image data
          const { error: updateError } = await supabase
            .from('itineraries')
            .update({
              image_url: photo.url,
              image_photographer: photo.photographer,
              image_photographer_url: photo.photographerUrl,
            })
            .eq('id', itinerary.id);
          
          if (updateError) {
            console.error(`Failed to update itinerary ${itinerary.id}:`, updateError);
            failed++;
          } else {
            console.log(`✓ Updated ${itinerary.destination} (${itinerary.id})`);
            updated++;
          }
        } else {
          console.warn(`No photo found for ${itinerary.destination}`);
          failed++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing itinerary ${itinerary.id}:`, error);
        failed++;
      }
    }
    
    console.log(`\nBackfill complete:`);
    console.log(`- Processed: ${itineraries.length}`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Failed: ${failed}`);
    
    return {
      success: true,
      data: {
        processed: itineraries.length,
        updated,
        failed,
      }
    };
    
  } catch (error) {
    console.error('Error in backfillItineraryImages:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get count of itineraries without images
 */
export async function getItinerariesWithoutImagesCount(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();
    
    const { count, error } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .is('image_url', null);
    
    if (error) {
      console.error('Error counting itineraries:', error);
      return { success: false, error: 'Failed to count itineraries' };
    }
    
    return { success: true, data: count || 0 };
  } catch (error) {
    console.error('Error in getItinerariesWithoutImagesCount:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

