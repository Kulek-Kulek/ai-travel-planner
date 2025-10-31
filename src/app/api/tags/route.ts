import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('tags')
      .eq('is_private', false)
      .eq('status', 'published');
    
    if (error) {
      console.error('❌ API Tags: Database error:', error);
      console.error('❌ API Tags: Error details:', JSON.stringify(error, null, 2));
      // Still return empty tags instead of error - graceful degradation
      return NextResponse.json({ tags: [] });
    }
    
    // Handle case where no itineraries exist yet
    if (!data || data.length === 0) {
      return NextResponse.json({ tags: [] });
    }
    
    // Flatten and get unique tags
    const allTags = data.flatMap(item => item.tags || []).filter(Boolean);
    const uniqueTags = Array.from(new Set(allTags)).sort();
    
    return NextResponse.json({ tags: uniqueTags });
  } catch (error) {
    console.error('❌ API Tags: Unexpected error:', error);
    if (error instanceof Error) {
      console.error('❌ API Tags: Error message:', error.message);
      console.error('❌ API Tags: Error stack:', error.stack);
    }
    // Return empty tags instead of error - graceful degradation
    return NextResponse.json({ tags: [] });
  }
}


