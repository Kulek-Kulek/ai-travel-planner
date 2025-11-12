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
  isModelAvailable,
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
 * Check if user can edit a specific itinerary
 * Returns the edit eligibility status
 */
export async function canEditItinerary(
  itineraryId: string
): Promise<CanGenerateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      reason: 'Please sign in to edit your itinerary',
    };
  }

  // Get the itinerary to check its model
  const { data: itinerary } = await supabase
    .from('itineraries')
    .select('ai_model_used, user_id')
    .eq('id', itineraryId)
    .single();

  if (!itinerary) {
    return {
      allowed: false,
      reason: 'Itinerary not found',
    };
  }

  // Verify ownership
  if (itinerary.user_id !== user.id) {
    return {
      allowed: false,
      reason: 'You do not own this itinerary',
    };
  }

  // Use the existing canGeneratePlan logic with the original model
  const modelKey = (itinerary.ai_model_used || 'gemini-flash') as ModelKey;
  
  return canGeneratePlan(modelKey, {
    operation: 'edit',
    existingItineraryId: itineraryId,
  });
}

/**
 * Check if user can generate a plan with specified model
 */
export async function canGeneratePlan(
  model: ModelKey,
  options?: {
    operation?: 'create' | 'edit' | 'regenerate';
    existingItineraryId?: string;
  }
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
  const operation = options?.operation || 'create';
  const existingItineraryId = options?.existingItineraryId;

  // For edit operations, check edit count instead of creation count
  if (operation === 'edit' || operation === 'regenerate') {
    if (tier === 'free' && existingItineraryId) {
      // Check if this specific plan has exceeded edit limit
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('edit_count, user_id, ai_model_used')
        .eq('id', existingItineraryId)
        .single();

      if (!itinerary) {
        return {
          allowed: false,
          reason: 'Itinerary not found',
        };
      }

      // Verify ownership
      if (itinerary.user_id !== user.id) {
        return {
          allowed: false,
          reason: 'You do not own this itinerary',
        };
      }

      const editLimit = TIER_CONFIG.free.editsPerPlan;
      const currentEditCount = itinerary.edit_count || 0;
      
      if (editLimit !== null && currentEditCount >= editLimit) {
        return {
          allowed: false,
          reason: `You've reached the edit limit (${editLimit} edit per plan) for free tier. Upgrade to edit more.`,
          needsUpgrade: true,
        };
      }

      // Check if model is available for free tier
      if (!isModelAvailable(model, tier)) {
        return {
          allowed: false,
          reason: `${AI_MODELS[model].name} is not available on ${TIER_CONFIG[tier].displayName} tier`,
          needsUpgrade: true,
        };
      }

      // Free tier edit passed all checks - allow it
      return {
        allowed: true,
      };
    }
    // For paid tiers editing, continue to normal validation below
    // (they might need to check credits, monthly limits, etc.)
  }
  // const modelInfo = AI_MODELS[model];

  // Use database function for validation
  const { data, error } = await supabase.rpc('can_generate_plan', {
    p_user_id: user.id,
    p_model: model,
  });

  if (error) {
    console.error('Error checking generation permission:', error);
    // Fallback to client-side validation
    const validation = validateModelSelection(
      model, 
      tier, 
      {
        creditsBalance: Number(profile.credits_balance) || 0,
        monthlyEconomyUsed: profile.monthly_economy_used || 0,
        monthlyPremiumUsed: profile.monthly_premium_used || 0,
        premiumRollover: profile.premium_rollover || 0,
        plansCreatedCount: profile.plans_created_count || 0,
      },
      operation // Pass operation type to skip creation checks for edits
    );

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
 * CRIT-2 fix: Uses atomic database operation to prevent race conditions
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

  const modelInfo = AI_MODELS[model];
  const cost = modelInfo.cost;

  // CRIT-2 fix: Call database function for atomic credit deduction
  // This prevents race conditions by using row-level locking (FOR UPDATE)
  const { data, error } = await supabase
    .rpc('deduct_credits_atomic', {
      p_user_id: user.id,
      p_cost: cost,
      p_plan_id: planId,
      p_model: model,
      p_operation: operation,
    });

  if (error || !data?.success) {
    console.error('Credit deduction failed:', error || data?.error);
    return {
      success: false,
      error: data?.error || 'Failed to deduct credits',
    };
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
 * Check IP-based rate limit (LOW-2)
 * Applies to ALL users (anonymous and authenticated) for bot protection
 * 
 * Limits:
 * - 10 requests per hour
 * - 20 requests per day
 * 
 * Progressive penalties for repeated violations:
 * - 3+ violations: 1 hour ban
 * - 5+ violations: 24 hour ban
 */
async function checkIPRateLimit(): Promise<{
  allowed: boolean;
  reason?: string;
  resetIn?: number;
}> {
  const { getClientIP, isPrivateIP } = await import('@/lib/utils/get-client-ip');
  const clientIP = await getClientIP();
  
  // Skip IP limiting for private IPs (local development)
  if (isPrivateIP(clientIP)) {
    return { allowed: true };
  }
  
  const supabase = await createClient();
  
  // Get or create IP rate limit record
  const { data: ipLimit } = await supabase
    .from('ip_rate_limits')
    .select('*')
    .eq('ip_address', clientIP)
    .single();
  
  // Check if IP is temporarily banned
  if (ipLimit?.blocked_until) {
    const blockedUntil = new Date(ipLimit.blocked_until);
    if (blockedUntil > new Date()) {
      const resetIn = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000 / 60);
      return {
        allowed: false,
        reason: `IP temporarily blocked due to repeated violations. Try again in ${resetIn} minutes.`,
        resetIn,
      };
    }
    // Ban expired, clear it
    await supabase
      .from('ip_rate_limits')
      .update({ blocked_until: null })
      .eq('ip_address', clientIP);
  }
  
  if (!ipLimit) {
    // Create new record for this IP
    await supabase.from('ip_rate_limits').insert({
      ip_address: clientIP,
      generations_last_hour: 1,
      generations_today: 1,
      window_start: new Date().toISOString(),
      day_start: new Date().toISOString(),
      last_request_at: new Date().toISOString(),
    });
    return { allowed: true };
  }
  
  // IP rate limits (STRICT for anonymous users to prevent API cost abuse)
  // Each anonymous request costs real money via OpenRouter API
  // Defense against: refresh page bypass, storage clearing, VPN rotation
  const IP_HOURLY_LIMIT = 2;  // Reduced from 10 to 2 (CRITICAL SECURITY FIX)
  const IP_DAILY_LIMIT = 3;   // Reduced from 20 to 3 (CRITICAL SECURITY FIX)
  
  // Check hourly limit
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const windowStart = new Date(ipLimit.window_start);
  
  if (windowStart < hourAgo) {
    // Reset hourly counter
    await supabase
      .from('ip_rate_limits')
      .update({
        generations_last_hour: 1,
        window_start: new Date().toISOString(),
        last_request_at: new Date().toISOString(),
      })
      .eq('ip_address', clientIP);
    return { allowed: true };
  }
  
  if (ipLimit.generations_last_hour >= IP_HOURLY_LIMIT) {
    const resetIn = Math.ceil(
      (windowStart.getTime() + 60 * 60 * 1000 - Date.now()) / 1000 / 60
    );
    
    // Increment violation count
    const newViolationCount = (ipLimit.violation_count || 0) + 1;
    
    // Progressive penalties
    let blockedUntil: string | null = null;
    if (newViolationCount >= 5) {
      // 5+ violations: 24 hour ban
      blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (newViolationCount >= 3) {
      // 3-4 violations: 1 hour ban
      blockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    
    await supabase
      .from('ip_rate_limits')
      .update({
        violation_count: newViolationCount,
        blocked_until: blockedUntil,
      })
      .eq('ip_address', clientIP);
    
    return {
      allowed: false,
      reason: blockedUntil 
        ? `Too many rate limit violations. IP temporarily blocked.`
        : `IP rate limit exceeded (${IP_HOURLY_LIMIT}/hour). Try again in ${resetIn} minutes.`,
      resetIn,
    };
  }
  
  // Check daily limit
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dayStart = new Date(ipLimit.day_start);
  
  if (dayStart < dayAgo) {
    // Reset daily counter
    await supabase
      .from('ip_rate_limits')
      .update({
        generations_today: 1,
        day_start: new Date().toISOString(),
        last_request_at: new Date().toISOString(),
      })
      .eq('ip_address', clientIP);
  } else if (ipLimit.generations_today >= IP_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `IP daily limit exceeded (${IP_DAILY_LIMIT}/day). Try again tomorrow.`,
    };
  }
  
  // Increment counters
  await supabase
    .from('ip_rate_limits')
    .update({
      generations_last_hour: ipLimit.generations_last_hour + 1,
      generations_today: ipLimit.generations_today + 1,
      last_request_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('ip_address', clientIP);
  
  return { allowed: true };
}

/**
 * Check rate limits (LOW-2: Combined user + IP-based)
 * 
 * Defense-in-depth approach:
 * - Authenticated users: Check user-based limits (tier-specific)
 * - All users: Check IP-based limits (anonymous protection + bot prevention)
 * 
 * If EITHER limit is exceeded, block the request
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

  // 1. Check IP-based rate limit (applies to ALL users)
  const ipCheckResult = await checkIPRateLimit();
  if (!ipCheckResult.allowed) {
    return ipCheckResult; // IP limit exceeded
  }

  // 2. If not authenticated, IP check is sufficient
  if (!user) {
    return { allowed: true }; // Anonymous users rely on IP limits
  }

  // 3. Check user-based rate limit (authenticated users only)
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

