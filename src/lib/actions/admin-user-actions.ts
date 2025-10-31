'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { revalidatePath } from 'next/cache';

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export type AdminUser = {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscription_tier: string;
  created_at: string;
  itinerary_count?: number;
};

/**
 * Get all users (admin only)
 */
export async function getAllUsers(options: {
  limit?: number;
  offset?: number;
  roleFilter?: 'all' | 'user' | 'admin';
} = {}): Promise<ActionResult<{ users: AdminUser[]; total: number }>> {
  try {
    console.log('📊 Admin User Actions: Checking admin access...');
    await requireAdmin();
    console.log('✅ Admin User Actions: Admin access verified');
    
    const { limit = 50, offset = 0, roleFilter = 'all' } = options;
    console.log('📊 Admin User Actions: Fetching users with options:', { limit, offset, roleFilter });
    const supabase = await createClient();
    
    let query = supabase
      .from('profiles')
      .select('id, email, role, subscription_tier, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Apply role filter
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Admin User Actions: Error fetching users:', error);
      console.error('❌ Admin User Actions: Error code:', error.code);
      console.error('❌ Admin User Actions: Error message:', error.message);
      console.error('❌ Admin User Actions: Error details:', JSON.stringify(error, null, 2));
      console.error('❌ Admin User Actions: Error hint:', error.hint);
      return { 
        success: false, 
        error: `Failed to fetch users: ${error.message || 'Unknown error'}. Error code: ${error.code}. Make sure migration 021 is applied.` 
      };
    }
    
    console.log('✅ Admin User Actions: Successfully fetched', data?.length || 0, 'users');
    
    // Get itinerary count for each user
    console.log('📊 Admin User Actions: Fetching itinerary counts...');
    const usersWithCounts = await Promise.all(
      (data || []).map(async (user) => {
        const { count: itineraryCount, error: countError } = await supabase
          .from('itineraries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (countError) {
          console.error('❌ Admin User Actions: Error fetching itinerary count for user', user.id, ':', countError);
        }
        
        return {
          ...user,
          itinerary_count: itineraryCount || 0,
        };
      })
    );
    
    console.log('✅ Admin User Actions: Successfully processed', usersWithCounts.length, 'users with counts');
    
    return { 
      success: true, 
      data: { 
        users: usersWithCounts as AdminUser[], 
        total: count || 0 
      } 
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in getAllUsers:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise<ActionResult<void>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user role (admin):', error);
      return { success: false, error: 'Failed to update user role' };
    }
    
    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in updateUserRole:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update user subscription tier (admin only)
 */
export async function updateUserTierAdmin(
  userId: string,
  tier: 'free' | 'payg' | 'pro'
): Promise<ActionResult<void>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user tier (admin):', error);
      return { success: false, error: 'Failed to update user tier' };
    }
    
    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in updateUserTierAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get user stats (admin only)
 */
export async function getUserStats(): Promise<ActionResult<{
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  freeUsers: number;
  paygUsers: number;
  proUsers: number;
}>> {
  try {
    await requireAdmin();
    
    const supabase = await createClient();
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get admin users
    const { count: adminUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    
    // Get regular users
    const { count: regularUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user');
    
    // Get free tier users
    const { count: freeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'free');
    
    // Get payg tier users
    const { count: paygUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'payg');
    
    // Get pro tier users
    const { count: proUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_tier', 'pro');
    
    return {
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        regularUsers: regularUsers || 0,
        freeUsers: freeUsers || 0,
        paygUsers: paygUsers || 0,
        proUsers: proUsers || 0,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Admin access required') {
      return { success: false, error: 'Admin access required' };
    }
    console.error('Error in getUserStats:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

