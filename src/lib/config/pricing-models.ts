/**
 * Pricing Models Configuration
 * Defines AI models, costs, and tier restrictions
 */

export type SubscriptionTier = 'free' | 'payg' | 'pro';
export type ModelTier = 'economy' | 'premium';
export type ModelKey = 'gemini-flash' | 'gpt-4o-mini' | 'claude-haiku' | 'gpt-4o';

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
  'gemini-flash': {
    key: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'google/gemini-1.5-flash', // Updated to match actual OpenRouter model
    cost: 0.15,
    tier: 'economy',
    freeAccess: true,
    badge: 'Fast',
    description: 'Fast and efficient, great for quick travel plans',
    speed: 'fast',
  },
  'gpt-4o-mini': {
    key: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai/gpt-4o-mini',
    cost: 0.20,
    tier: 'economy',
    freeAccess: true,
    badge: 'Balanced',
    description: 'Balanced quality and speed, reliable choice',
    speed: 'fast',
  },
  'claude-haiku': {
    key: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic/claude-3-haiku', // Updated to match actual OpenRouter model
    cost: 0.30,
    tier: 'premium',
    freeAccess: false,
    badge: 'Better',
    description: 'Enhanced quality, detailed itineraries',
    speed: 'medium',
  },
  'gpt-4o': {
    key: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai/gpt-5', // Mapped to GPT-5 as the premium option
    cost: 0.50,
    tier: 'premium',
    freeAccess: false,
    badge: 'Best',
    description: 'Premium quality, most comprehensive plans',
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
    allowedModels: ['gemini-flash', 'gpt-4o-mini'],
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
      'Gemini Flash & GPT-4o Mini',
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
    allowedModels: ['gemini-flash', 'gpt-4o-mini', 'claude-haiku', 'gpt-4o'],
    economyLimit: null,
    premiumLimit: null,
    premiumRolloverMax: 0,
    editsPerPlan: null,
    rateLimit: {
      perHour: 10,
      perDay: 50,
    },
    features: [
      'Pay per itinerary',
      'All AI models available',
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
    allowedModels: ['gemini-flash', 'gpt-4o-mini', 'claude-haiku', 'gpt-4o'],
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
      'All AI models included',
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
    min: number; // Using most expensive model
    max: number; // Using cheapest model
  };
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    amount: 2,
    estimatedPlans: { min: 4, max: 13 },
  },
  {
    amount: 5,
    estimatedPlans: { min: 10, max: 33 },
    popular: true,
  },
  {
    amount: 10,
    estimatedPlans: { min: 20, max: 67 },
  },
  {
    amount: 20,
    estimatedPlans: { min: 40, max: 133 },
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
 * Get model by key
 */
export function getModel(key: ModelKey): AIModel {
  return AI_MODELS[key];
}

/**
 * Get model cost
 */
export function getModelCost(key: ModelKey): number {
  return AI_MODELS[key].cost;
}

/**
 * Calculate cost for multiple plans
 */
export function calculateCost(model: ModelKey, planCount: number): number {
  return AI_MODELS[model].cost * planCount;
}

/**
 * Estimate plans from credits
 */
export function estimatePlansFromCredits(
  credits: number,
  model: ModelKey
): number {
  return Math.floor(credits / AI_MODELS[model].cost);
}

/**
 * Get default model for a tier
 */
export function getDefaultModel(tier: SubscriptionTier): ModelKey {
  const available = TIER_CONFIG[tier].allowedModels;
  // Default to first economy model, or first available
  return available.includes('gemini-flash') ? 'gemini-flash' : available[0];
}

/**
 * Format currency (euros)
 */
export function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

/**
 * Get tier display info
 */
export function getTierDisplayInfo(tier: SubscriptionTier) {
  const config = TIER_CONFIG[tier];
  return {
    name: config.displayName,
    price: config.price,
    priceFormatted: config.price === 0 ? 'Free' : `€${config.price}/mo`,
    features: config.features,
  };
}

/**
 * Pro tier: Calculate available premium plans (including rollover)
 */
export function getAvailablePremiumPlans(
  monthlyUsed: number,
  rollover: number
): number {
  const baseAllowance = TIER_CONFIG.pro.premiumLimit!;
  const total = baseAllowance + rollover;
  return Math.max(0, total - monthlyUsed);
}

/**
 * Pro tier: Calculate available economy plans
 */
export function getAvailableEconomyPlans(monthlyUsed: number): number | null {
  const limit = TIER_CONFIG.pro.economyLimit!;
  if (monthlyUsed >= limit) {
    return null; // Unlimited after limit
  }
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
  }
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
      if ((profile.plansCreatedCount ?? 0) >= TIER_CONFIG.free.plansLimit!) {
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
        // Economy: unlimited after 100
        return { valid: true };
      } else {
        // Premium: check limits
        const used = profile.monthlyPremiumUsed ?? 0;
        const rollover = profile.premiumRollover ?? 0;
        const available = getAvailablePremiumPlans(used, rollover);

        if (available <= 0) {
          // Check if they can use credits
          if ((profile.creditsBalance ?? 0) >= 0.2) {
            return {
              valid: true,
              cost: 0.2,
              reason: 'Using credits (€0.20) - monthly premium limit reached',
            };
          }
          return {
            valid: false,
            reason:
              'Monthly premium limit reached. Use economy model or add credits.',
          };
        }
        return { valid: true };
      }

    default:
      return { valid: false, reason: 'Invalid subscription tier' };
  }
}

