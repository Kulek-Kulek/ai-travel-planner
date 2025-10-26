-- Migration: Add comprehensive pricing system
-- Purpose: Enable Free, PAYG, and Pro tiers with usage tracking and cost protection

-- Update subscription_tier to use new tier names
-- Drop old constraint and add new one
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'payg', 'pro'));

-- Update existing users with old tier names
UPDATE profiles SET subscription_tier = 'pro' WHERE subscription_tier IN ('basic', 'premium', 'enterprise');

-- Add new columns to profiles for pricing system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_balance DECIMAL(10,2) DEFAULT 0 CHECK (credits_balance >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_economy_used INTEGER DEFAULT 0 CHECK (monthly_economy_used >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_premium_used INTEGER DEFAULT 0 CHECK (monthly_premium_used >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_rollover INTEGER DEFAULT 0 CHECK (premium_rollover >= 0 AND premium_rollover <= 40);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plans_created_count INTEGER DEFAULT 0 CHECK (plans_created_count >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMPTZ;

-- Add comments for new columns
COMMENT ON COLUMN profiles.credits_balance IS 'PAYG credits balance in euros';
COMMENT ON COLUMN profiles.monthly_economy_used IS 'Number of economy model generations used this billing cycle (Pro tier)';
COMMENT ON COLUMN profiles.monthly_premium_used IS 'Number of premium model generations used this billing cycle (Pro tier)';
COMMENT ON COLUMN profiles.premium_rollover IS 'Unused premium plans rolled over from previous month (max 40)';
COMMENT ON COLUMN profiles.billing_cycle_start IS 'Start of current billing cycle for Pro tier';
COMMENT ON COLUMN profiles.plans_created_count IS 'Total number of plans created (lifetime, for free tier limit)';
COMMENT ON COLUMN profiles.last_generation_at IS 'Timestamp of last plan generation (for rate limiting)';

-- Add new columns to itineraries for cost tracking
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS ai_model_used TEXT;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS generation_cost DECIMAL(10,4) DEFAULT 0;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0 CHECK (edit_count >= 0);

-- Add comments
COMMENT ON COLUMN itineraries.ai_model_used IS 'AI model used for generation (e.g., gemini-flash, gpt-4o-mini)';
COMMENT ON COLUMN itineraries.generation_cost IS 'Cost in euros for generating this itinerary';
COMMENT ON COLUMN itineraries.edit_count IS 'Number of times this itinerary has been edited/regenerated';

-- Create ai_usage_logs table for cost monitoring and analytics
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
  ai_model TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'edit', 'regenerate')),
  estimated_cost DECIMAL(10,4) NOT NULL,
  actual_cost DECIMAL(10,4),
  tokens_used INTEGER,
  subscription_tier TEXT NOT NULL,
  credits_deducted DECIMAL(10,2),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage logs
CREATE POLICY "users_read_own_usage_logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert usage logs
CREATE POLICY "service_role_insert_usage_logs"
  ON ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_ai_model ON ai_usage_logs(ai_model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_subscription_tier ON ai_usage_logs(subscription_tier);

COMMENT ON TABLE ai_usage_logs IS 'Tracks all AI model usage for cost monitoring and analytics';

-- Create rate_limits table for abuse prevention
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  generations_last_hour INTEGER DEFAULT 0 CHECK (generations_last_hour >= 0),
  generations_today INTEGER DEFAULT 0 CHECK (generations_today >= 0),
  window_start TIMESTAMPTZ DEFAULT NOW(),
  day_start TIMESTAMPTZ DEFAULT NOW(),
  last_generation_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own rate limits
CREATE POLICY "users_read_own_rate_limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage rate limits
CREATE POLICY "service_role_manage_rate_limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true);

COMMENT ON TABLE rate_limits IS 'Tracks user generation rate for abuse prevention';

-- Create function to reset monthly usage for Pro users
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    monthly_economy_used = 0,
    -- Roll over unused premium plans (max 40 total)
    premium_rollover = LEAST(
      GREATEST(0, 20 - monthly_premium_used) + premium_rollover,
      40
    ),
    monthly_premium_used = 0,
    billing_cycle_start = NOW()
  WHERE 
    subscription_tier = 'pro'
    AND subscription_status = 'active'
    AND (
      billing_cycle_start IS NULL 
      OR billing_cycle_start + INTERVAL '1 month' <= NOW()
    );
END;
$$;

COMMENT ON FUNCTION reset_monthly_usage IS 'Resets monthly usage counters and handles premium rollover for Pro users';

-- Create function to check if user can generate a plan
CREATE OR REPLACE FUNCTION can_generate_plan(
  p_user_id UUID,
  p_model TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_model_cost DECIMAL(10,4);
  v_model_tier TEXT;
  v_result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'User not found'
    );
  END IF;

  -- Determine model cost and tier
  CASE p_model
    WHEN 'gemini-flash' THEN
      v_model_cost := 0.15;
      v_model_tier := 'economy';
    WHEN 'gpt-4o-mini' THEN
      v_model_cost := 0.20;
      v_model_tier := 'economy';
    WHEN 'claude-haiku' THEN
      v_model_cost := 0.30;
      v_model_tier := 'premium';
    WHEN 'gpt-4o' THEN
      v_model_cost := 0.50;
      v_model_tier := 'premium';
    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Invalid model'
      );
  END CASE;

  -- Check based on subscription tier
  CASE v_profile.subscription_tier
    WHEN 'free' THEN
      -- Free tier: max 2 plans, only economy models
      IF v_profile.plans_created_count >= 2 THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Free tier limit reached (2 plans)',
          'needs_upgrade', true
        );
      END IF;
      
      IF v_model_tier = 'premium' THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Premium models not available on free tier',
          'needs_upgrade', true
        );
      END IF;
      
      RETURN jsonb_build_object('allowed', true);

    WHEN 'payg' THEN
      -- PAYG: check credit balance
      IF v_profile.credits_balance < v_model_cost THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', format('Insufficient credits (€%.2f needed, €%.2f available)', v_model_cost, v_profile.credits_balance),
          'needs_topup', true,
          'required_amount', v_model_cost
        );
      END IF;
      
      RETURN jsonb_build_object(
        'allowed', true,
        'cost', v_model_cost,
        'new_balance', v_profile.credits_balance - v_model_cost
      );

    WHEN 'pro' THEN
      -- Pro: check monthly limits
      IF v_model_tier = 'economy' THEN
        -- Economy models: unlimited after 100 monthly
        IF v_profile.monthly_economy_used >= 100 THEN
          RETURN jsonb_build_object(
            'allowed', true,
            'unlimited_mode', true,
            'message', 'Using unlimited economy model'
          );
        END IF;
        
        RETURN jsonb_build_object('allowed', true);
      ELSE
        -- Premium models: check limit (20 + rollover)
        IF v_profile.monthly_premium_used >= (20 + COALESCE(v_profile.premium_rollover, 0)) THEN
          -- Check if they have PAYG credits
          IF v_profile.credits_balance >= 0.20 THEN
            RETURN jsonb_build_object(
              'allowed', true,
              'using_credits', true,
              'cost', 0.20,
              'message', 'Monthly premium limit reached, using credits (€0.20)'
            );
          ELSE
            RETURN jsonb_build_object(
              'allowed', false,
              'reason', 'Monthly premium limit reached. Switch to economy model or add credits.',
              'needs_topup', true
            );
          END IF;
        END IF;
        
        RETURN jsonb_build_object('allowed', true);
      END IF;

    ELSE
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Invalid subscription tier'
      );
  END CASE;
END;
$$;

COMMENT ON FUNCTION can_generate_plan IS 'Checks if user is allowed to generate a plan with specified model';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier_status ON profiles(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_cycle ON profiles(billing_cycle_start) WHERE subscription_tier = 'pro';
CREATE INDEX IF NOT EXISTS idx_itineraries_ai_model ON itineraries(ai_model_used) WHERE ai_model_used IS NOT NULL;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ai_usage_logs TO authenticated;
GRANT INSERT ON ai_usage_logs TO service_role;
GRANT SELECT ON rate_limits TO authenticated;
GRANT ALL ON rate_limits TO service_role;

