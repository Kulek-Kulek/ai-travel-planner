"use server";

/**
 * User tier management actions
 * 
 * These actions handle fetching and updating user subscription tiers.
 */

import { createClient } from "@/lib/supabase/server";
import type { UserTier } from "@/lib/config/extraction-models";

/**
 * Get the current user's subscription tier
 * 
 * @returns UserTier ('free', 'basic', 'premium', or 'enterprise')
 */
export async function getUserTier(): Promise<UserTier> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // Not authenticated = free tier
  if (authError || !user) {
    return "free";
  }
  
  // Get user's profile with subscription tier
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();
  
  if (profileError || !profile) {
    console.error("Error fetching user tier:", profileError);
    return "free"; // Default to free on error
  }
  
  // If subscription is not active, downgrade to free
  if (profile.subscription_status !== "active" && profile.subscription_status !== "trial") {
    return "free";
  }
  
  // Return the tier, defaulting to free if invalid
  const tier = profile.subscription_tier as UserTier;
  if (!tier || !["free", "basic", "premium", "enterprise"].includes(tier)) {
    return "free";
  }
  
  return tier;
}

/**
 * Check if user has access to AI extraction
 * 
 * @returns boolean - true if user can use AI extraction
 */
export async function hasAIExtractionAccess(): Promise<boolean> {
  const tier = await getUserTier();
  return tier !== "free";
}

/**
 * Get user's subscription info
 * 
 * @returns Object with tier, status, and access levels
 */
export async function getUserSubscriptionInfo(): Promise<{
  tier: UserTier;
  status: string;
  hasAIExtraction: boolean;
  hasUnlimitedGenerations: boolean;
}> {
  const tier = await getUserTier();
  
  return {
    tier,
    status: tier === "free" ? "free" : "active",
    hasAIExtraction: tier !== "free",
    hasUnlimitedGenerations: tier === "premium" || tier === "enterprise",
  };
}

