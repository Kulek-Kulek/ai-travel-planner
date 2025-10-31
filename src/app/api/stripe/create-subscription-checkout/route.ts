/**
 * API Route: Create Stripe Checkout Session for Pro Subscription
 * POST /api/stripe/create-subscription-checkout
 */

import { NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, CHECKOUT_CONFIG } from '@/lib/stripe/config';
import { getOrCreateStripeCustomer } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: CHECKOUT_CONFIG.mode.subscription,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.proSubscription.priceId,
          quantity: 1,
        },
      ],
      success_url: CHECKOUT_CONFIG.successUrl,
      cancel_url: CHECKOUT_CONFIG.cancelUrl,
      metadata: {
        user_id: user.id,
        subscription_tier: 'pro',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

