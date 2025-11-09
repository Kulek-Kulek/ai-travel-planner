/**
 * Environment variable validation (MED-3)
 * Validates all required environment variables at startup
 * This prevents runtime errors from missing configuration
 * 
 * Note: Validation is skipped during build process since not all environment
 * variables are needed at build time (e.g., webhook secrets, API keys)
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TURNSTILE_SECRET_KEY',
] as const;

const optionalEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'PEXELS_API_KEY',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_CREDIT_2_PRICE_ID',
  'STRIPE_CREDIT_5_PRICE_ID',
  'STRIPE_CREDIT_10_PRICE_ID',
  'STRIPE_CREDIT_20_PRICE_ID',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
] as const;

// Skip validation during build process (Vercel, etc.)
// Environment variables are only needed at runtime, not during static build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || 
                    process.env.NEXT_PHASE === 'phase-export';

// Validate on import (startup), but skip during build
const missingVars: string[] = [];

if (!isBuildTime) {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
      'Please check your .env.local file or environment configuration.'
    );
  }
}

// Validate formats
if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
}

// Validate Supabase URL format
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url.includes('.supabase.co') && !url.includes('localhost')) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL');
  }
}

// Validate API keys have minimum length
const apiKeys = [
  { name: 'OPENROUTER_API_KEY', minLength: 20 },
  { name: 'STRIPE_SECRET_KEY', minLength: 20 },
  { name: 'TURNSTILE_SECRET_KEY', minLength: 20 },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', minLength: 20 },
];

for (const { name, minLength } of apiKeys) {
  const value = process.env[name];
  if (value && value.length < minLength) {
    console.warn(`⚠️ ${name} appears to be invalid (too short)`);
  }
}

// Export validated environment
export const ENV = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  // OpenRouter
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
  STRIPE_CREDIT_2_PRICE_ID: process.env.STRIPE_CREDIT_2_PRICE_ID,
  STRIPE_CREDIT_5_PRICE_ID: process.env.STRIPE_CREDIT_5_PRICE_ID,
  STRIPE_CREDIT_10_PRICE_ID: process.env.STRIPE_CREDIT_10_PRICE_ID,
  STRIPE_CREDIT_20_PRICE_ID: process.env.STRIPE_CREDIT_20_PRICE_ID,
  
  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY!,
  TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  
  // Optional
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  
  // Runtime environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  VERCEL_ENV: process.env.VERCEL_ENV,
} as const;

if (!isBuildTime) {
  console.log('✅ Environment variables validated successfully');

  // Log optional variables status (for debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Optional environment variables:');
    for (const varName of optionalEnvVars) {
      const isSet = !!process.env[varName];
      console.log(`  ${isSet ? '✅' : '❌'} ${varName}`);
    }
  }
} else {
  console.log('⏭️ Skipping environment validation during build');
}

