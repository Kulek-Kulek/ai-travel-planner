/**
 * API Route: Create Stripe Checkout Session for PAYG Credits
 * POST /api/stripe/create-credits-checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, CHECKOUT_CONFIG } from '@/lib/stripe/config';
import { getOrCreateStripeCustomer } from '@/lib/stripe/utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { amount } = body;

    // Validate amount
    if (!amount || !['2', '5', '10', '20'].includes(amount.toString())) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const creditPack = STRIPE_CONFIG.creditPacks[amount as keyof typeof STRIPE_CONFIG.creditPacks];

    if (!creditPack) {
      return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: CHECKOUT_CONFIG.mode.payment,
      payment_method_types: ['card'],
      line_items: [
        {
          price: creditPack.priceId,
          quantity: 1,
        },
      ],
      success_url: CHECKOUT_CONFIG.successUrl,
      cancel_url: CHECKOUT_CONFIG.cancelUrl,
      metadata: {
        user_id: user.id,
        transaction_type: 'credit_purchase',
        credits_amount: creditPack.credits.toString(),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating credits checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

