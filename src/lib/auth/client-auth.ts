"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Client-side sign out function
 * This ensures the auth state change listener fires before redirect
 */
export async function clientSignOut() {
  const supabase = createClient();
  
  // Sign out from Supabase
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("Sign out error:", error);
    throw error;
  }
  
  // Wait a bit for auth state change to propagate
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Redirect to home page
  window.location.href = '/';
}

