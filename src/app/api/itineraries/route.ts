import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tags = searchParams.get('tags');
    const destination = searchParams.get('destination');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const random = searchParams.get('random') === 'true';
    
    const supabase = await createClient();
    
    // When using random ordering without filters, get unique by destination
    if (random && !tags && !destination) {
      // Fetch more than needed to ensure we have enough after deduplication
      const fetchLimit = limit * 3;
      
      // Use raw query for random ordering with PostgreSQL
      const { data: allData, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('is_private', false)
        .eq('status', 'published')
        .limit(fetchLimit);
      
      if (error) {
        console.error('❌ API: Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch itineraries' },
          { status: 500 }
        );
      }
      
      if (!allData || allData.length === 0) {
        return NextResponse.json(
          { itineraries: [], total: 0 },
          { status: 200 }
        );
      }
      
      // Shuffle the array for randomization
      const shuffled = allData.sort(() => Math.random() - 0.5);
      
      // Deduplicate by destination (keep first occurrence of each destination)
      const seenDestinations = new Set<string>();
      const uniqueData = shuffled.filter(item => {
        const normalizedDestination = item.destination.toLowerCase().trim();
        if (seenDestinations.has(normalizedDestination)) {
          return false;
        }
        seenDestinations.add(normalizedDestination);
        return true;
      });
      
      // Take only the requested limit
      const data = uniqueData.slice(0, limit);
      
      // Continue with profile fetching for the filtered data
      const userIds = [...new Set(
        data
          .map((i) => i.user_id)
          .filter((id): id is string => id !== null)
      )];
      
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          
          if (profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
              if (profile.full_name && profile.full_name.trim()) {
                acc[profile.id] = profile.full_name;
              } else if (profile.email) {
                acc[profile.id] = profile.email.split('@')[0];
              } else {
                acc[profile.id] = 'Anonymous';
              }
              return acc;
            }, {} as Record<string, string>);
          }
        } catch (err) {
          console.warn('Failed to fetch profiles:', err);
        }
      }
      
      const itinerariesWithNames = data.map((itinerary) => ({
        id: itinerary.id,
        destination: itinerary.destination,
        days: itinerary.days,
        travelers: itinerary.travelers,
        start_date: itinerary.start_date,
        end_date: itinerary.end_date,
        children: itinerary.children,
        child_ages: itinerary.child_ages,
        has_accessibility_needs: itinerary.has_accessibility_needs,
        notes: itinerary.notes,
        ai_plan: itinerary.ai_plan,
        tags: itinerary.tags,
        is_private: itinerary.is_private,
        status: itinerary.status,
        user_id: itinerary.user_id,
        created_at: itinerary.created_at,
        updated_at: itinerary.updated_at,
        image_url: itinerary.image_url,
        likes: itinerary.likes,
        creator_name: itinerary.user_id ? profilesMap[itinerary.user_id] || null : null,
      }));
      
      return NextResponse.json({
        itineraries: itinerariesWithNames,
        total: data.length,
      });
    }
    
    // Standard query with filters or non-random ordering
    let query = supabase
      .from('itineraries')
      .select('*', { count: 'exact' })
      .eq('is_private', false)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    
    // Filter by tags if provided
    if (tags) {
      const tagArray = tags.split(',').filter(t => t.trim());
      if (tagArray.length > 0) {
        query = query.contains('tags', tagArray);
      }
    }
    
    // Filter by destination if provided
    if (destination && destination.trim()) {
      query = query.ilike('destination', `%${destination.trim()}%`);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch itineraries' },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { itineraries: [], total: 0 },
        { status: 200 }
      );
    }
    
    // Get unique user IDs
    const userIds = [...new Set(
      data
        .map((i) => i.user_id)
        .filter((id): id is string => id !== null)
    )];
    
    // Fetch profiles
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            // Use full_name if available, otherwise use first part of email, or 'Anonymous'
            if (profile.full_name && profile.full_name.trim()) {
              acc[profile.id] = profile.full_name;
            } else if (profile.email) {
              // Extract first part of email before @ as fallback
              acc[profile.id] = profile.email.split('@')[0];
            } else {
              acc[profile.id] = 'Anonymous';
            }
            return acc;
          }, {} as Record<string, string>);
        }
      } catch (err) {
        console.warn('Failed to fetch profiles:', err);
      }
    }
    
    // Map creator names
    const itinerariesWithNames = data.map((itinerary) => ({
      id: itinerary.id,
      destination: itinerary.destination,
      days: itinerary.days,
      travelers: itinerary.travelers,
      start_date: itinerary.start_date,
      end_date: itinerary.end_date,
      children: itinerary.children,
      child_ages: itinerary.child_ages,
      has_accessibility_needs: itinerary.has_accessibility_needs,
      notes: itinerary.notes,
      ai_plan: itinerary.ai_plan,
      tags: itinerary.tags,
      is_private: itinerary.is_private,
      status: itinerary.status,
      user_id: itinerary.user_id,
      created_at: itinerary.created_at,
      updated_at: itinerary.updated_at,
      image_url: itinerary.image_url,
      likes: itinerary.likes,
      creator_name: itinerary.user_id ? profilesMap[itinerary.user_id] || null : null,
    }));
    
    return NextResponse.json({
      itineraries: itinerariesWithNames,
      total: count || 0,
    });
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

