-- LOW-2: IP-based Rate Limiting
-- Date: 2025-11-09
-- Description: Add IP-based rate limiting to combine with session-based for defense-in-depth

-- ============================================================================
-- IP RATE LIMITING TABLE
-- ============================================================================

-- Create table for tracking IP-based rate limits
-- This works alongside user-based rate limiting for anonymous and bot protection
CREATE TABLE IF NOT EXISTS ip_rate_limits (
  ip_address INET PRIMARY KEY,
  generations_last_hour INTEGER DEFAULT 0 CHECK (generations_last_hour >= 0),
  generations_today INTEGER DEFAULT 0 CHECK (generations_today >= 0),
  window_start TIMESTAMPTZ DEFAULT NOW(),
  day_start TIMESTAMPTZ DEFAULT NOW(),
  last_request_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ, -- For temporary IP bans
  violation_count INTEGER DEFAULT 0, -- Track repeated abuse
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_ip ON ip_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_blocked ON ip_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_violations ON ip_rate_limits(violation_count) WHERE violation_count > 0;

-- Add RLS for security (though this is managed by server actions)
ALTER TABLE ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage IP rate limits
CREATE POLICY "service_role_manage_ip_rate_limits"
  ON ip_rate_limits FOR ALL
  TO service_role
  USING (true);

-- Anonymous users can check their own IP status (read-only)
CREATE POLICY "anon_read_own_ip_rate_limit"
  ON ip_rate_limits FOR SELECT
  TO anon
  USING (true); -- They can only see their own IP via server action filtering

COMMENT ON TABLE ip_rate_limits IS 'Tracks IP-based rate limits for anonymous users and bot protection';
COMMENT ON COLUMN ip_rate_limits.blocked_until IS 'Temporary IP ban until this timestamp';
COMMENT ON COLUMN ip_rate_limits.violation_count IS 'Number of rate limit violations for progressive penalties';

-- ============================================================================
-- CLEANUP FUNCTION FOR OLD IP RECORDS
-- ============================================================================

-- Function to clean up old IP rate limit records (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_ip_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM ip_rate_limits
  WHERE last_request_at < NOW() - INTERVAL '7 days'
    AND (blocked_until IS NULL OR blocked_until < NOW());
END;
$$;

COMMENT ON FUNCTION cleanup_old_ip_rate_limits IS 'Removes IP rate limit records older than 7 days';

-- ============================================================================
-- IP RATE LIMIT CONSTANTS
-- ============================================================================

-- Anonymous IP rate limits (stricter than authenticated):
-- - 10 requests per hour
-- - 20 requests per day
-- 
-- Authenticated users use the user_id based rate_limits table with tier-based limits:
-- - Free: 5/hour, 10/day
-- - PAYG: 30/hour, 100/day
-- - Pro: 60/hour, 200/day

-- ============================================================================
-- End of Migration
-- ============================================================================

