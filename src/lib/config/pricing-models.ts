/**
 * Pricing Models Configuration
 * Defines AI models, costs, and tier restrictions
 */

export type SubscriptionTier = 'free' | 'payg' | 'pro';
export type ModelTier = 'economy' | 'premium';
export type ModelKey = 
  | 'gemini-flash' // Database uses this
  | 'gemini-2.0-flash' 
  | 'gpt-4o-mini' 
  | 'gemini-2.5-pro'
  | 'claude-haiku' 
  | 'gpt-4o' // Database uses this
  | 'gemini-2.5-flash';

export interface AIModel {
  key: ModelKey;
  name: string;
  provider: string; // OpenRouter model identifier
  cost: number; // Cost in euros
  tier: ModelTier;
  freeAccess: boolean; // Available on free tier
  badge: string; // UI badge text
  description: string;
  speed: 'fast' | 'medium' | 'slow';
}

export const AI_MODELS: Record<ModelKey, AIModel> = {
  // Economy tier - Fast & Affordable (Free tier access)
  // Database key (for can_generate_plan function)
  'gemini-flash': {
    key: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'google/gemini-2.0-flash-lite-001',
    cost: 1.00,
    tier: 'economy',
    freeAccess: true,
    badge: 'Fast',
    description: 'Fast and reliable, great for quick travel plans',
    speed: 'fast',
  },
  // Modern key (keeping for compatibility)
  'gemini-2.0-flash': {
    key: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash Lite',
    provider: 'google/gemini-2.0-flash-lite-001',
    cost: 1.00,
    tier: 'economy',
    freeAccess: true,
    badge: 'Fast',
    description: 'Fast and reliable, great for quick travel plans',
    speed: 'fast',
  },
  'gpt-4o-mini': {
    key: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai/gpt-4o-mini',
    cost: 1.00,
    tier: 'economy',
    freeAccess: true,
    badge: 'Balanced',
    description: 'Fast and affordable with excellent quality',
    speed: 'fast',
  },
  
  // Premium tier - High Quality (Paid plans only)
  'gemini-2.5-flash': {
    key: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google/gemini-2.5-flash',
    cost: 1.20,
    tier: 'premium',
    freeAccess: false,
    badge: 'Premium',
    description: 'Latest Gemini with enhanced speed and quality',
    speed: 'fast',
  },
  'claude-haiku': {
    key: 'claude-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic/claude-3-haiku',
    cost: 1.35,
    tier: 'premium',
    freeAccess: false,
    badge: 'Efficient',
    description: 'Lightning-fast and efficient, perfect for balanced itineraries',
    speed: 'fast',
  },
  'gemini-2.5-pro': {
    key: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google/gemini-2.5-pro',
    cost: 1.50,
    tier: 'premium',
    freeAccess: false,
    badge: 'Advanced',
    description: 'Advanced reasoning and comprehensive planning capabilities',
    speed: 'medium',
  },
  'gpt-4o': {
    key: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai/gpt-4o',
    cost: 1.75,
    tier: 'premium',
    freeAccess: false,
    badge: 'Best',
    description: 'OpenAI\'s most capable model for complex itineraries',
    speed: 'medium',
  },
} as const;

// Tier configuration
export interface TierLimits {
  name: string;
  displayName: string;
  price: number; // Monthly price in euros (0 for free/payg)
  plansLimit: number | null; // null = unlimited
  allowedModels: ModelKey[];
  economyLimit: number | null; // Monthly limit for economy models (pro tier)
  premiumLimit: number | null; // Monthly limit for premium models (pro tier)
  premiumRolloverMax: number; // Max rollover for unused premium plans
  editsPerPlan: number | null; // null = unlimited
  rateLimit: {
    perHour: number;
    perDay: number | null;
  };
  features: string[];
}

export const TIER_CONFIG: Record<SubscriptionTier, TierLimits> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: 0,
    plansLimit: 2,
    allowedModels: ['gemini-flash', 'gemini-2.0-flash', 'gpt-4o-mini'], // gemini-flash is the database key
    economyLimit: null,
    premiumLimit: null,
    premiumRolloverMax: 0,
    editsPerPlan: 1,
    rateLimit: {
      perHour: 2,
      perDay: 2,
    },
    features: [
      '2 AI-powered itineraries',
      'Gemini 2.0 Flash & GPT-4o Mini',
      '1 edit per plan',
      'Full feature access',
      'Browse public plans',
    ],
  },
  payg: {
    name: 'payg',
    displayName: 'Pay as You Go',
    price: 0, // Variable pricing
    plansLimit: null,
    allowedModels: [
      'gemini-flash',
      'gemini-2.0-flash', 
      'gpt-4o-mini', 
      'gemini-2.5-pro',
      'claude-haiku', 
      'gemini-2.5-flash'
    ],
    economyLimit: null,
    premiumLimit: null,
    premiumRolloverMax: 0,
    editsPerPlan: null,
    rateLimit: {
      perHour: 10,
      perDay: 50,
    },
    features: [
      '€1.00-€1.75 per itinerary',
      'All 6 AI models',
      'Credits never expire',
      'Unlimited edits',
      'All premium features',
    ],
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: 9.99,
    plansLimit: null,
    allowedModels: [
      'gemini-flash',
      'gemini-2.0-flash', 
      'gpt-4o-mini', 
      'gemini-2.5-pro',
      'claude-haiku', 
      'gemini-2.5-flash'
    ],
    economyLimit: 100,
    premiumLimit: 20,
    premiumRolloverMax: 40,
    editsPerPlan: null,
    rateLimit: {
      perHour: 20,
      perDay: 200,
    },
    features: [
      '100 economy + 20 premium plans/month',
      'All 6 AI models',
      'Unused premium plans roll over',
      'Priority generation',
      'Unlimited edits',
      'Batch create (coming soon)',
    ],
  },
};

// Top-up amounts for PAYG (in euros)
export const TOPUP_AMOUNTS = [2, 5, 10, 20] as const;

// Credit packs with estimated plan counts
export interface CreditPack {
  amount: number;
  estimatedPlans: {
    min: number; // Using premium models
    max: number; // Using economy models
  };
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    amount: 2,
    estimatedPlans: { min: 1, max: 2 },
  },
  {
    amount: 5,
    estimatedPlans: { min: 2, max: 5 },
  },
  {
    amount: 10,
    estimatedPlans: { min: 5, max: 10 },
  },
  {
    amount: 20,
    estimatedPlans: { min: 11, max: 20 },
  },
];

/**
 * Get models available for a specific tier
 */
export function getAvailableModels(tier: SubscriptionTier): AIModel[] {
  const allowedKeys = TIER_CONFIG[tier].allowedModels;
  return allowedKeys.map((key) => AI_MODELS[key]);
}

/**
 * Get locked (unavailable) models for a specific tier
 */
export function getLockedModels(tier: SubscriptionTier): AIModel[] {
  const allowedKeys = TIER_CONFIG[tier].allowedModels;
  const allKeys = Object.keys(AI_MODELS) as ModelKey[];
  return allKeys
    .filter((key) => !allowedKeys.includes(key))
    .map((key) => AI_MODELS[key]);
}

/**
 * Check if a model is available for a tier
 */
export function isModelAvailable(
  model: ModelKey,
  tier: SubscriptionTier
): boolean {
  return TIER_CONFIG[tier].allowedModels.includes(model);
}

/**
 * Get tier from subscription tier name
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_CONFIG[tier];
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate estimated plan count from credits
 */
export function estimatePlanCount(
  credits: number,
  modelCost: number
): number {
  return Math.floor(credits / modelCost);
}

/**
 * Get available premium plans (including rollover)
 */
export function getAvailablePremiumPlans(
  monthlyUsed: number,
  rollover: number
): number | null {
  const limit = TIER_CONFIG.pro.premiumLimit;
  if (limit === null) return null;
  
  return Math.max(0, (limit + rollover) - monthlyUsed);
}

/**
 * Get available economy plans
 */
export function getAvailableEconomyPlans(monthlyUsed: number): number | null {
  const limit = TIER_CONFIG.pro.economyLimit;
  if (limit === null) return null;
  
  return limit - monthlyUsed;
}

/**
 * Validate model selection
 */
export function validateModelSelection(
  model: ModelKey,
  tier: SubscriptionTier,
  profile: {
    creditsBalance?: number;
    monthlyEconomyUsed?: number;
    monthlyPremiumUsed?: number;
    premiumRollover?: number;
    plansCreatedCount?: number;
  },
  operation: 'create' | 'edit' | 'regenerate' = 'create'
): { valid: boolean; reason?: string; cost?: number } {
  // Check if model is allowed for tier
  if (!isModelAvailable(model, tier)) {
    return {
      valid: false,
      reason: `${AI_MODELS[model].name} is not available on ${TIER_CONFIG[tier].displayName} tier`,
    };
  }

  const modelInfo = AI_MODELS[model];

  // Check tier-specific rules
  switch (tier) {
    case 'free':
      // For edit/regenerate operations, don't check creation limit
      // Edit limits are checked separately in canGeneratePlan
      if (operation === 'create' && (profile.plansCreatedCount ?? 0) >= TIER_CONFIG.free.plansLimit!) {
        return {
          valid: false,
          reason: 'Free tier limit reached (2 plans). Please upgrade.',
        };
      }
      return { valid: true };

    case 'payg':
      if ((profile.creditsBalance ?? 0) < modelInfo.cost) {
        return {
          valid: false,
          reason: `Insufficient credits. Need €${modelInfo.cost.toFixed(2)}`,
          cost: modelInfo.cost,
        };
      }
      return { valid: true, cost: modelInfo.cost };

    case 'pro':
      if (modelInfo.tier === 'economy') {
        const availableEconomy = getAvailableEconomyPlans(profile.monthlyEconomyUsed ?? 0);
        if (availableEconomy !== null && availableEconomy <= 0) {
          return {
            valid: false,
            reason: 'Monthly economy plan limit reached. Resets next month.',
          };
        }
      } else {
        const availablePremium = getAvailablePremiumPlans(
          profile.monthlyPremiumUsed ?? 0,
          profile.premiumRollover ?? 0
        );
        if (availablePremium !== null && availablePremium <= 0) {
          return {
            valid: false,
            reason: 'Monthly premium plan limit reached. Resets next month.',
          };
        }
      }
      return { valid: true };

    default:
      return { valid: false, reason: 'Invalid subscription tier' };
  }
}
