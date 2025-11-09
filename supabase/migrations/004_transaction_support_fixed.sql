-- HIGH-1: Transaction Support for Multi-Step Operations
-- Creates atomic transaction functions for AI generation flow
-- Prevents inconsistent state if any step fails

-- First, drop any existing versions of these functions
DROP FUNCTION IF EXISTS create_itinerary_with_transaction CASCADE;
DROP FUNCTION IF EXISTS update_itinerary_with_transaction CASCADE;

-- Create comprehensive transaction function for AI generation
-- This ensures atomicity: either everything succeeds or everything rolls back
CREATE OR REPLACE FUNCTION create_itinerary_with_transaction(
  p_user_id UUID,
  p_destination TEXT,
  p_days INTEGER,
  p_travelers INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_children INTEGER,
  p_child_ages INTEGER[],
  p_has_accessibility_needs BOOLEAN,
  p_notes TEXT,
  p_ai_plan JSONB,
  p_tags TEXT[],
  p_is_private BOOLEAN,
  p_image_url TEXT,
  p_image_photographer TEXT,
  p_image_photographer_url TEXT,
  p_status TEXT,
  p_model_key TEXT,
  p_model_cost NUMERIC,
  p_operation TEXT DEFAULT 'create'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_itinerary_id UUID;
  v_profile RECORD;
  v_new_balance NUMERIC;
  v_tier TEXT;
  v_deduction_result JSONB;
BEGIN
  -- Start implicit transaction (function is atomic by default)
  
  -- 1. Lock user profile to prevent race conditions
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Profile not found'
    );
  END IF;
  
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  
  -- 2. Check and deduct credits based on tier (if needed)
  IF v_tier = 'payg' THEN
    v_new_balance := COALESCE(v_profile.credits_balance, 0) - p_model_cost;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient credits'
      );
    END IF;
    
    -- Atomic credit deduction
    UPDATE profiles
    SET 
      credits_balance = v_new_balance,
      last_generation_at = NOW()
    WHERE id = p_user_id;
    
  ELSIF v_tier = 'pro' THEN
    -- Handle Pro tier model usage
    IF p_model_key IN ('gemini-flash', 'gpt-4o-mini') THEN
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
    
  ELSIF v_tier = 'free' THEN
    -- Free tier - just increment counter for creates
    IF p_operation = 'create' THEN
      UPDATE profiles
      SET 
        plans_created_count = COALESCE(plans_created_count, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;
  
  -- 3. Create itinerary
  INSERT INTO itineraries (
    user_id,
    destination,
    days,
    travelers,
    start_date,
    end_date,
    children,
    child_ages,
    has_accessibility_needs,
    notes,
    ai_plan,
    tags,
    is_private,
    image_url,
    image_photographer,
    image_photographer_url,
    status,
    ai_model_used,
    generation_cost,
    edit_count
  ) VALUES (
    p_user_id,
    p_destination,
    p_days,
    p_travelers,
    p_start_date,
    p_end_date,
    p_children,
    p_child_ages,
    p_has_accessibility_needs,
    p_notes,
    p_ai_plan,
    p_tags,
    p_is_private,
    p_image_url,
    p_image_photographer,
    p_image_photographer_url,
    p_status,
    p_model_key,
    p_model_cost,
    0
  )
  RETURNING id INTO v_itinerary_id;
  
  -- 4. Log usage
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
    v_itinerary_id,
    p_model_key,
    p_operation,
    p_model_cost,
    p_model_cost,
    v_tier,
    CASE WHEN v_new_balance IS NOT NULL THEN p_model_cost ELSE NULL END,
    true
  );
  
  -- All steps succeeded, transaction will commit
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', v_itinerary_id,
    'credits_deducted', CASE WHEN v_new_balance IS NOT NULL THEN p_model_cost ELSE 0 END,
    'new_balance', v_new_balance
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Automatic rollback on any error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION create_itinerary_with_transaction TO authenticated;

-- Create similar function for updating existing itineraries
CREATE OR REPLACE FUNCTION update_itinerary_with_transaction(
  p_user_id UUID,
  p_itinerary_id UUID,
  p_destination TEXT,
  p_days INTEGER,
  p_travelers INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_children INTEGER,
  p_child_ages INTEGER[],
  p_has_accessibility_needs BOOLEAN,
  p_notes TEXT,
  p_ai_plan JSONB,
  p_tags TEXT[],
  p_image_url TEXT,
  p_image_photographer TEXT,
  p_image_photographer_url TEXT,
  p_model_key TEXT,
  p_model_cost NUMERIC,
  p_operation TEXT DEFAULT 'edit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_itinerary RECORD;
  v_new_balance NUMERIC;
  v_tier TEXT;
BEGIN
  -- 1. Lock user profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- 2. Verify itinerary ownership
  SELECT * INTO v_itinerary
  FROM itineraries
  WHERE id = p_itinerary_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Itinerary not found or unauthorized');
  END IF;
  
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  
  -- 3. Deduct credits (same logic as create)
  IF v_tier = 'payg' THEN
    v_new_balance := COALESCE(v_profile.credits_balance, 0) - p_model_cost;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;
    
    UPDATE profiles
    SET 
      credits_balance = v_new_balance,
      last_generation_at = NOW()
    WHERE id = p_user_id;
    
  ELSIF v_tier = 'pro' THEN
    -- Handle Pro tier (similar to create)
    IF p_model_key IN ('gemini-flash', 'gpt-4o-mini') THEN
      UPDATE profiles
      SET 
        monthly_economy_used = COALESCE(monthly_economy_used, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    ELSE
      IF COALESCE(v_profile.monthly_premium_used, 0) >= (20 + COALESCE(v_profile.premium_rollover, 0)) THEN
        v_new_balance := COALESCE(v_profile.credits_balance, 0) - 0.2;
        
        IF v_new_balance < 0 THEN
          RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits for premium model');
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
  END IF;
  
  -- 4. Update itinerary
  UPDATE itineraries
  SET 
    destination = p_destination,
    days = p_days,
    travelers = p_travelers,
    start_date = p_start_date,
    end_date = p_end_date,
    children = p_children,
    child_ages = p_child_ages,
    has_accessibility_needs = p_has_accessibility_needs,
    notes = p_notes,
    ai_plan = p_ai_plan,
    tags = p_tags,
    image_url = p_image_url,
    image_photographer = p_image_photographer,
    image_photographer_url = p_image_photographer_url,
    ai_model_used = p_model_key,
    generation_cost = p_model_cost,
    edit_count = COALESCE(edit_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_itinerary_id;
  
  -- 5. Log usage
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
    p_itinerary_id,
    p_model_key,
    p_operation,
    p_model_cost,
    p_model_cost,
    v_tier,
    CASE WHEN v_new_balance IS NOT NULL THEN p_model_cost ELSE NULL END,
    true
  );
  
  -- Success
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', p_itinerary_id,
    'credits_deducted', CASE WHEN v_new_balance IS NOT NULL THEN p_model_cost ELSE 0 END,
    'new_balance', v_new_balance
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION update_itinerary_with_transaction TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_itinerary_with_transaction IS 'Atomically creates an itinerary and deducts credits. Ensures consistency - either everything succeeds or everything rolls back.';
COMMENT ON FUNCTION update_itinerary_with_transaction IS 'Atomically updates an itinerary and deducts credits. Verifies ownership and ensures transactional consistency.';

