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
  // Free tier - fast and reliable
  'gemini-2.0-flash': {
    model: 'google/gemini-2.0-flash-lite-001',
    displayName: 'Gemini 2.0 Flash Lite',
    costPer1MTokens: {
      input: 0.05,
      output: 0.20,
    },
    description: 'Fast and reliable, great for extraction',
  },
  
  // Mid-range - OpenAI alternative (default for free tier)
  'gpt-4o-mini': {
    model: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    costPer1MTokens: {
      input: 0.15,
      output: 0.60,
    },
    description: 'OpenAI quality at low cost',
  },
  
  // Premium - best balance for paid users
  'claude-haiku': {
    model: 'anthropic/claude-3-haiku',
    displayName: 'Claude 3 Haiku',
    costPer1MTokens: {
      input: 0.25,
      output: 1.25,
    },
    description: 'Fast, cheap, excellent for extraction',
  },
  
  // Premium alternative
  'gemini-2.5-flash': {
    model: 'google/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    costPer1MTokens: {
      input: 0.10,
      output: 0.40,
    },
    description: 'Latest Gemini with enhanced speed',
  },
} as const;

export type ExtractionModelKey = keyof typeof EXTRACTION_MODELS;

// Model selection by user tier
export const TIER_MODEL_CONFIG: Record<UserTier, ExtractionModelKey> = {
  free: 'gemini-2.0-flash',    // Free users get fast, cost-effective model
  basic: 'gemini-2.0-flash',   // Basic paid users get same
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
 * Get cost comparison vs Claude Haiku
 */
export function getSavingsVsHaiku(modelKey: ExtractionModelKey): {
  percentage: number;
  description: string;
} {
  const haikuCost = estimateCost('claude-haiku', 1000);
  const modelCost = estimateCost(modelKey, 1000);
  const savings = ((haikuCost - modelCost) / haikuCost) * 100;
  
  return {
    percentage: Math.round(savings),
    description: `${Math.round(savings)}% ${savings > 0 ? 'cheaper' : 'more expensive'} than Claude Haiku`,
  };
}

// Default model for new implementations (RECOMMENDED)
// Using Gemini 2.0 Flash - fast, reliable, and most cost-effective
export const DEFAULT_EXTRACTION_MODEL = EXTRACTION_MODELS['gemini-2.0-flash'].model;

// Current production model (change this to switch globally)
export const CURRENT_EXTRACTION_MODEL = DEFAULT_EXTRACTION_MODEL;

