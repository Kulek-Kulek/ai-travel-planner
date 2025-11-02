-- Migration: Enable RLS on deleted_users table
-- Purpose: Secure the deleted_users audit table so only admins can access it
-- Issue: Table was public without RLS, exposing sensitive deleted user data

-- ============================================================
-- Enable Row Level Security
-- ============================================================

ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE deleted_users IS 'Audit trail of deleted users (admin access only). RLS enabled to protect sensitive data.';

-- ============================================================
-- Create RLS Policies
-- ============================================================

-- Policy 1: Only admins can SELECT from deleted_users
-- This allows admins to view the audit trail for analytics and support
CREATE POLICY "Admins can view deleted users"
  ON public.deleted_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy 2: Only admins can DELETE old records (for data retention compliance)
-- This allows admins to clean up old audit records if needed
CREATE POLICY "Admins can delete old deleted user records"
  ON public.deleted_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Note: We do NOT create INSERT/UPDATE policies for regular users
-- The archive_deleted_user() function uses SECURITY DEFINER which bypasses RLS
-- Service role also bypasses RLS for automated operations

-- ============================================================
-- Revoke public access
-- ============================================================

-- Remove any default grants that might exist
REVOKE ALL ON public.deleted_users FROM PUBLIC;
REVOKE ALL ON public.deleted_users FROM anon;

-- ============================================================
-- Add indexes for performance
-- ============================================================

-- Index on deleted_at for time-based queries (analytics, cleanup)
CREATE INDEX IF NOT EXISTS deleted_users_deleted_at_idx 
  ON public.deleted_users(deleted_at DESC);

-- Index on subscription_tier for analytics
CREATE INDEX IF NOT EXISTS deleted_users_subscription_tier_idx 
  ON public.deleted_users(subscription_tier);

COMMENT ON INDEX deleted_users_deleted_at_idx IS 'Optimize queries filtering by deletion date';
COMMENT ON INDEX deleted_users_subscription_tier_idx IS 'Optimize analytics queries by subscription tier';

-- ============================================================
-- Verification query (for testing)
-- ============================================================

-- To verify RLS is working:
-- 1. As admin: SELECT * FROM deleted_users; (should work)
-- 2. As regular user: SELECT * FROM deleted_users; (should return empty)
-- 3. Check enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'deleted_users';

