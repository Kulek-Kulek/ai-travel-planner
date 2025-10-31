/**
 * Stripe Utility Functions
 * Helper functions for Stripe operations
 */

import { stripe } from './config';
import { createClient } from '@/lib/supabase/server';

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = await createClient();

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Store customer ID in database
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

/**
 * Update user subscription tier in database
 */
export async function updateUserSubscription(
  userId: string,
  tier: 'free' | 'payg' | 'pro',
  status: 'active' | 'canceled' | 'expired' | 'trial',
  subscriptionId?: string,
  endDate?: Date
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    subscription_tier: tier,
    subscription_status: status,
  };

  if (subscriptionId !== undefined) {
    updates.stripe_subscription_id = subscriptionId;
  }

  if (endDate !== undefined) {
    updates.subscription_end_date = endDate.toISOString();
  }

  // Initialize billing cycle for Pro tier
  if (tier === 'pro' && status === 'active') {
    updates.billing_cycle_start = new Date().toISOString();
    updates.monthly_economy_used = 0;
    updates.monthly_premium_used = 0;
  }

  await supabase.from('profiles').update(updates).eq('id', userId);
}

/**
 * Add credits to user account
 */
export async function addCreditsToUser(userId: string, amount: number) {
  const supabase = await createClient();

  // Get current balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  const currentBalance = profile?.credits_balance || 0;
  const newBalance = Number(currentBalance) + amount;

  // Update balance
  await supabase
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', userId);

  // Update to PAYG tier if currently free
  if (profile) {
    await supabase
      .from('profiles')
      .update({ subscription_tier: 'payg' })
      .eq('id', userId)
      .eq('subscription_tier', 'free');
  }
}

/**
 * Log Stripe transaction
 */
export async function logStripeTransaction(data: {
  userId: string;
  paymentIntentId?: string;
  sessionId?: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'credit_purchase' | 'refund';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  await supabase.from('stripe_transactions').insert({
    user_id: data.userId,
    stripe_payment_intent_id: data.paymentIntentId,
    stripe_session_id: data.sessionId,
    amount: data.amount,
    currency: data.currency,
    transaction_type: data.type,
    status: data.status,
    metadata: data.metadata,
  });
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(
  customerId: string
): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  return data;
}

/**
 * Get user by Stripe subscription ID
 */
export async function getUserByStripeSubscriptionId(
  subscriptionId: string
): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  return data;
}

