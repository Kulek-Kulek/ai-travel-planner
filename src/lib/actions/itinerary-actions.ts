'use server';

import { createClient } from '@/lib/supabase/server';
import type { ModelKey } from '@/lib/config/pricing-models';
import { escapeLikePattern, isValidUUID } from '@/lib/utils/validation';

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
  ai_model_used?: string | null; // The AI model used to generate this itinerary
  likes: number; // Number of thumb-ups this itinerary has received
  created_at: string;
};

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Fetch public itineraries with optional tag and destination filtering
 */
export async function getPublicItineraries(
  options: {
    tags?: string[];
    destination?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ActionResult<{ itineraries: Itinerary[]; total: number }>> {
  try {
    const { tags = [], destination, limit = 20, offset = 0 } = options;
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
    
    // Filter by destination if provided (case-insensitive partial match)
    // CRIT-4 fix: Escape special characters to prevent pattern injection
    if (destination && destination.trim() !== '') {
      const escaped = escapeLikePattern(destination.trim());
      query = query.ilike('destination', `%${escaped}%`);
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
    
    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          itineraries: [],
          total: count || 0,
        },
      };
    }
    
    // Get unique user IDs (excluding null for anonymous itineraries)
    const userIds = [...new Set(
      data
        .map((i: Itinerary) => i.user_id)
        .filter((id): id is string => id !== null)
    )];
    
    // Fetch all profiles in one batch query
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (!profileError && profiles) {
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
      } catch (profileErr) {
        // If profile fetch fails, just continue without names
        console.warn('Failed to fetch profiles:', profileErr);
      }
    }
    
    // Map creator names to itineraries
    const itinerariesWithNames = data.map((itinerary: Itinerary) => ({
      ...itinerary,
      creator_name: itinerary.user_id ? profilesMap[itinerary.user_id] || null : null,
    }));
    
    // Test serialization before returning
    try {
      JSON.stringify({ itineraries: itinerariesWithNames, total: count || 0 });
    } catch (serializeError) {
      console.error('❌ Serialization failed:', serializeError);
      throw new Error('Failed to serialize response data');
    }
    
    return {
      success: true,
      data: {
        itineraries: itinerariesWithNames,
        total: count || 0,
      },
    };
  } catch (error) {
    console.error('❌ Error in getPublicItineraries:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
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
      console.error('🔍 claimDraftItinerary: User not authenticated');
      return {
        success: false,
        error: 'You must be logged in to claim this itinerary',
      };
    }
    
    // First, let's check what the current status is
    const { data: existingItinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, status, user_id, is_private')
      .eq('id', itineraryId)
      .single();
    
    if (fetchError) {
      console.error('claimDraftItinerary: Error fetching itinerary:', fetchError);
      return {
        success: false,
        error: 'Failed to find itinerary',
      };
    }
    
    // If already published and already belongs to this user, just return success
    if (existingItinerary.status === 'published' && existingItinerary.user_id === user.id) {
      return { success: true, data: undefined };
    }
    
    // If already published but belongs to someone else, can't claim
    if (existingItinerary.status === 'published' && existingItinerary.user_id && existingItinerary.user_id !== user.id) {
      console.error('claimDraftItinerary: Itinerary already belongs to another user');
      return {
        success: false,
        error: 'This itinerary already belongs to another user',
      };
    }
    
    // IMPORTANT: Check if user has exceeded their tier limit before claiming
    // This prevents free tier bypass where users create plans while logged out then claim them
    const { data: tierCheck } = await supabase
      .rpc('can_generate_plan', { 
        p_user_id: user.id,
        p_model: 'gemini-flash' // Use default model for check
      });
    
    if (!tierCheck || !tierCheck.allowed) {
      console.warn('⚠️ claimDraftItinerary: User has exceeded tier limit');
      return {
        success: false,
        error: tierCheck?.reason || 'You have reached your plan generation limit. Please upgrade to save this itinerary.',
      };
    }
    
    // Update the itinerary to published and assign to user
    const { data, error } = await supabase
      .from('itineraries')
      .update({
        user_id: user.id,
        status: 'published',
        is_private: false, // Explicitly set to public
      })
      .eq('id', itineraryId)
      .eq('status', 'draft') // Only update if it's still a draft
      .select(); // Return the updated row
    
    if (error) {
      console.error('claimDraftItinerary: Database error:', error);
      return {
        success: false,
        error: 'Failed to save itinerary',
      };
    }
    
    if (!data || data.length === 0) {
      console.warn('claimDraftItinerary: No rows updated. Itinerary might not be a draft or does not exist.');
      return {
        success: false,
        error: 'Itinerary could not be claimed. It may have already been saved.',
      };
    }
    
    // Record the plan generation to increment the user's plan count
    // This is important for tier limit tracking
    const claimedItinerary = data[0];
    const modelUsed = claimedItinerary.ai_model_used || 'gemini-flash';
    
    // Import recordPlanGeneration dynamically to avoid circular dependency
    const { recordPlanGeneration } = await import('./subscription-actions');
    const recordResult = await recordPlanGeneration(
      itineraryId,
      modelUsed as ModelKey,
      'create' // Treat claiming as a "create" operation for counting purposes
    );
    
    if (!recordResult.success) {
      console.error('Failed to record plan generation after claiming:', recordResult.error);
      // Don't fail the whole operation, the itinerary is already claimed
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
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
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
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // MED-1: Explicit ownership check before update
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    if (itinerary.user_id !== user.id) {
      console.warn(`⚠️ Unauthorized access attempt: User ${user.id} tried to update itinerary ${id}`);
      return { success: false, error: 'Unauthorized: You do not own this itinerary' };
    }
    
    // Now perform the update
    const { error } = await supabase
      .from('itineraries')
      .update({ is_private: isPrivate })
      .eq('id', id);
    
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
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // MED-1: Explicit ownership check before update
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    if (itinerary.user_id !== user.id) {
      console.warn(`⚠️ Unauthorized access attempt: User ${user.id} tried to update status of itinerary ${id}`);
      return { success: false, error: 'Unauthorized: You do not own this itinerary' };
    }
    
    // Now perform the update
    const { error } = await supabase
      .from('itineraries')
      .update({ status })
      .eq('id', id);
    
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
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // MED-1: Explicit ownership check before update
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    if (itinerary.user_id !== user.id) {
      console.warn(`⚠️ Unauthorized access attempt: User ${user.id} tried to update itinerary ${id}`);
      return { success: false, error: 'Unauthorized: You do not own this itinerary' };
    }
    
    // Now perform the update
    const { error } = await supabase
      .from('itineraries')
      .update(updates)
      .eq('id', id);
    
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
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // MED-1: Explicit ownership check before deletion
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    if (itinerary.user_id !== user.id) {
      console.warn(`⚠️ Unauthorized deletion attempt: User ${user.id} tried to delete itinerary ${id}`);
      return { success: false, error: 'Unauthorized: You do not own this itinerary' };
    }
    
    // Now perform the deletion
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id);
    
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
 * Increment the likes count for an itinerary
 * Can be called by anyone (authenticated or anonymous)
 * Uses atomic increment to prevent race conditions (CRIT-1 fix)
 */
export async function likeItinerary(id: string): Promise<ActionResult<number>> {
  try {
    // Validate UUID format
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid itinerary ID' };
    }
    
    const supabase = await createClient();
    
    // Use Supabase RPC for atomic increment (prevents race conditions)
    const { data, error } = await supabase
      .rpc('increment_likes', { itinerary_id: id });
    
    if (error) {
      console.error('Error incrementing likes:', error);
      return { success: false, error: 'Failed to like itinerary' };
    }
    
    return { success: true, data: data };
  } catch (error) {
    console.error('Error in likeItinerary:', error);
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

/**
 * Add an itinerary to the user's bucket list
 * Requires authentication
 */
export async function addToBucketList(itineraryId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { 
        success: false, 
        error: 'You must be logged in to save to your bucket list' 
      };
    }
    
    // Check if itinerary exists and is accessible (public or owned by user)
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('id, is_private, user_id')
      .eq('id', itineraryId)
      .single();
    
    if (itineraryError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    // Check if already in bucket list
    const { data: existing } = await supabase
      .from('bucket_list')
      .select('id')
      .eq('user_id', user.id)
      .eq('itinerary_id', itineraryId)
      .single();
    
    if (existing) {
      return { success: false, error: 'Already in your bucket list' };
    }
    
    // Add to bucket list
    const { error } = await supabase
      .from('bucket_list')
      .insert({
        user_id: user.id,
        itinerary_id: itineraryId,
      });
    
    if (error) {
      console.error('Error adding to bucket list:', error);
      return { success: false, error: 'Failed to add to bucket list' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in addToBucketList:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Remove an itinerary from the user's bucket list
 * Requires authentication
 */
export async function removeFromBucketList(itineraryId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('bucket_list')
      .delete()
      .eq('user_id', user.id)
      .eq('itinerary_id', itineraryId);
    
    if (error) {
      console.error('Error removing from bucket list:', error);
      return { success: false, error: 'Failed to remove from bucket list' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in removeFromBucketList:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if an itinerary is in the user's bucket list
 * Requires authentication
 */
export async function isInBucketList(itineraryId: string): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: true, data: false };
    }
    
    const { data, error } = await supabase
      .from('bucket_list')
      .select('id')
      .eq('user_id', user.id)
      .eq('itinerary_id', itineraryId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking bucket list:', error);
      return { success: false, error: 'Failed to check bucket list' };
    }
    
    return { success: true, data: !!data };
  } catch (error) {
    console.error('Error in isInBucketList:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get just the IDs of itineraries in the user's bucket list
 * Lightweight version for checking bucket list status
 * Requires authentication
 */
export async function getBucketListIds(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: true, data: [] };
    }
    
    const { data: bucketItems, error } = await supabase
      .from('bucket_list')
      .select('itinerary_id')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching bucket list IDs:', error);
      return { success: false, error: 'Failed to fetch bucket list' };
    }
    
    const ids = (bucketItems || []).map(item => item.itinerary_id);
    return { success: true, data: ids };
  } catch (error) {
    console.error('Error in getBucketListIds:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all itineraries in the user's bucket list
 * Requires authentication
 */
export async function getBucketList(): Promise<ActionResult<Itinerary[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get bucket list items with itinerary details
    const { data: bucketItems, error } = await supabase
      .from('bucket_list')
      .select('itinerary_id, added_at')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bucket list:', error);
      return { success: false, error: 'Failed to fetch bucket list' };
    }
    
    if (!bucketItems || bucketItems.length === 0) {
      return { success: true, data: [] };
    }
    
    // Fetch full itinerary details
    const itineraryIds = bucketItems.map(item => item.itinerary_id);
    const { data: itineraries, error: itinerariesError } = await supabase
      .from('itineraries')
      .select('*')
      .in('id', itineraryIds);
    
    if (itinerariesError) {
      console.error('Error fetching itineraries:', itinerariesError);
      return { success: false, error: 'Failed to fetch itineraries' };
    }
    
    if (!itineraries || itineraries.length === 0) {
      return { success: true, data: [] };
    }
    
    // Get unique user IDs (excluding null for anonymous itineraries)
    const userIds = [...new Set(
      itineraries
        .map((i: Itinerary) => i.user_id)
        .filter((id): id is string => id !== null)
    )];
    
    // Fetch all profiles in one query
    let profilesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
    
    // Add creator names to itineraries
    const itinerariesWithNames = itineraries.map((itinerary: Itinerary) => ({
      ...itinerary,
      creator_name: itinerary.user_id ? profilesMap[itinerary.user_id] || null : null,
    }));
    
    // Sort by bucket list added_at date
    const sortedItineraries = itinerariesWithNames.sort((a, b) => {
      const aDate = bucketItems.find(item => item.itinerary_id === a.id)?.added_at || '';
      const bDate = bucketItems.find(item => item.itinerary_id === b.id)?.added_at || '';
      return bDate.localeCompare(aDate);
    });
    
    return { success: true, data: sortedItineraries };
  } catch (error) {
    console.error('Error in getBucketList:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

