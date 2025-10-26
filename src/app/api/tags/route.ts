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
      console.error('❌ API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }
    
    // Flatten and get unique tags
    const allTags = data?.flatMap(item => item.tags || []) || [];
    const uniqueTags = Array.from(new Set(allTags)).sort();
    
    return NextResponse.json({ tags: uniqueTags });
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}


