/**
 * Subscription Actions
 * Server actions for managing user subscriptions, credits, and tier access
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import {
  type SubscriptionTier,
  type ModelKey,
  AI_MODELS,
  TIER_CONFIG,
  validateModelSelection,
} from '@/lib/config/pricing-models';

export interface UserSubscriptionInfo {
  userId: string;
  tier: SubscriptionTier;
  status: string;
  creditsBalance: number;
  monthlyEconomyUsed: number;
  monthlyPremiumUsed: number;
  premiumRollover: number;
  plansCreatedCount: number;
  billingCycleStart: string | null;
  lastGenerationAt: string | null;
}

export interface CanGenerateResult {
  allowed: boolean;
  reason?: string;
  cost?: number;
  needsUpgrade?: boolean;
  needsTopup?: boolean;
  usingCredits?: boolean;
  unlimitedMode?: boolean;
  newBalance?: number;
}

/**
 * Get user subscription information
 */
export async function getUserSubscription(): Promise<UserSubscriptionInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      subscription_tier,
      subscription_status,
      credits_balance,
      monthly_economy_used,
      monthly_premium_used,
      premium_rollover,
      plans_created_count,
      billing_cycle_start,
      last_generation_at
    `
    )
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    userId: profile.id,
    tier: (profile.subscription_tier as SubscriptionTier) || 'free',
    status: profile.subscription_status || 'active',
    creditsBalance: Number(profile.credits_balance) || 0,
    monthlyEconomyUsed: profile.monthly_economy_used || 0,
    monthlyPremiumUsed: profile.monthly_premium_used || 0,
    premiumRollover: profile.premium_rollover || 0,
    plansCreatedCount: profile.plans_created_count || 0,
    billingCycleStart: profile.billing_cycle_start,
    lastGenerationAt: profile.last_generation_at,
  };
}

/**
 * Check if user can generate a plan with specified model
 */
export async function canGeneratePlan(
  model: ModelKey
): Promise<CanGenerateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      reason: 'User not authenticated',
    };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return {
      allowed: false,
      reason: 'User profile not found',
    };
  }

  const tier = (profile.subscription_tier as SubscriptionTier) || 'free';
  // const modelInfo = AI_MODELS[model];

  // Use database function for validation
  const { data, error } = await supabase.rpc('can_generate_plan', {
    p_user_id: user.id,
    p_model: model,
  });

  if (error) {
    console.error('Error checking generation permission:', error);
    // Fallback to client-side validation
    const validation = validateModelSelection(model, tier, {
      creditsBalance: Number(profile.credits_balance) || 0,
      monthlyEconomyUsed: profile.monthly_economy_used || 0,
      monthlyPremiumUsed: profile.monthly_premium_used || 0,
      premiumRollover: profile.premium_rollover || 0,
      plansCreatedCount: profile.plans_created_count || 0,
    });

    if (!validation.valid) {
      return {
        allowed: false,
        reason: validation.reason,
        cost: validation.cost,
        needsUpgrade: tier === 'free',
        needsTopup: tier !== 'free',
      };
    }

    return {
      allowed: true,
      cost: validation.cost,
    };
  }

  // Parse database response
  return {
    allowed: data.allowed,
    reason: data.reason,
    cost: data.cost,
    needsUpgrade: data.needs_upgrade,
    needsTopup: data.needs_topup,
    usingCredits: data.using_credits,
    unlimitedMode: data.unlimited_mode,
    newBalance: data.new_balance,
  };
}

/**
 * Record plan generation and update usage/credits
 */
export async function recordPlanGeneration(
  planId: string,
  model: ModelKey,
  operation: 'create' | 'edit' | 'regenerate' = 'create'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const tier = (profile.subscription_tier as SubscriptionTier) || 'free';
  const modelInfo = AI_MODELS[model];
  const cost = modelInfo.cost;

  // Calculate updates based on tier
  const updates: Record<string, string | number> = {
    last_generation_at: new Date().toISOString(),
  };

  switch (tier) {
    case 'free':
      if (operation === 'create') {
        updates.plans_created_count = (profile.plans_created_count || 0) + 1;
      }
      break;

    case 'payg':
      // Deduct credits
      const newBalance = (Number(profile.credits_balance) || 0) - cost;
      if (newBalance < 0) {
        return { success: false, error: 'Insufficient credits' };
      }
      updates.credits_balance = newBalance;
      break;

    case 'pro':
      if (modelInfo.tier === 'economy') {
        updates.monthly_economy_used =
          (profile.monthly_economy_used || 0) + 1;
      } else {
        const premiumUsed = profile.monthly_premium_used || 0;
        const rollover = profile.premium_rollover || 0;
        const limit = 20 + rollover;

        if (premiumUsed >= limit) {
          // Use credits
          const newBalance = (Number(profile.credits_balance) || 0) - 0.2;
          if (newBalance < 0) {
            return { success: false, error: 'Insufficient credits' };
          }
          updates.credits_balance = newBalance;
        } else {
          updates.monthly_premium_used = premiumUsed + 1;
        }
      }
      break;
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    return { success: false, error: 'Failed to update profile' };
  }

  // Update itinerary record
  const { error: itineraryError } = await supabase
    .from('itineraries')
    .update({
      ai_model_used: model,
      generation_cost: cost,
      edit_count:
        operation === 'edit' || operation === 'regenerate'
          ? supabase.rpc('increment', { row_id: planId })
          : 0,
    })
    .eq('id', planId);

  if (itineraryError) {
    console.error('Error updating itinerary:', itineraryError);
  }

  // Log usage
  const { error: logError } = await supabase.from('ai_usage_logs').insert({
    user_id: user.id,
    plan_id: planId,
    ai_model: model,
    operation,
    estimated_cost: cost,
    actual_cost: cost,
    subscription_tier: tier,
    credits_deducted:
      tier === 'payg' || (tier === 'pro' && updates.credits_balance)
        ? cost
        : null,
    success: true,
  });

  if (logError) {
    console.error('Error logging usage:', logError);
  }

  return { success: true };
}

/**
 * Add credits to user account (PAYG)
 */
export async function addCredits(
  amount: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  if (amount <= 0) {
    return { success: false, error: 'Invalid amount' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance, subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const newBalance = (Number(profile.credits_balance) || 0) + amount;

  const { error } = await supabase
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', user.id);

  if (error) {
    console.error('Error adding credits:', error);
    return { success: false, error: 'Failed to add credits' };
  }

  // If user was free tier, upgrade to PAYG
  if (profile.subscription_tier === 'free') {
    await supabase
      .from('profiles')
      .update({ subscription_tier: 'payg' })
      .eq('id', user.id);
  }

  return { success: true, newBalance };
}

/**
 * Update subscription tier
 */
export async function updateSubscriptionTier(
  tier: SubscriptionTier
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const updates: Record<string, string | number | null> = {
    subscription_tier: tier,
    subscription_status: 'active',
  };

  // If upgrading to Pro, initialize billing cycle
  if (tier === 'pro') {
    updates.billing_cycle_start = new Date().toISOString();
    updates.monthly_economy_used = 0;
    updates.monthly_premium_used = 0;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating subscription tier:', error);
    return { success: false, error: 'Failed to update subscription' };
  }

  // Log to subscription history
  await supabase.from('subscription_history').insert({
    user_id: user.id,
    tier,
    status: 'active',
    change_reason: 'User upgrade',
  });

  return { success: true };
}

/**
 * Get usage statistics for user dashboard
 */
export async function getUserUsageStats(): Promise<{
  totalPlans: number;
  thisMonthPlans: number;
  totalCost: number;
  thisMonthCost: number;
  modelUsage: Record<string, number>;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get all-time stats
  const { data: allTimeLogs } = await supabase
    .from('ai_usage_logs')
    .select('ai_model, estimated_cost')
    .eq('user_id', user.id);

  // Get this month stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: thisMonthLogs } = await supabase
    .from('ai_usage_logs')
    .select('ai_model, estimated_cost')
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString());

  const modelUsage: Record<string, number> = {};
  let totalCost = 0;
  let thisMonthCost = 0;

  // Calculate all-time stats
  if (allTimeLogs) {
    allTimeLogs.forEach((log) => {
      modelUsage[log.ai_model] = (modelUsage[log.ai_model] || 0) + 1;
      totalCost += Number(log.estimated_cost) || 0;
    });
  }

  // Calculate this month cost
  if (thisMonthLogs) {
    thisMonthLogs.forEach((log) => {
      thisMonthCost += Number(log.estimated_cost) || 0;
    });
  }

  return {
    totalPlans: allTimeLogs?.length || 0,
    thisMonthPlans: thisMonthLogs?.length || 0,
    totalCost,
    thisMonthCost,
    modelUsage,
  };
}

/**
 * Check rate limits
 */
export async function checkRateLimit(): Promise<{
  allowed: boolean;
  reason?: string;
  resetIn?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { allowed: false, reason: 'Profile not found' };
  }

  const tier = (profile.subscription_tier as SubscriptionTier) || 'free';
  const limits = TIER_CONFIG[tier].rateLimit;

  // Get or create rate limit record
  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!rateLimit) {
    // Create new record
    await supabase.from('rate_limits').insert({
      user_id: user.id,
      generations_last_hour: 0,
      generations_today: 0,
    });
    return { allowed: true };
  }

  // Check hourly limit
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const windowStart = new Date(rateLimit.window_start);

  if (windowStart < hourAgo) {
    // Reset hourly counter
    await supabase
      .from('rate_limits')
      .update({
        generations_last_hour: 0,
        window_start: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    return { allowed: true };
  }

  if (rateLimit.generations_last_hour >= limits.perHour) {
    const resetIn = Math.ceil(
      (windowStart.getTime() + 60 * 60 * 1000 - Date.now()) / 1000 / 60
    );
    return {
      allowed: false,
      reason: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
      resetIn,
    };
  }

  // Check daily limit (if applicable)
  if (limits.perDay) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dayStart = new Date(rateLimit.day_start);

    if (dayStart < dayAgo) {
      // Reset daily counter
      await supabase
        .from('rate_limits')
        .update({
          generations_today: 0,
          day_start: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else if (rateLimit.generations_today >= limits.perDay) {
      return {
        allowed: false,
        reason: 'Daily limit exceeded. Try again tomorrow.',
      };
    }
  }

  // Increment counters
  await supabase
    .from('rate_limits')
    .update({
      generations_last_hour: rateLimit.generations_last_hour + 1,
      generations_today: rateLimit.generations_today + 1,
      last_generation_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  return { allowed: true };
}

