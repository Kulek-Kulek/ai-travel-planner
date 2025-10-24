'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string | Record<string, string[]> };

// Validation schemas
const updateNameSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
});

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<ActionResult<{ name: string; email: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    // If profile doesn't exist, create it
    if (error && error.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.name || user.user_metadata?.full_name || '',
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
        // Even if insert fails, return empty name - user can set it
      }
      
      return {
        success: true,
        data: {
          name: user.user_metadata?.name || user.user_metadata?.full_name || '',
          email: user.email || '',
        },
      };
    }
    
    if (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: 'Failed to fetch profile' };
    }
    
    return {
      success: true,
      data: {
        name: profile?.full_name || '',
        email: user.email || '',
      },
    };
  } catch (error) {
    console.error('Error in getProfile:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update user's display name
 */
export async function updateProfileName(formData: FormData): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Validate input
    const validatedFields = updateNameSchema.safeParse({
      name: formData.get('name'),
    });
    
    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { name } = validatedFields.data;
    
    // Try to update profile, if it doesn't exist, create it
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', user.id);
    
    // If profile doesn't exist, create it
    if (updateError && updateError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: name,
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
        return { success: false, error: 'Failed to update name' };
      }
    } else if (updateError) {
      console.error('Error updating profile:', updateError);
      return { success: false, error: 'Failed to update name' };
    }
    
    // Also update user metadata for consistency
    await supabase.auth.updateUser({
      data: { name },
    });
    
    revalidatePath('/profile');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateProfileName:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update user's password
 */
export async function updatePassword(formData: FormData): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Validate input
    const validatedFields = updatePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });
    
    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { currentPassword, newPassword } = validatedFields.data;
    
    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    
    if (signInError) {
      return {
        success: false,
        error: { currentPassword: ['Current password is incorrect'] },
      };
    }
    
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: 'Failed to update password' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updatePassword:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

