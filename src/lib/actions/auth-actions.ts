'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isValidUUID } from '@/lib/utils/validation';

// Validation schemas
const signUpSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const validatedFields = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, name } = validatedFields.data;

  // Sign up user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name,
      },
    },
  });

  if (error) {
    return {
      error: { general: [error.message] },
    };
  }

  revalidatePath('/', 'layout');
  
  // Check if email confirmation is required
  // If the session is null, it means email confirmation is enabled
  // CRIT-3 fix: Validate itineraryId before using in redirect
  const itineraryId = formData.get('itineraryId');
  const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
  
  if (data.session === null) {
    // Email confirmation required - redirect to confirmation page
    const confirmUrl = validItineraryId
      ? `/confirm-email?email=${encodeURIComponent(email)}&itineraryId=${validItineraryId}`
      : `/confirm-email?email=${encodeURIComponent(email)}`;
    redirect(confirmUrl);
  }
  
  // User is logged in immediately (email confirmation disabled)
  // Redirect to plan selection page for new users
  const planSelectionUrl = validItineraryId
    ? `/choose-plan?itineraryId=${validItineraryId}`
    : `/choose-plan`;
  redirect(planSelectionUrl);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const validatedFields = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  // Sign in user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: { general: [error.message] },
    };
  }

  revalidatePath('/', 'layout');
  
  // CRIT-3 fix: Validate itineraryId before using in redirect
  const itineraryId = formData.get('itineraryId');
  const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
  if (validItineraryId) {
    redirect(`/?itineraryId=${validItineraryId}`);
  }
  redirect('/');
}

export async function signInWithGoogle(itineraryId?: string) {
  const supabase = await createClient();
  
  const origin = 
    process.env.NEXT_PUBLIC_APP_URL || 
    process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000';
  
  // CRIT-3 fix: Validate itineraryId before using in redirect
  const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
  
  // Build redirect URL with itineraryId if present
  const redirectTo = validItineraryId 
    ? `${origin}/api/auth/callback?itineraryId=${validItineraryId}`
    : `${origin}/api/auth/callback`;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return {
      error: { general: [error.message] },
    };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}


