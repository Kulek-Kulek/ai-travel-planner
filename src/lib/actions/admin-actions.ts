'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export type AdminItinerary = {
  id: string;
  user_id: string | null;
  destination: string;
  days: number;
  travelers: number;
  is_private: boolean;
  status: string;
  created_at: string;
  user_email?: string;
};

/**
 * Get all itineraries (admin only)
 */
export async function getAllItinerariesAdmin(options: {
  limit?: number;
  offset?: number;
  filter?: 'all' | 'public' | 'private' | 'anonymous';
} = {}): Promise<ActionResult<{ itineraries: AdminItinerary[]; total: number }>> {
  try {
    await requireAdmin();
    
    const { limit = 50, offset = 0, filter = 'all' } = options;
    const supabase = await createClient();
    
    let query = supabase
      .from('itineraries')
      .select(`
        id,
        user_id,
        destination,
        days,
        travelers,
        is_private,
        status,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filter === 'public') {
      query = query.eq('is_private', false);
    } else if (filter === 'private') {
      query = query.eq('is_private', true);
    } else if (filter === 'anonymous') {
      query = query.is('user_id', null);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching itineraries (admin):', error);
      return { success: false, error: 'Failed to fetch itineraries' };
    }
    
    // Get user emails for authenticated itineraries
    const itinerariesWithEmails = await Promise.all(
      (data || []).map(async (itinerary) => {
        if (itinerary.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', itinerary.user_id)
            .single();
          
          return {
            ...itinerary,
            user_email: profile?.email || 'Unknown',
          };
        }
        return {
          ...itinerary,
          user_email: 'Anonymous',
        };
      })
    );
    
    return { 
      success: true, 
      data: { 
        itineraries: itinerariesWithEmails as AdminItinerary[], 
        total: count || 0 
      } 
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in getAllItinerariesAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete any itinerary (admin only)
 */
export async function deleteItineraryAdmin(id: string): Promise<ActionResult<void>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting itinerary (admin):', error);
      return { success: false, error: 'Failed to delete itinerary' };
    }
    
    revalidatePath('/admin/itineraries');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in deleteItineraryAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update any itinerary privacy (admin only)
 */
export async function updateItineraryPrivacyAdmin(
  id: string,
  isPrivate: boolean
): Promise<ActionResult<void>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    const { error } = await supabase
      .from('itineraries')
      .update({ is_private: isPrivate })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating itinerary privacy (admin):', error);
      return { success: false, error: 'Failed to update privacy' };
    }
    
    revalidatePath('/admin/itineraries');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in updateItineraryPrivacyAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get dashboard stats (admin only)
 */
export async function getAdminStats(): Promise<ActionResult<{
  totalItineraries: number;
  publicItineraries: number;
  privateItineraries: number;
  anonymousItineraries: number;
  totalUsers: number;
}>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    
    // Get total itineraries
    const { count: totalItineraries } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true });
    
    // Get public itineraries
    const { count: publicItineraries } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', false);
    
    // Get private itineraries
    const { count: privateItineraries } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .eq('is_private', true);
    
    // Get anonymous itineraries
    const { count: anonymousItineraries } = await supabase
      .from('itineraries')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    return {
      success: true,
      data: {
        totalItineraries: totalItineraries || 0,
        publicItineraries: publicItineraries || 0,
        privateItineraries: privateItineraries || 0,
        anonymousItineraries: anonymousItineraries || 0,
        totalUsers: totalUsers || 0,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in getAdminStats:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

