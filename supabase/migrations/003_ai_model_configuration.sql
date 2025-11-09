-- MED-2: Move AI model mapping to database
-- Creates ai_model_config table for dynamic model configuration
-- This prevents hardcoded mappings and allows easy model updates

-- Create AI model configuration table
CREATE TABLE IF NOT EXISTS ai_model_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openrouter_id TEXT NOT NULL UNIQUE,
  pricing_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'premium')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_tokens INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add constraint to ensure pricing_key is unique among active models
  CONSTRAINT ai_model_config_pricing_key_active_unique 
    EXCLUDE (pricing_key WITH =) WHERE (is_active = true)
);

-- Create index for fast lookups by OpenRouter ID
CREATE INDEX IF NOT EXISTS idx_ai_model_config_openrouter_id 
  ON ai_model_config(openrouter_id) WHERE is_active = true;

-- Create index for pricing key lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_config_pricing_key 
  ON ai_model_config(pricing_key) WHERE is_active = true;

-- Create index for tier filtering
CREATE INDEX IF NOT EXISTS idx_ai_model_config_tier 
  ON ai_model_config(tier) WHERE is_active = true;

-- Insert current model configurations
INSERT INTO ai_model_config (
  openrouter_id, 
  pricing_key, 
  display_name, 
  cost, 
  tier, 
  max_tokens,
  description
) VALUES
  (
    'google/gemini-2.0-flash-lite-001', 
    'gemini-flash', 
    'Gemini Flash', 
    0.5, 
    'economy', 
    8000,
    'Fast and efficient model for general travel planning'
  ),
  (
    'openai/gpt-4o-mini', 
    'gpt-4o-mini', 
    'GPT-4o Mini', 
    0.5, 
    'economy', 
    4000,
    'OpenAI''s efficient model for quick itinerary generation'
  ),
  (
    'anthropic/claude-3-haiku', 
    'claude-haiku', 
    'Claude Haiku', 
    1.0, 
    'premium', 
    8000,
    'Fast Claude model with good reasoning capabilities'
  ),
  (
    'google/gemini-2.5-pro', 
    'gemini-pro', 
    'Gemini Pro', 
    1.5, 
    'premium', 
    10000,
    'Advanced model for detailed travel planning'
  ),
  (
    'google/gemini-2.5-flash', 
    'gemini-flash-plus', 
    'Gemini Flash Plus', 
    0.8, 
    'economy', 
    8000,
    'Enhanced Flash model with better performance'
  )
ON CONFLICT (openrouter_id) DO UPDATE SET
  pricing_key = EXCLUDED.pricing_key,
  display_name = EXCLUDED.display_name,
  cost = EXCLUDED.cost,
  tier = EXCLUDED.tier,
  max_tokens = EXCLUDED.max_tokens,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Enable Row Level Security
ALTER TABLE ai_model_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anonymous users (only active models)
CREATE POLICY "allow_read_active_models"
  ON ai_model_config FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Only service role can modify (admin operations)
CREATE POLICY "service_role_all_access"
  ON ai_model_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to get model config by OpenRouter ID
CREATE OR REPLACE FUNCTION get_model_config_by_openrouter_id(p_openrouter_id TEXT)
RETURNS TABLE (
  pricing_key TEXT,
  cost NUMERIC,
  tier TEXT,
  max_tokens INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.pricing_key,
    mc.cost,
    mc.tier,
    mc.max_tokens
  FROM ai_model_config mc
  WHERE mc.openrouter_id = p_openrouter_id
    AND mc.is_active = true;
END;
$$;

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_model_config_by_openrouter_id TO authenticated, anon;

-- Create function to get all active models
CREATE OR REPLACE FUNCTION get_active_models()
RETURNS TABLE (
  id UUID,
  openrouter_id TEXT,
  pricing_key TEXT,
  display_name TEXT,
  cost NUMERIC,
  tier TEXT,
  max_tokens INTEGER,
  description TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.openrouter_id,
    mc.pricing_key,
    mc.display_name,
    mc.cost,
    mc.tier,
    mc.max_tokens,
    mc.description
  FROM ai_model_config mc
  WHERE mc.is_active = true
  ORDER BY mc.tier, mc.cost;
END;
$$;

-- Grant execute to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_active_models TO authenticated, anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_model_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_model_config_updated_at
  BEFORE UPDATE ON ai_model_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_model_config_updated_at();

-- Add comment to table
COMMENT ON TABLE ai_model_config IS 'Configuration for AI models used in travel planning. Allows dynamic model management without code changes.';

-- Add comments to important columns
COMMENT ON COLUMN ai_model_config.openrouter_id IS 'OpenRouter model identifier (e.g., google/gemini-2.0-flash-lite-001)';
COMMENT ON COLUMN ai_model_config.pricing_key IS 'Internal key used for pricing calculations and model identification';
COMMENT ON COLUMN ai_model_config.cost IS 'Cost in credits per generation';
COMMENT ON COLUMN ai_model_config.tier IS 'Model tier: economy (unlimited for Pro) or premium (limited for Pro)';
COMMENT ON COLUMN ai_model_config.is_active IS 'Whether this model is currently available for use';

