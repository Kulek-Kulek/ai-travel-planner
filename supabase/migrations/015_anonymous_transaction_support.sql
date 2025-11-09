-- Add transaction support for anonymous users
-- This ensures atomic operations and consistent behavior across auth states

-- First, make user_id nullable in ai_usage_logs to support anonymous tracking
ALTER TABLE ai_usage_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment explaining why user_id can be null
COMMENT ON COLUMN ai_usage_logs.user_id IS 'User ID - NULL for anonymous users';

-- Create transaction function for anonymous itinerary creation
CREATE OR REPLACE FUNCTION create_anonymous_itinerary_with_transaction(
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
  p_model_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_itinerary_id UUID;
BEGIN
  -- Create itinerary for anonymous user
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
    NULL, -- Anonymous user
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
    false, -- Not private (anonymous itineraries are public drafts)
    p_image_url,
    p_image_photographer,
    p_image_photographer_url,
    'draft', -- Anonymous itineraries start as drafts
    p_model_key,
    0, -- No cost for anonymous users
    0
  )
  RETURNING id INTO v_itinerary_id;
  
  -- Log anonymous usage for analytics (optional)
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
    NULL, -- Anonymous
    v_itinerary_id,
    p_model_key,
    'create',
    0, -- Free for anonymous
    0,
    'anonymous',
    NULL, -- No credits deducted
    true
  );
  
  -- Success
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', v_itinerary_id
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

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION create_anonymous_itinerary_with_transaction TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION create_anonymous_itinerary_with_transaction IS 'Atomically creates an itinerary for anonymous users. Logs usage for analytics.';

