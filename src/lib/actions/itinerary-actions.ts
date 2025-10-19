'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Itinerary from database
export type Itinerary = {
  id: string;
  user_id: string | null;
  destination: string;
  days: number;
  travelers: number;
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
    
    let query = supabase
      .from('itineraries')
      .select('*', { count: 'exact' })
      .eq('is_private', false)
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
    
    return {
      success: true,
      data: {
        itineraries: data || [],
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
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateItineraryPrivacy:', error);
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
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

