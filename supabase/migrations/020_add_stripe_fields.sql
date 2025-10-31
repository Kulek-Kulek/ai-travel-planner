-- Migration: Add Stripe integration fields
-- Purpose: Store Stripe customer and subscription IDs for payment management

-- Add Stripe-related columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment management';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for Pro tier';
COMMENT ON COLUMN profiles.subscription_end_date IS 'End date of current subscription period';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- Add Stripe transaction log for audit trail
CREATE TABLE IF NOT EXISTS stripe_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'eur',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'credit_purchase', 'refund')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for stripe_transactions
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "users_read_own_transactions"
  ON stripe_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can manage transactions
CREATE POLICY "service_role_manage_transactions"
  ON stripe_transactions FOR ALL
  TO service_role
  USING (true);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_user_id ON stripe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_payment_intent ON stripe_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_created_at ON stripe_transactions(created_at DESC);

COMMENT ON TABLE stripe_transactions IS 'Audit log for all Stripe payment transactions';

