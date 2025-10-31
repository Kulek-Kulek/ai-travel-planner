/**
 * Stripe Configuration
 * Centralizes all Stripe-related configuration
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

// Stripe Product and Price IDs (set these in your environment variables)
export const STRIPE_CONFIG = {
  // Pro Subscription
  proSubscription: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    amount: 9.99,
    currency: 'eur',
    interval: 'month' as const,
  },
  
  // PAYG Credit Packs
  creditPacks: {
    '2': {
      priceId: process.env.STRIPE_CREDIT_2_PRICE_ID!,
      amount: 2,
      credits: 2,
    },
    '5': {
      priceId: process.env.STRIPE_CREDIT_5_PRICE_ID!,
      amount: 5,
      credits: 5,
    },
    '10': {
      priceId: process.env.STRIPE_CREDIT_10_PRICE_ID!,
      amount: 10,
      credits: 10,
    },
    '20': {
      priceId: process.env.STRIPE_CREDIT_20_PRICE_ID!,
      amount: 20,
      credits: 20,
    },
  },
  
  // Webhook secret for verifying webhook signatures
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
} as const;

// Base URL for redirects (fallback to localhost for local development)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Checkout session configuration
export const CHECKOUT_CONFIG = {
  successUrl: `${BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${BASE_URL}/pricing`,
  mode: {
    subscription: 'subscription' as const,
    payment: 'payment' as const,
  },
} as const;

// Customer portal configuration
export const CUSTOMER_PORTAL_CONFIG = {
  returnUrl: `${BASE_URL}/dashboard`,
} as const;

