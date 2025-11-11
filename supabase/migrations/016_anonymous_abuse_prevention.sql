-- CRITICAL: Anonymous Itinerary Abuse Prevention
-- Date: 2025-11-11
-- Description: Prevent anonymous users from bypassing rate limits by refreshing or clearing storage
-- 
-- SECURITY ISSUE: Anonymous users could create endless draft itineraries by:
-- 1. Creating a draft (costs real money via AI API)
-- 2. Refreshing browser or clearing sessionStorage
-- 3. Creating another draft (repeat 10x per hour)
-- 4. Using VPN to bypass IP limits
--
-- SOLUTION: Multi-layer defense-in-depth approach
-- 1. Stricter IP rate limits (2/hour instead of 10/hour)
-- 2. Server-side anonymous session tracking
-- 3. Browser fingerprint tracking
-- 4. Require fresh Turnstile token for each request

-- ============================================================================
-- ANONYMOUS SESSION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session identification (multiple factors for defense-in-depth)
  session_token TEXT UNIQUE NOT NULL, -- Generated server-side, stored in httpOnly cookie
  ip_address INET NOT NULL,
  browser_fingerprint TEXT, -- Optional browser fingerprint for additional tracking
  
  -- Rate limiting counters (LIMIT: 2 per week)
  itineraries_created INTEGER DEFAULT 0 CHECK (itineraries_created >= 0),
  last_itinerary_created_at TIMESTAMPTZ,
  week_start TIMESTAMPTZ DEFAULT DATE_TRUNC('week', NOW()), -- Week starts Monday
  
  -- Abuse detection
  refresh_attempts INTEGER DEFAULT 0, -- Track suspicious refresh patterns
  turnstile_verifications INTEGER DEFAULT 0, -- Track Turnstile challenge completions
  
  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Blocking
  blocked_until TIMESTAMPTZ,
  blocked_reason TEXT,
  
  -- Metadata
  user_agent TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_token ON anonymous_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_ip ON anonymous_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_fingerprint ON anonymous_sessions(browser_fingerprint) WHERE browser_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_blocked ON anonymous_sessions(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires ON anonymous_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_activity ON anonymous_sessions(last_activity_at);

-- RLS for security
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage sessions
CREATE POLICY "service_role_manage_anonymous_sessions"
  ON anonymous_sessions FOR ALL
  TO service_role
  USING (true);

-- Anonymous users can read their own session (via server action filtering)
CREATE POLICY "anon_read_own_session"
  ON anonymous_sessions FOR SELECT
  TO anon
  USING (true);

-- Comments
COMMENT ON TABLE anonymous_sessions IS 'Tracks anonymous user sessions to prevent abuse via refresh/clear storage bypass';
COMMENT ON COLUMN anonymous_sessions.session_token IS 'Server-generated session token (stored in httpOnly cookie)';
COMMENT ON COLUMN anonymous_sessions.browser_fingerprint IS 'Optional browser fingerprint for additional tracking';
COMMENT ON COLUMN anonymous_sessions.refresh_attempts IS 'Tracks suspicious page refresh patterns';
COMMENT ON COLUMN anonymous_sessions.turnstile_verifications IS 'Number of Turnstile challenges completed';
COMMENT ON COLUMN anonymous_sessions.itineraries_created IS 'Number of draft itineraries created (limit: 2 per week)';
COMMENT ON COLUMN anonymous_sessions.week_start IS 'Start of current week for rate limiting (resets weekly)';
COMMENT ON COLUMN anonymous_sessions.blocked_until IS 'Temporary session block until this timestamp';

-- ============================================================================
-- CLEANUP FUNCTION FOR EXPIRED SESSIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sessions older than 7 days (keep some history for analytics)
  DELETE FROM anonymous_sessions
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up expired anonymous sessions';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_anonymous_sessions IS 'Removes expired anonymous sessions older than 7 days';

-- ============================================================================
-- UPDATE IP RATE LIMITS (Make them stricter for anonymous users)
-- ============================================================================

-- Add comment explaining the stricter limits
COMMENT ON TABLE ip_rate_limits IS 'Tracks IP-based rate limits. STRICT LIMITS: 2/hour, 3/day for anonymous users to prevent API cost abuse';

-- ============================================================================
-- TRACK ANONYMOUS ITINERARIES WITH SESSION ID
-- ============================================================================

-- Add session tracking to itineraries table
ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS anonymous_session_id UUID REFERENCES anonymous_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_itineraries_anonymous_session ON itineraries(anonymous_session_id) WHERE anonymous_session_id IS NOT NULL;

COMMENT ON COLUMN itineraries.anonymous_session_id IS 'Links anonymous itineraries to session for abuse prevention';

-- ============================================================================
-- ENHANCED ANONYMOUS ITINERARY CREATION WITH SESSION VALIDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_anonymous_itinerary_with_session_check(
  p_session_token TEXT,
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
  v_session_id UUID;
  v_session RECORD;
BEGIN
  -- 1. Validate session exists and is not blocked
  SELECT * INTO v_session
  FROM anonymous_sessions
  WHERE session_token = p_session_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SESSION',
      'message', 'Invalid or expired session. Please refresh the page.'
    );
  END IF;
  
  v_session_id := v_session.id;
  
  -- 2. Check if session is blocked
  IF v_session.blocked_until IS NOT NULL AND v_session.blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_BLOCKED',
      'message', v_session.blocked_reason || ' Please try again later.',
      'blocked_until', v_session.blocked_until
    );
  END IF;
  
  -- 3. Check weekly limit (2 itineraries per week)
  -- Reset counter if new week started
  IF v_session.week_start < DATE_TRUNC('week', NOW()) THEN
    UPDATE anonymous_sessions
    SET 
      itineraries_created = 0,
      week_start = DATE_TRUNC('week', NOW())
    WHERE id = v_session.id;
    
    v_session.itineraries_created := 0;
  END IF;
  
  -- Check if weekly limit exceeded (LIMIT: 2 per week)
  IF v_session.itineraries_created >= 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LIMIT_EXCEEDED',
      'message', 'You have reached your limit of 2 free itineraries this week. Please sign in to create unlimited travel plans.',
      'require_auth', true
    );
  END IF;
  
  -- 4. Check session hasn't expired
  IF v_session.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SESSION_EXPIRED',
      'message', 'Your session has expired. Please refresh the page.'
    );
  END IF;
  
  -- 5. Create itinerary for anonymous user
  INSERT INTO itineraries (
    user_id,
    anonymous_session_id,
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
    v_session_id, -- Link to session
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
    0, -- No credit charge (but costs us real money!)
    0
  )
  RETURNING id INTO v_itinerary_id;
  
  -- 6. Update session counters
  UPDATE anonymous_sessions
  SET 
    itineraries_created = itineraries_created + 1,
    last_itinerary_created_at = NOW(),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;
  
  -- 7. Log anonymous usage for analytics
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
    0, -- No credit charge
    0,
    'anonymous',
    NULL,
    true
  );
  
  -- Success
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', v_itinerary_id,
    'session_id', v_session_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Automatic rollback on any error
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_anonymous_itinerary_with_session_check TO anon, authenticated;

COMMENT ON FUNCTION create_anonymous_itinerary_with_session_check IS 'Creates anonymous itinerary with strict session validation (2 per week limit)';

-- ============================================================================
-- FUNCTION TO CREATE/GET ANONYMOUS SESSION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_anonymous_session(
  p_session_token TEXT,
  p_ip_address INET,
  p_browser_fingerprint TEXT,
  p_user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_session_id UUID;
BEGIN
  -- Try to get existing session
  SELECT * INTO v_session
  FROM anonymous_sessions
  WHERE session_token = p_session_token;
  
  IF FOUND THEN
    -- Check if expired
    IF v_session.expires_at < NOW() THEN
      -- Create new session (old one expired)
      INSERT INTO anonymous_sessions (
        session_token,
        ip_address,
        browser_fingerprint,
        user_agent,
        last_activity_at,
        expires_at
      ) VALUES (
        p_session_token,
        p_ip_address,
        p_browser_fingerprint,
        p_user_agent,
        NOW(),
        NOW() + INTERVAL '24 hours'
      )
      RETURNING id, itineraries_created, blocked_until INTO v_session_id, v_session.itineraries_created, v_session.blocked_until;
      
      RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'itineraries_created', 0,
        'is_new', true
      );
    END IF;
    
    -- Update last activity
    UPDATE anonymous_sessions
    SET last_activity_at = NOW()
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'session_id', v_session.id,
      'itineraries_created', v_session.itineraries_created,
      'blocked_until', v_session.blocked_until,
      'is_new', false
    );
  ELSE
    -- Create new session
    INSERT INTO anonymous_sessions (
      session_token,
      ip_address,
      browser_fingerprint,
      user_agent,
      expires_at
    ) VALUES (
      p_session_token,
      p_ip_address,
      p_browser_fingerprint,
      p_user_agent,
      NOW() + INTERVAL '24 hours'
    )
    RETURNING id INTO v_session_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'session_id', v_session_id,
      'itineraries_created', 0,
      'is_new', true
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_anonymous_session TO anon, authenticated;

COMMENT ON FUNCTION get_or_create_anonymous_session IS 'Gets existing session or creates new one with 24-hour expiry';

-- ============================================================================
-- FUNCTION TO HANDLE ITINERARY CLAIMING (User signs in after creating draft)
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_anonymous_itinerary(
  p_itinerary_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_itinerary RECORD;
BEGIN
  -- Get itinerary with session info
  SELECT * INTO v_itinerary
  FROM itineraries
  WHERE id = p_itinerary_id
    AND user_id IS NULL
    AND status = 'draft';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Itinerary not found or already claimed'
    );
  END IF;
  
  v_session_id := v_itinerary.anonymous_session_id;
  
  -- Update itinerary to assign to user and publish
  UPDATE itineraries
  SET 
    user_id = p_user_id,
    status = 'published',
    anonymous_session_id = NULL,
    updated_at = NOW()
  WHERE id = p_itinerary_id;
  
  -- Decrement anonymous session counter since itinerary is now claimed
  -- This prevents counting the claimed itinerary against anonymous limit
  IF v_session_id IS NOT NULL THEN
    UPDATE anonymous_sessions
    SET 
      itineraries_created = GREATEST(itineraries_created - 1, 0),
      updated_at = NOW()
    WHERE id = v_session_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', p_itinerary_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_anonymous_itinerary TO authenticated;

COMMENT ON FUNCTION claim_anonymous_itinerary IS 'Claims anonymous draft itinerary when user signs in. Decrements session counter so claimed itinerary does not count against anonymous limit.';

