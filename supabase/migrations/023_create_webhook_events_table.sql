-- Migration: Create processed_webhook_events table
-- Purpose: Track processed Stripe webhook events for idempotency
-- Date: 2025-11-10
-- Priority: CRITICAL - Required for webhook idempotency protection

-- ============================================================================
-- PROCESSED WEBHOOK EVENTS TABLE
-- ============================================================================

-- Create table for tracking processed Stripe webhook events
-- This prevents duplicate processing if Stripe retries a webhook
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  api_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_stripe_id 
  ON processed_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at 
  ON processed_webhook_events(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_type 
  ON processed_webhook_events(event_type);

-- Add RLS (though this table is managed by service role only)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage webhook events
CREATE POLICY "service_role_manage_webhook_events"
  ON processed_webhook_events FOR ALL
  TO service_role
  USING (true);

-- Admin users can read webhook events for debugging
CREATE POLICY "admin_read_webhook_events"
  ON processed_webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE processed_webhook_events IS 
  'Tracks processed Stripe webhook events to prevent duplicate processing. Critical for payment idempotency.';

COMMENT ON COLUMN processed_webhook_events.stripe_event_id IS 
  'Unique Stripe event ID (e.g., evt_1234567890)';

COMMENT ON COLUMN processed_webhook_events.event_type IS 
  'Stripe event type (e.g., checkout.session.completed, invoice.payment_succeeded)';

COMMENT ON COLUMN processed_webhook_events.processed_at IS 
  'Timestamp when this event was successfully processed';

-- ============================================================================
-- CLEANUP FUNCTION FOR OLD WEBHOOK EVENTS
-- ============================================================================

-- Function to clean up old webhook event records (keep last 90 days)
-- Stripe recommends keeping webhook logs for audit purposes
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up webhook events older than 90 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_webhook_events IS 
  'Removes processed webhook event records older than 90 days for maintenance';

-- ============================================================================
-- OPTIONAL: Schedule automatic cleanup (if using pg_cron extension)
-- ============================================================================

-- Note: Uncomment this if you have pg_cron extension enabled
-- This will run cleanup on the 1st of every month at 3 AM
--
-- SELECT cron.schedule(
--   'cleanup-old-webhook-events',
--   '0 3 1 * *',
--   $$SELECT cleanup_old_webhook_events()$$
-- );

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- To verify the table was created correctly:
-- SELECT * FROM processed_webhook_events LIMIT 10;

-- To check for duplicate event processing:
-- SELECT stripe_event_id, COUNT(*) as count 
-- FROM processed_webhook_events 
-- GROUP BY stripe_event_id 
-- HAVING COUNT(*) > 1;

-- To see recent webhook activity:
-- SELECT event_type, COUNT(*) as count, MAX(processed_at) as last_processed
-- FROM processed_webhook_events
-- WHERE processed_at > NOW() - INTERVAL '7 days'
-- GROUP BY event_type
-- ORDER BY count DESC;

-- ============================================================================
-- End of Migration
-- ============================================================================


