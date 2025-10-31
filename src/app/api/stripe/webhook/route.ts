/**
 * API Route: Stripe Webhook Handler
 * POST /api/stripe/webhook
 * 
 * Handles Stripe webhook events for payments and subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config';
import {
  updateUserSubscription,
  addCreditsToUser,
  logStripeTransaction,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
} from '@/lib/stripe/utils';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Checkout session completed - one-time payment or subscription start
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // Payment succeeded
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      // Payment failed
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      // Invoice payment succeeded (for recurring subscriptions)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      // Invoice payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handler functions

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  
  if (!userId) {
    console.error('No user_id in session metadata');
    return;
  }

  // Handle subscription checkout
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await updateUserSubscription(
      userId,
      'pro',
      'active',
      subscriptionId,
      new Date(subscription.current_period_end * 1000)
    );

    await logStripeTransaction({
      userId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent as string,
      amount: session.amount_total! / 100,
      currency: session.currency!,
      type: 'subscription',
      status: 'succeeded',
      metadata: { subscription_id: subscriptionId },
    });
  }
  
  // Handle one-time payment (credits)
  else if (session.mode === 'payment') {
    const creditsAmount = parseFloat(session.metadata?.credits_amount || '0');
    
    if (creditsAmount > 0) {
      await addCreditsToUser(userId, creditsAmount);

      await logStripeTransaction({
        userId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string,
        amount: session.amount_total! / 100,
        currency: session.currency!,
        type: 'credit_purchase',
        status: 'succeeded',
        metadata: { credits_amount: creditsAmount },
      });
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    // Try to find user by customer ID
    const user = await getUserByStripeCustomerId(subscription.customer as string);
    if (!user) {
      console.error('User not found for subscription');
      return;
    }
    
    await updateUserSubscription(
      user.id,
      'pro',
      subscription.status === 'active' ? 'active' : 'canceled',
      subscription.id,
      new Date(subscription.current_period_end * 1000)
    );
  } else {
    await updateUserSubscription(
      userId,
      'pro',
      subscription.status === 'active' ? 'active' : 'canceled',
      subscription.id,
      new Date(subscription.current_period_end * 1000)
    );
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await getUserByStripeSubscriptionId(subscription.id);
  
  if (!user) {
    console.error('User not found for deleted subscription');
    return;
  }

  await updateUserSubscription(
    user.id,
    'free',
    'expired',
    null,
    new Date()
  );
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.user_id;
  
  if (!userId) {
    return;
  }

  // Log successful payment
  await logStripeTransaction({
    userId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    type: paymentIntent.metadata?.transaction_type as 'subscription' | 'credit_purchase' || 'credit_purchase',
    status: 'succeeded',
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.user_id;
  
  if (!userId) {
    return;
  }

  // Log failed payment
  await logStripeTransaction({
    userId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    type: paymentIntent.metadata?.transaction_type as 'subscription' | 'credit_purchase' || 'credit_purchase',
    status: 'failed',
    metadata: { error: paymentIntent.last_payment_error?.message },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  const user = await getUserByStripeSubscriptionId(subscription.id);
  
  if (!user) {
    return;
  }

  // Update subscription end date
  await updateUserSubscription(
    user.id,
    'pro',
    'active',
    subscription.id,
    new Date(subscription.current_period_end * 1000)
  );

  // Log transaction
  await logStripeTransaction({
    userId: user.id,
    paymentIntentId: invoice.payment_intent as string,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    type: 'subscription',
    status: 'succeeded',
    metadata: { invoice_id: invoice.id },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  const user = await getUserByStripeSubscriptionId(subscription.id);
  
  if (!user) {
    return;
  }

  // Log failed payment
  await logStripeTransaction({
    userId: user.id,
    paymentIntentId: invoice.payment_intent as string,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    type: 'subscription',
    status: 'failed',
    metadata: { invoice_id: invoice.id },
  });
}

