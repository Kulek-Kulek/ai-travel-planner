'use server';

import { createClient } from '@/lib/supabase/server';

// AI Plan structure
export type AIPlan = {
  city: string;
  days: Array<{
    title: string;
    places: Array<{
      name: string;
      desc: string;
      time: string;
    }>;
  }>;
};

// Itinerary from database
export type Itinerary = {
  id: string;
  user_id: string | null;
  creator_name?: string | null; // User's display name from profiles
  destination: string;
  days: number;
  travelers: number;
  start_date?: string | null;
  end_date?: string | null;
  children?: number;
  child_ages?: number[];
  has_accessibility_needs?: boolean;
  notes: string | null;
  ai_plan: {
    city: string;
    days: Array<{
      title: string;
      places: Array<{
        name: string;
        desc: string;
        time: string;
      }>;
    }>;
  };
  tags: string[];
  is_private: boolean;
  status?: string; // 'draft' or 'published'
  image_url?: string | null;
  image_photographer?: string | null;
  image_photographer_url?: string | null;
  created_at: string;
};

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Fetch public itineraries with optional tag filtering
 */
export async function getPublicItineraries(
  options: {
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<ActionResult<{ itineraries: Itinerary[]; total: number }>> {
  try {
    const { tags = [], limit = 20, offset = 0 } = options;
    const supabase = await createClient();
    
    // Fetch itineraries first, then join with profiles separately
    let query = supabase
      .from('itineraries')
      .select('*', { count: 'exact' })
      .eq('is_private', false)
      .eq('status', 'published') // Only show published itineraries (not drafts)
      .order('created_at', { ascending: false });
    
    // Filter by tags if provided
    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching itineraries:', error);
      return { 
        success: false, 
        error: 'Failed to fetch itineraries' 
      };
    }
    
    // For each itinerary with a user_id, fetch the creator's name
    const itinerariesWithNames = await Promise.all(
      (data || []).map(async (itinerary: Itinerary) => {
        if (!itinerary.user_id) {
          return { ...itinerary, creator_name: null };
        }
        
        // Fetch profile for this user
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', itinerary.user_id)
          .single();
        
        return {
          ...itinerary,
          creator_name: profile?.full_name || null,
        };
      })
    );
    
    return {
      success: true,
      data: {
        itineraries: itinerariesWithNames,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getPublicItineraries:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

/**
 * Claim and publish a draft itinerary after user signs in
 * Updates the user_id and changes status from draft to published
 */
export async function claimDraftItinerary(itineraryId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to claim this itinerary',
      };
    }
    
    // Update the itinerary to published and assign to user
    const { error } = await supabase
      .from('itineraries')
      .update({
        user_id: user.id,
        status: 'published',
      })
      .eq('id', itineraryId)
      .eq('status', 'draft'); // Only update if it's still a draft
    
    if (error) {
      console.error('Error claiming draft itinerary:', error);
      return {
        success: false,
        error: 'Failed to save itinerary',
      };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in claimDraftItinerary:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get all unique tags from public itineraries for filter UI
 */
export async function getAllTags(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('tags')
      .eq('is_private', false);
    
    if (error) {
      console.error('Error fetching tags:', error);
      return { success: false, error: 'Failed to fetch tags' };
    }
    
    // Flatten and get unique tags
    const allTags = data?.flatMap(item => item.tags || []) || [];
    const uniqueTags = Array.from(new Set(allTags)).sort();
    
    return { success: true, data: uniqueTags };
  } catch (error) {
    console.error('Error in getAllTags:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get user's own itineraries (requires authentication)
 */
export async function getMyItineraries(): Promise<ActionResult<Itinerary[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user itineraries:', error);
      return { success: false, error: 'Failed to fetch your itineraries' };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getMyItineraries:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single itinerary by ID
 */
export async function getItinerary(id: string): Promise<ActionResult<Itinerary>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching itinerary:', error);
      return { success: false, error: 'Itinerary not found' };
    }
    
    // Check if user has access (public or own itinerary)
    if (data.is_private && data.user_id !== user?.id) {
      return { success: false, error: 'Access denied' };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update itinerary privacy (requires authentication and ownership)
 */
export async function updateItineraryPrivacy(
  id: string,
  isPrivate: boolean
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('itineraries')
      .update({ is_private: isPrivate })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating itinerary:', error);
      return { success: false, error: 'Failed to update itinerary' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateItineraryPrivacy:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update itinerary status (mark as draft or published)
 */
export async function updateItineraryStatus(
  id: string,
  status: 'draft' | 'published' | 'active' | 'completed'
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('itineraries')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating status:', error);
      return { success: false, error: 'Failed to update status' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateItineraryStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update itinerary basic details (destination, notes)
 */
export async function updateItinerary(
  id: string,
  updates: {
    destination?: string;
    notes?: string;
  }
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('itineraries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error updating itinerary:', error);
      return { success: false, error: 'Failed to update itinerary' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an itinerary (requires authentication and ownership)
 */
export async function deleteItinerary(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting itinerary:', error);
      return { success: false, error: 'Failed to delete itinerary' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Save a draft itinerary (for unauthenticated users before sign-in)
 */
export async function saveDraftItinerary(
  data: {
    destination: string;
    days: number;
    travelers: number;
    children?: number;
    childAges?: number[];
    hasAccessibilityNeeds?: boolean;
    notes?: string;
    aiPlan: AIPlan;
  },
  sessionId: string
): Promise<{ id: string; error?: string }> {
  const supabase = await createClient();

  try {
    const { data: insertedData, error } = await supabase
      .from("itineraries")
      .insert({
        destination: data.destination,
        days: data.days,
        travelers: data.travelers,
        notes: data.notes,
        ai_plan: data.aiPlan,
        user_id: null, // No user yet - they'll sign in
        status: "draft",
        session_id: sessionId,
        is_private: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving draft itinerary:", error);
      return { id: "", error: error.message };
    }

    return { id: insertedData.id };
  } catch (error) {
    console.error("Error in saveDraftItinerary:", error);
    return { id: "", error: "Failed to save draft" };
  }
}

/**
 * Load a draft itinerary by ID
 */
export async function loadDraftItinerary(
  draftId: string
): Promise<{
  destination: string;
  days: number;
  travelers: number;
  children?: number;
  childAges?: number[];
  hasAccessibilityNeeds?: boolean;
  notes?: string;
  aiPlan: AIPlan;
} | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", draftId)
      .eq("status", "draft")
      .single();

    if (error || !data) {
      console.error("Error loading draft itinerary:", error);
      return null;
    }

    return {
      destination: data.destination,
      days: data.days,
      travelers: data.travelers,
      notes: data.notes,
      aiPlan: data.ai_plan,
    };
  } catch (error) {
    console.error("Error in loadDraftItinerary:", error);
    return null;
  }
}

