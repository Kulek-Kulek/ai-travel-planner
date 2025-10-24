-- Migration: Add subscription tier system
-- Purpose: Enable paid plans with different AI model access

-- Add subscription_tier column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise'));

-- Add subscription_status column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'expired', 'trial'));

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Update RLS policies to allow users to read their own tier
-- (The existing policy should already cover this, but let's be explicit)

-- Add comment
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free, basic, premium, or enterprise';
COMMENT ON COLUMN profiles.subscription_status IS 'Subscription status: active, canceled, expired, or trial';

-- Optional: Create subscription_history table for tracking changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  changed_from TEXT,
  stripe_subscription_id TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for subscription_history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription history
CREATE POLICY "users_read_own_subscription_history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert/update subscription history
CREATE POLICY "service_role_manage_subscription_history"
  ON subscription_history FOR ALL
  TO service_role
  USING (true);

-- Create index on subscription_history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- Add comment
COMMENT ON TABLE subscription_history IS 'Tracks subscription tier changes for auditing';

