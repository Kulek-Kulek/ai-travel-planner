/**
 * AI Model Configuration for Travel Info Extraction
 * 
 * This file defines which models to use for different user tiers.
 * Extraction is a simple task, so we can use cheaper models here.
 */

export type UserTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface ExtractionModelConfig {
  model: string;
  displayName: string;
  costPer1MTokens: {
    input: number;
    output: number;
  };
  description: string;
}

// Available models for extraction (ordered by cost)
export const EXTRACTION_MODELS = {
  // Ultra cheap - good for high-volume basic users
  'gemini-flash-8b': {
    model: 'google/gemini-flash-1.5-8b',
    displayName: 'Gemini Flash 8B',
    costPer1MTokens: {
      input: 0.0375,
      output: 0.15,
    },
    description: 'Ultra cheap, good for simple extraction',
  },
  
  // Cheap - best value for most users (but has rate limits on free tier)
  'gemini-flash': {
    model: 'google/gemini-2.0-flash-exp:free',
    displayName: 'Gemini Flash 2.0 (Free)',
    costPer1MTokens: {
      input: 0.00, // Free during preview
      output: 0.00,
    },
    description: 'FREE but limited to 50 requests/day on free tier',
  },
  
  // Mid-range - OpenAI alternative
  'gpt-4o-mini': {
    model: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    costPer1MTokens: {
      input: 0.15,
      output: 0.60,
    },
    description: 'OpenAI quality at low cost',
  },
  
  // Recommended - best balance
  'claude-haiku': {
    model: 'anthropic/claude-3.5-haiku',
    displayName: 'Claude 3.5 Haiku',
    costPer1MTokens: {
      input: 0.25,
      output: 1.25,
    },
    description: 'Fast, cheap, excellent for extraction',
  },
  
  // Premium - overkill for extraction but available
  'claude-sonnet': {
    model: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    costPer1MTokens: {
      input: 3.00,
      output: 15.00,
    },
    description: 'Premium model, use for full itinerary generation',
  },
} as const;

export type ExtractionModelKey = keyof typeof EXTRACTION_MODELS;

// Model selection by user tier
export const TIER_MODEL_CONFIG: Record<UserTier, ExtractionModelKey> = {
  free: 'gemini-flash',        // Free users get fast, cheap model
  basic: 'gemini-flash',       // Basic paid users get same
  premium: 'claude-haiku',     // Premium users get better model
  enterprise: 'claude-haiku',  // Enterprise users get best balance
};

/**
 * Get the model to use for a user tier
 */
export function getModelForTier(tier: UserTier): string {
  const modelKey = TIER_MODEL_CONFIG[tier];
  return EXTRACTION_MODELS[modelKey].model;
}

/**
 * Get model configuration for a tier
 */
export function getModelConfigForTier(tier: UserTier): ExtractionModelConfig {
  const modelKey = TIER_MODEL_CONFIG[tier];
  return EXTRACTION_MODELS[modelKey];
}

/**
 * Calculate estimated cost for N extractions
 * 
 * Assumptions:
 * - Average input: 200 tokens (user description)
 * - Average output: 100 tokens (JSON response)
 */
export function estimateCost(
  modelKey: ExtractionModelKey,
  numExtractions: number
): number {
  const model = EXTRACTION_MODELS[modelKey];
  const avgInputTokens = 200;
  const avgOutputTokens = 100;
  
  const inputCost = (avgInputTokens / 1_000_000) * model.costPer1MTokens.input;
  const outputCost = (avgOutputTokens / 1_000_000) * model.costPer1MTokens.output;
  const costPerExtraction = inputCost + outputCost;
  
  return costPerExtraction * numExtractions;
}

/**
 * Get cost comparison vs Claude Sonnet
 */
export function getSavingsVsSonnet(modelKey: ExtractionModelKey): {
  percentage: number;
  description: string;
} {
  const sonnetCost = estimateCost('claude-sonnet', 1000);
  const modelCost = estimateCost(modelKey, 1000);
  const savings = ((sonnetCost - modelCost) / sonnetCost) * 100;
  
  return {
    percentage: Math.round(savings),
    description: `${Math.round(savings)}% cheaper than Claude Sonnet`,
  };
}

// Default model for new implementations (RECOMMENDED)
// Using Claude Haiku - fast, cheap, excellent for extraction
// Note: Free Gemini has rate limits (50/day), so we use paid Claude Haiku instead
export const DEFAULT_EXTRACTION_MODEL = EXTRACTION_MODELS['claude-haiku'].model;

// Current production model (change this to switch globally)
export const CURRENT_EXTRACTION_MODEL = DEFAULT_EXTRACTION_MODEL;

