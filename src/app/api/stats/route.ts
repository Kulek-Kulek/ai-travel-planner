import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get total count of public itineraries
    const { count: totalItineraries, error: countError } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', false)
      .eq('status', 'published');
    
    if (countError) {
      console.error('❌ API Stats: Error fetching total count:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }
    
    // Get unique destinations count
    const { data: destinations, error: destinationsError } = await supabase
      .from('itineraries')
      .select('destination')
      .eq('is_private', false)
      .eq('status', 'published');
    
    if (destinationsError) {
      console.error('❌ API Stats: Error fetching destinations:', destinationsError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }
    
    // Calculate unique destinations (case-insensitive)
    const uniqueDestinations = new Set(
      destinations?.map(d => d.destination.toLowerCase().trim()) || []
    );
    
    return NextResponse.json({
      totalItineraries: totalItineraries || 0,
      uniqueDestinations: uniqueDestinations.size,
    });
  } catch (error) {
    console.error('❌ API Stats: Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}










