-- Security Fixes Migration
-- Date: 2025-01-07
-- Description: Implements atomic operations and security improvements

-- ============================================================================
-- CRIT-1: Race Condition Fix - Atomic Like Increment
-- ============================================================================

-- Create atomic increment function for likes
CREATE OR REPLACE FUNCTION increment_likes(itinerary_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_likes integer;
BEGIN
  UPDATE itineraries
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = itinerary_id
  RETURNING likes INTO new_likes;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Itinerary not found';
  END IF;
  
  RETURN new_likes;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_likes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes TO anon;

-- ============================================================================
-- CRIT-2: Credit Deduction Race Condition - Atomic Deduction
-- ============================================================================

-- Create atomic credit deduction function
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id uuid,
  p_cost numeric,
  p_plan_id uuid,
  p_model text,
  p_operation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_new_balance numeric;
  v_tier text;
BEGIN
  -- Lock the row for update (prevents concurrent modifications)
  SELECT 
    subscription_tier,
    credits_balance,
    monthly_economy_used,
    monthly_premium_used,
    premium_rollover,
    plans_created_count
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  
  -- Handle PAYG tier
  IF v_tier = 'payg' THEN
    v_new_balance := COALESCE(v_profile.credits_balance, 0) - p_cost;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Insufficient credits'
      );
    END IF;
    
    -- Atomic update
    UPDATE profiles
    SET 
      credits_balance = v_new_balance,
      last_generation_at = NOW()
    WHERE id = p_user_id;
    
  -- Handle Pro tier
  ELSIF v_tier = 'pro' THEN
    -- Check if it's economy or premium model
    IF p_model IN ('gemini-flash', 'gpt-4o-mini') THEN
      -- Economy model - unlimited
      UPDATE profiles
      SET 
        monthly_economy_used = COALESCE(monthly_economy_used, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    ELSE
      -- Premium model - check limits
      IF COALESCE(v_profile.monthly_premium_used, 0) >= (20 + COALESCE(v_profile.premium_rollover, 0)) THEN
        -- Use credits instead
        v_new_balance := COALESCE(v_profile.credits_balance, 0) - 0.2;
        
        IF v_new_balance < 0 THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits for premium model'
          );
        END IF;
        
        UPDATE profiles
        SET 
          credits_balance = v_new_balance,
          last_generation_at = NOW()
        WHERE id = p_user_id;
      ELSE
        UPDATE profiles
        SET 
          monthly_premium_used = COALESCE(monthly_premium_used, 0) + 1,
          last_generation_at = NOW()
        WHERE id = p_user_id;
      END IF;
    END IF;
    
  -- Handle Free tier
  ELSIF v_tier = 'free' THEN
    IF p_operation = 'create' THEN
      UPDATE profiles
      SET 
        plans_created_count = COALESCE(plans_created_count, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;
  
  -- Update itinerary record
  IF p_operation IN ('edit', 'regenerate') THEN
    UPDATE itineraries
    SET 
      ai_model_used = p_model,
      generation_cost = p_cost,
      edit_count = COALESCE(edit_count, 0) + 1
    WHERE id = p_plan_id;
  ELSE
    UPDATE itineraries
    SET 
      ai_model_used = p_model,
      generation_cost = p_cost,
      edit_count = 0
    WHERE id = p_plan_id;
  END IF;
  
  -- Log usage
  INSERT INTO ai_usage_logs (
    user_id,
    plan_id,
    ai_model,
    operation,
    estimated_cost,
    actual_cost,
    subscription_tier,
    credits_deducted,
    success
  ) VALUES (
    p_user_id,
    p_plan_id,
    p_model,
    p_operation,
    p_cost,
    p_cost,
    v_tier,
    CASE WHEN v_new_balance IS NOT NULL THEN p_cost ELSE NULL END,
    true
  );
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits_atomic TO authenticated;

-- ============================================================================
-- CRIT-5: Webhook Replay Protection - Idempotency Table
-- ============================================================================

-- Create table for tracking processed webhook events
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT NOW(),
  api_version text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  
  -- Add constraint for uniqueness
  CONSTRAINT processed_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_stripe_event_id 
  ON processed_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_type 
  ON processed_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at 
  ON processed_webhook_events(processed_at DESC);

-- Add RLS policies (webhooks use service role, but good practice)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert/select
CREATE POLICY "service_role_all_access"
  ON processed_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create cleanup function for old events (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$;

-- ============================================================================
-- End of Migration
-- ============================================================================

