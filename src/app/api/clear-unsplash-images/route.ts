import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Clear all Unsplash image URLs from database
 * This will allow the backfill tool to replace them with Pexels images
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Clear all Unsplash image URLs
    const { data, error } = await supabase
      .from('itineraries')
      .update({
        image_url: null,
        image_photographer: null,
        image_photographer_url: null,
      })
      .like('image_url', '%unsplash.com%')
      .select('id');
    
    if (error) {
      console.error('Error clearing Unsplash images:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to clear images',
      });
    }
    
    return NextResponse.json({
      success: true,
      cleared: data?.length || 0,
      message: `Cleared ${data?.length || 0} Unsplash images. Now run the backfill tool.`,
    });
  } catch (error) {
    console.error('Error in clear-unsplash-images:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred',
    });
  }
}

