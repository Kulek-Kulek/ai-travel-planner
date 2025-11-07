# Security & Architectural Improvements - Action Plan

**Project:** AI Travel Planner  
**Review Date:** 2025-01-07  
**Reviewer:** AI Code Review System  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## Executive Summary

This document outlines **11 critical and serious security/architectural issues** found in the AI Travel Planner codebase. These issues range from race conditions that could allow users to bypass payment systems, to potential security vulnerabilities that could expose user data.

**Risk Level:** HIGH  
**Estimated Total Effort:** 3-5 days  
**Recommended Timeline:** 1-2 weeks

---

## Priority Matrix

| Priority | Count | Timeline | Risk Level |
|----------|-------|----------|-----------|
| 🔴 Critical | 5 | Today | HIGH |
| 🟠 High | 3 | This Week | MEDIUM-HIGH |
| 🟡 Medium | 3 | This Sprint | MEDIUM |

---

## Table of Contents

1. [Critical Security Vulnerabilities](#critical-security-vulnerabilities)
   - [CRIT-1: Race Condition in Like System](#crit-1-race-condition-in-like-system)
   - [CRIT-2: Credit Deduction Race Condition](#crit-2-credit-deduction-race-condition)
   - [CRIT-3: Open Redirect Vulnerability](#crit-3-open-redirect-vulnerability)
   - [CRIT-4: SQL Injection Risk via ILIKE](#crit-4-sql-injection-risk-via-ilike)
   - [CRIT-5: Missing Webhook Replay Protection](#crit-5-missing-webhook-replay-protection)

2. [High Priority Architectural Issues](#high-priority-architectural-issues)
   - [HIGH-1: No Transaction Support](#high-1-no-transaction-support)
   - [HIGH-2: Rate Limiting Not Enforced](#high-2-rate-limiting-not-enforced)
   - [HIGH-3: Insufficient Input Validation](#high-3-insufficient-input-validation)

3. [Medium Priority Issues](#medium-priority-issues)
   - [MED-1: Missing Authorization Checks](#med-1-missing-authorization-checks)
   - [MED-2: Fragile AI Model Mapping](#med-2-fragile-ai-model-mapping)
   - [MED-3: Missing API Key Validation](#med-3-missing-api-key-validation)

4. [Implementation Checklist](#implementation-checklist)
5. [Testing Strategy](#testing-strategy)
6. [Additional Recommendations](#additional-recommendations)

---

## Critical Security Vulnerabilities

### CRIT-1: Race Condition in Like System

**Severity:** 🔴 HIGH  
**Effort:** 1 hour  
**Location:** `src/lib/actions/itinerary-actions.ts:524-558`

#### Problem

The `likeItinerary` function uses a classic read-modify-write pattern that is vulnerable to race conditions. Multiple concurrent requests can cause the like count to be incorrect.

```typescript
// CURRENT CODE - VULNERABLE
export async function likeItinerary(id: string): Promise<ActionResult<number>> {
  const supabase = await createClient();
  
  // 1. READ
  const { data: currentData } = await supabase
    .from('itineraries')
    .select('likes')
    .eq('id', id)
    .single();
  
  const newLikes = (currentData.likes || 0) + 1;
  
  // 2. WRITE (another request could have updated in between)
  const { error: updateError } = await supabase
    .from('itineraries')
    .update({ likes: newLikes })
    .eq('id', id);
    
  return { success: true, data: newLikes };
}
```

**Attack Scenario:**
- User A clicks like (likes = 5)
- User B clicks like (likes = 5)
- Both read `likes = 5`
- Both write `likes = 6`
- Result: 2 likes but count only increased by 1

#### Solution

Use atomic database increment with PostgreSQL's native support:

```typescript
// FIXED CODE - ATOMIC
export async function likeItinerary(id: string): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();
    
    // Use Supabase RPC for atomic increment
    const { data, error } = await supabase
      .rpc('increment_likes', { itinerary_id: id });
    
    if (error) {
      console.error('Error incrementing likes:', error);
      return { success: false, error: 'Failed to like itinerary' };
    }
    
    return { success: true, data: data };
  } catch (error) {
    console.error('Error in likeItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

#### Implementation Steps

1. **Create Database Function** (via Supabase SQL Editor):

```sql
-- Create atomic increment function
CREATE OR REPLACE FUNCTION increment_likes(itinerary_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_likes integer;
BEGIN
  UPDATE itineraries
  SET likes = likes + 1
  WHERE id = itinerary_id
  RETURNING likes INTO new_likes;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Itinerary not found';
  END IF;
  
  RETURN new_likes;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_likes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes TO anon;
```

2. **Update Server Action** (`src/lib/actions/itinerary-actions.ts`):

Replace the `likeItinerary` function with the code shown above.

3. **Test the Fix**:

```typescript
// Test concurrent likes
async function testConcurrentLikes() {
  const itineraryId = 'test-id';
  
  // Simulate 10 concurrent likes
  const promises = Array(10).fill(null).map(() => 
    likeItinerary(itineraryId)
  );
  
  const results = await Promise.all(promises);
  
  // Should increment by exactly 10
  console.log('Final likes:', results[results.length - 1].data);
}
```

#### Status: ⬜ Not Started

---

### CRIT-2: Credit Deduction Race Condition

**Severity:** 🔴 CRITICAL  
**Effort:** 3-4 hours  
**Location:** `src/lib/actions/subscription-actions.ts:291-436`

#### Problem

The `recordPlanGeneration` function has a serious race condition in credit deduction. A malicious user could:
1. Start 10 AI generation requests simultaneously
2. All 10 check credits (e.g., 5 credits available)
3. All 10 pass the check
4. All 10 start processing
5. Credits get deducted 10 times, going negative

This allows users to bypass payment by exploiting timing.

```typescript
// CURRENT CODE - VULNERABLE
export async function recordPlanGeneration(
  planId: string,
  model: ModelKey,
  operation: 'create' | 'edit' | 'regenerate' = 'create'
): Promise<{ success: boolean; error?: string }> {
  // ... get profile ...
  
  switch (tier) {
    case 'payg':
      // VULNERABLE: Check-then-act pattern
      const newBalance = (Number(profile.credits_balance) || 0) - cost;
      if (newBalance < 0) {
        return { success: false, error: 'Insufficient credits' };
      }
      updates.credits_balance = newBalance;
      break;
  }
  
  // Update happens later
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);
}
```

#### Solution

Use atomic database operations with optimistic locking:

```typescript
// FIXED CODE - ATOMIC WITH OPTIMISTIC LOCKING
export async function recordPlanGeneration(
  planId: string,
  model: ModelKey,
  operation: 'create' | 'edit' | 'regenerate' = 'create'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const modelInfo = AI_MODELS[model];
  const cost = modelInfo.cost;

  // Call database function for atomic credit deduction
  const { data, error } = await supabase
    .rpc('deduct_credits_atomic', {
      p_user_id: user.id,
      p_cost: cost,
      p_plan_id: planId,
      p_model: model,
      p_operation: operation,
    });

  if (error || !data?.success) {
    console.error('Credit deduction failed:', error || data?.error);
    return {
      success: false,
      error: data?.error || 'Failed to deduct credits',
    };
  }

  return { success: true };
}
```

#### Implementation Steps

1. **Create Database Function** (Supabase SQL Editor):

```sql
-- Create atomic credit deduction function
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id uuid,
  p_cost numeric,
  p_plan_id uuid,
  p_model text,
  p_operation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_new_balance numeric;
  v_tier text;
BEGIN
  -- Lock the row for update (prevents concurrent modifications)
  SELECT 
    subscription_tier,
    credits_balance,
    monthly_economy_used,
    monthly_premium_used,
    premium_rollover
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  v_tier := COALESCE(v_profile.subscription_tier, 'free');
  
  -- Handle PAYG tier
  IF v_tier = 'payg' THEN
    v_new_balance := COALESCE(v_profile.credits_balance, 0) - p_cost;
    
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Insufficient credits'
      );
    END IF;
    
    -- Atomic update
    UPDATE profiles
    SET 
      credits_balance = v_new_balance,
      last_generation_at = NOW()
    WHERE id = p_user_id;
    
  -- Handle Pro tier
  ELSIF v_tier = 'pro' THEN
    -- Check if it's economy or premium model
    IF p_model IN ('gemini-flash', 'gpt-4o-mini') THEN
      -- Economy model
      UPDATE profiles
      SET 
        monthly_economy_used = COALESCE(monthly_economy_used, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    ELSE
      -- Premium model - check limits
      IF COALESCE(v_profile.monthly_premium_used, 0) >= (20 + COALESCE(v_profile.premium_rollover, 0)) THEN
        -- Use credits instead
        v_new_balance := COALESCE(v_profile.credits_balance, 0) - 0.2;
        
        IF v_new_balance < 0 THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits for premium model'
          );
        END IF;
        
        UPDATE profiles
        SET 
          credits_balance = v_new_balance,
          last_generation_at = NOW()
        WHERE id = p_user_id;
      ELSE
        UPDATE profiles
        SET 
          monthly_premium_used = COALESCE(monthly_premium_used, 0) + 1,
          last_generation_at = NOW()
        WHERE id = p_user_id;
      END IF;
    END IF;
    
  -- Handle Free tier
  ELSIF v_tier = 'free' THEN
    IF p_operation = 'create' THEN
      UPDATE profiles
      SET 
        plans_created_count = COALESCE(plans_created_count, 0) + 1,
        last_generation_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;
  
  -- Update itinerary record
  IF p_operation IN ('edit', 'regenerate') THEN
    UPDATE itineraries
    SET 
      ai_model_used = p_model,
      generation_cost = p_cost,
      edit_count = COALESCE(edit_count, 0) + 1
    WHERE id = p_plan_id;
  ELSE
    UPDATE itineraries
    SET 
      ai_model_used = p_model,
      generation_cost = p_cost,
      edit_count = 0
    WHERE id = p_plan_id;
  END IF;
  
  -- Log usage
  INSERT INTO ai_usage_logs (
    user_id,
    plan_id,
    ai_model,
    operation,
    estimated_cost,
    actual_cost,
    subscription_tier,
    credits_deducted,
    success
  ) VALUES (
    p_user_id,
    p_plan_id,
    p_model,
    p_operation,
    p_cost,
    p_cost,
    v_tier,
    CASE WHEN v_new_balance IS NOT NULL THEN p_cost ELSE NULL END,
    true
  );
  
  RETURN jsonb_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits_atomic TO authenticated;
```

2. **Update Server Action** (`src/lib/actions/subscription-actions.ts`):

Replace the entire `recordPlanGeneration` function with the code shown in the Solution section above.

3. **Update AI Generation** (`src/lib/actions/ai-actions.ts`):

The existing call to `recordPlanGeneration` will work without changes, but ensure error handling is robust:

```typescript
// Around line 398-409
// 8. Record plan generation for authenticated users (tracks usage and credits)
if (user?.id) {
  const recordResult = await recordPlanGeneration(
    savedItinerary.id,
    modelKey,
    validated.operation
  );
  
  if (!recordResult.success) {
    console.error('Failed to record plan generation:', recordResult.error);
    // IMPORTANT: Itinerary was created but tracking failed
    // Consider compensation or deletion
    return {
      success: false,
      error: recordResult.error || 'Failed to track usage. Please contact support.',
    };
  }
}
```

4. **Add Integration Test**:

```typescript
// Test concurrent generation attempts
async function testConcurrentGeneration() {
  // Set user to PAYG with 1 credit
  await setUserCredits(userId, 1.0);
  
  // Try to generate 5 plans simultaneously
  const promises = Array(5).fill(null).map(() => 
    generateItinerary({
      destination: 'Paris',
      days: 3,
      travelers: 2,
      model: 'gemini-flash', // costs 0.5 credits
    })
  );
  
  const results = await Promise.all(promises.map(p => 
    p.catch(e => ({ success: false, error: e.message }))
  ));
  
  const successful = results.filter(r => r.success).length;
  
  // Should only allow 2 generations (1.0 / 0.5 = 2)
  expect(successful).toBe(2);
  
  // Check final balance
  const profile = await getProfile(userId);
  expect(profile.credits_balance).toBe(0);
}
```

#### Status: ⬜ Not Started

---

### CRIT-3: Open Redirect Vulnerability

**Severity:** 🔴 MEDIUM-HIGH  
**Effort:** 30 minutes  
**Location:** `src/app/auth/callback/route.ts:5-22`

#### Problem

The `itineraryId` query parameter is not validated and is directly interpolated into the redirect URL. While the risk is somewhat mitigated by using `origin` from the request, malicious values could still cause issues.

```typescript
// CURRENT CODE - VULNERABLE
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const itineraryId = requestUrl.searchParams.get('itineraryId');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Unvalidated parameter in redirect
    const planSelectionUrl = `${origin}/choose-plan${itineraryId ? `?itineraryId=${itineraryId}` : ''}`;
    return NextResponse.redirect(planSelectionUrl);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

**Potential Issues:**
- XSS if itineraryId contains malicious payloads
- URL manipulation
- Open redirect to unintended pages

#### Solution

Validate that `itineraryId` is a valid UUID:

```typescript
// FIXED CODE - VALIDATED
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string | null): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const itineraryId = requestUrl.searchParams.get('itineraryId');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Validate itineraryId before using
    const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
    
    // Build safe redirect URL
    const planSelectionUrl = validItineraryId
      ? `${origin}/choose-plan?itineraryId=${validItineraryId}`
      : `${origin}/choose-plan`;
      
    return NextResponse.redirect(planSelectionUrl);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`);
}
```

#### Implementation Steps

1. **Update Auth Callback** (`src/app/auth/callback/route.ts`):

Replace the entire file content with the fixed code above.

2. **Create Validation Utility** (Optional but recommended):

Create `src/lib/utils/validation.ts`:

```typescript
/**
 * Validation utilities
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

export function validateAndSanitizeUUID(value: unknown): string | null {
  return isValidUUID(value) ? value : null;
}
```

3. **Update Auth Actions** (`src/lib/actions/auth-actions.ts`):

Add validation to similar patterns:

```typescript
// Around line 69-74
const itineraryId = formData.get('itineraryId');

// BEFORE: Direct usage
if (data.session === null) {
  const confirmUrl = `/confirm-email?email=${encodeURIComponent(email)}${itineraryId ? `&itineraryId=${itineraryId}` : ''}`;
  redirect(confirmUrl);
}

// AFTER: Validated usage
import { isValidUUID } from '@/lib/utils/validation';

if (data.session === null) {
  const validItineraryId = isValidUUID(itineraryId) ? itineraryId : null;
  const confirmUrl = validItineraryId
    ? `/confirm-email?email=${encodeURIComponent(email)}&itineraryId=${validItineraryId}`
    : `/confirm-email?email=${encodeURIComponent(email)}`;
  redirect(confirmUrl);
}
```

4. **Add Test**:

```typescript
describe('Auth Callback Validation', () => {
  it('should reject invalid UUID', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('../../etc/passwd')).toBe(false);
    expect(isValidUUID('<script>alert(1)</script>')).toBe(false);
  });
  
  it('should accept valid UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
});
```

#### Status: ⬜ Not Started

---

### CRIT-4: SQL Injection Risk via ILIKE

**Severity:** 🔴 MEDIUM  
**Effort:** 15 minutes  
**Location:** `src/lib/actions/itinerary-actions.ts:88-90`

#### Problem

User input is directly interpolated into an ILIKE pattern without escaping special characters. While Supabase uses parameterized queries, the LIKE pattern itself can be manipulated.

```typescript
// CURRENT CODE - VULNERABLE
// Filter by destination if provided (case-insensitive partial match)
if (destination && destination.trim() !== '') {
  query = query.ilike('destination', `%${destination.trim()}%`);
}
```

**Attack Scenarios:**
- Input: `%` → matches all destinations (DoS by returning all results)
- Input: `_` → wildcard single character
- Input: `\` → escape character manipulation

#### Solution

Escape special LIKE characters before using in pattern:

```typescript
// FIXED CODE - ESCAPED
/**
 * Escape special characters in ILIKE/LIKE patterns
 * Escapes: % _ \
 */
function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// In getPublicItineraries function:
// Filter by destination if provided (case-insensitive partial match)
if (destination && destination.trim() !== '') {
  const escaped = escapeLikePattern(destination.trim());
  query = query.ilike('destination', `%${escaped}%`);
}
```

#### Implementation Steps

1. **Create Utility Function** (`src/lib/utils/validation.ts`):

```typescript
/**
 * Escape special characters in PostgreSQL LIKE/ILIKE patterns
 * Prevents pattern injection attacks
 * 
 * @param str - The string to escape
 * @returns Escaped string safe for LIKE/ILIKE patterns
 */
export function escapeLikePattern(str: string): string {
  // Escape: % (matches any characters), _ (matches single character), \ (escape character)
  return str.replace(/[%_\\]/g, '\\$&');
}
```

2. **Update Itinerary Actions** (`src/lib/actions/itinerary-actions.ts`):

```typescript
// Add import at top
import { escapeLikePattern } from '@/lib/utils/validation';

// Update around line 88-90
// Filter by destination if provided (case-insensitive partial match)
if (destination && destination.trim() !== '') {
  const escaped = escapeLikePattern(destination.trim());
  query = query.ilike('destination', `%${escaped}%`);
}
```

3. **Add Unit Test**:

```typescript
describe('escapeLikePattern', () => {
  it('should escape % wildcard', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });
  
  it('should escape _ wildcard', () => {
    expect(escapeLikePattern('test_name')).toBe('test\\_name');
  });
  
  it('should escape backslash', () => {
    expect(escapeLikePattern('path\\to\\file')).toBe('path\\\\to\\\\file');
  });
  
  it('should handle multiple special chars', () => {
    expect(escapeLikePattern('%_test_%')).toBe('\\%\\_test\\_\\%');
  });
  
  it('should not affect normal strings', () => {
    expect(escapeLikePattern('Paris')).toBe('Paris');
  });
});
```

4. **Integration Test**:

```typescript
describe('Destination Search', () => {
  it('should not return all results with % injection', async () => {
    // Create test data
    await createTestItinerary({ destination: 'Paris' });
    await createTestItinerary({ destination: 'London' });
    
    // Try to inject % to match all
    const result = await getPublicItineraries({
      destination: '%',
      limit: 100,
    });
    
    // Should only match destinations literally containing %
    expect(result.data.itineraries.length).toBe(0);
  });
});
```

#### Status: ⬜ Not Started

---

### CRIT-5: Missing Webhook Replay Protection

**Severity:** 🔴 HIGH  
**Effort:** 2 hours  
**Location:** `src/app/api/stripe/webhook/route.ts:19-103`

#### Problem

Stripe webhooks can be retried if your server doesn't respond with 200 OK. Without idempotency checks, the same event (e.g., payment_intent.succeeded) could be processed multiple times, causing:
- Duplicate credit additions
- Multiple subscription activations
- Incorrect transaction logs

```typescript
// CURRENT CODE - NO IDEMPOTENCY
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // ... signature verification ...

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      // ... other handlers ...
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
```

**Attack/Error Scenario:**
1. Stripe sends `payment_intent.succeeded` (user pays $10)
2. Server adds $10 credits
3. Server crashes before responding
4. Stripe retries the webhook
5. Server adds another $10 credits
6. User now has $20 instead of $10

#### Solution

Store processed event IDs and check before processing:

```typescript
// FIXED CODE - WITH IDEMPOTENCY
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
    // IDEMPOTENCY CHECK - Check if event was already processed
    const supabase = await createClient();
    
    const { data: existing } = await supabase
      .from('processed_webhook_events')
      .select('id, processed_at')
      .eq('stripe_event_id', event.id)
      .single();

    if (existing) {
      console.log(`Webhook ${event.id} already processed at ${existing.processed_at}`);
      return NextResponse.json({ 
        received: true, 
        status: 'already_processed',
        processed_at: existing.processed_at 
      });
    }

    // Process the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed AFTER successful handling
    await supabase
      .from('processed_webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        api_version: event.api_version,
      });

    return NextResponse.json({ received: true, status: 'processed' });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Don't mark as processed if error occurred
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

#### Implementation Steps

1. **Create Database Table** (Supabase SQL Editor):

```sql
-- Create table for tracking processed webhook events
CREATE TABLE processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT NOW(),
  api_version text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  
  -- Add index for fast lookups
  CONSTRAINT processed_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id)
);

-- Create index on stripe_event_id for fast duplicate checks
CREATE INDEX idx_processed_webhook_events_stripe_event_id 
  ON processed_webhook_events(stripe_event_id);

-- Create index on event_type for analytics
CREATE INDEX idx_processed_webhook_events_event_type 
  ON processed_webhook_events(event_type);

-- Create index on processed_at for cleanup queries
CREATE INDEX idx_processed_webhook_events_processed_at 
  ON processed_webhook_events(processed_at DESC);

-- Add RLS policies (webhooks use service role, but good practice)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert/select
CREATE POLICY "service_role_all_access"
  ON processed_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: Create cleanup function for old events (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-webhooks', '0 2 * * *', 'SELECT cleanup_old_webhook_events()');
```

2. **Update Webhook Handler** (`src/app/api/stripe/webhook/route.ts`):

Replace the entire `POST` function with the fixed code shown above.

3. **Important: Update Supabase Client for Webhooks**:

Webhooks need to use the service role key (not anon key) to bypass RLS:

```typescript
// At the top of webhook/route.ts
import { createClient } from '@supabase/supabase-js';

// Create service role client for webhooks
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Use in POST function:
const supabase = createServiceClient();
```

4. **Add to Environment Variables**:

Ensure `.env.local` has:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

5. **Add Test**:

```typescript
describe('Webhook Idempotency', () => {
  it('should not process duplicate webhook events', async () => {
    const mockEvent = {
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: { object: mockPaymentIntent }
    };

    // First request
    const response1 = await POST(createMockRequest(mockEvent));
    const json1 = await response1.json();
    expect(json1.status).toBe('processed');

    // Second request (duplicate)
    const response2 = await POST(createMockRequest(mockEvent));
    const json2 = await response2.json();
    expect(json2.status).toBe('already_processed');

    // Verify credits were only added once
    const profile = await getProfile(userId);
    expect(profile.credits_balance).toBe(10); // Not 20
  });
});
```

#### Status: ⬜ Not Started

---

## High Priority Architectural Issues

### HIGH-1: No Transaction Support

**Severity:** 🟠 HIGH  
**Effort:** 4-6 hours  
**Location:** Multiple locations in `src/lib/actions/`

#### Problem

Multi-step operations (like AI generation) involve several database operations that can fail independently:

1. Insert itinerary
2. Deduct credits
3. Log usage
4. Update profile stats

If step 3 fails, steps 1 and 2 have already committed, leaving the database in an inconsistent state.

#### Solution

Move critical multi-step operations into database functions with transactions:

```sql
CREATE OR REPLACE FUNCTION generate_plan_with_transaction(
  p_user_id uuid,
  p_cost numeric,
  p_model text,
  p_itinerary_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_itinerary_id uuid;
  v_profile record;
BEGIN
  -- Start implicit transaction (function is atomic by default)
  
  -- 1. Lock user profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;
  
  -- 2. Check and deduct credits
  IF COALESCE(v_profile.credits_balance, 0) < p_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;
  
  UPDATE profiles
  SET 
    credits_balance = credits_balance - p_cost,
    last_generation_at = NOW()
  WHERE id = p_user_id;
  
  -- 3. Insert itinerary
  INSERT INTO itineraries (
    user_id,
    destination,
    days,
    travelers,
    ai_plan,
    tags,
    ai_model_used,
    generation_cost,
    status
  )
  SELECT
    p_user_id,
    (p_itinerary_data->>'destination')::text,
    (p_itinerary_data->>'days')::integer,
    (p_itinerary_data->>'travelers')::integer,
    p_itinerary_data->'ai_plan',
    ARRAY(SELECT jsonb_array_elements_text(p_itinerary_data->'tags')),
    p_model,
    p_cost,
    'published'
  RETURNING id INTO v_itinerary_id;
  
  -- 4. Log usage
  INSERT INTO ai_usage_logs (
    user_id,
    plan_id,
    ai_model,
    operation,
    estimated_cost,
    actual_cost,
    subscription_tier,
    credits_deducted,
    success
  ) VALUES (
    p_user_id,
    v_itinerary_id,
    p_model,
    'create',
    p_cost,
    p_cost,
    v_profile.subscription_tier,
    p_cost,
    true
  );
  
  -- All steps succeeded, transaction will commit
  RETURN jsonb_build_object(
    'success', true,
    'itinerary_id', v_itinerary_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Automatic rollback on any error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
```

#### Implementation Steps

1. **Create Transaction Function** (shown above)
2. **Update AI Actions** to use the function
3. **Test rollback scenarios**
4. **Add monitoring for failed transactions**

#### Status: ⬜ Not Started

---

### HIGH-2: Rate Limiting Not Enforced

**Severity:** 🟠 HIGH  
**Effort:** 1 hour  
**Location:** `src/lib/actions/ai-actions.ts:108-157`

#### Problem

`checkRateLimit()` function exists but is **never called** in the AI generation flow. Users can spam AI requests.

#### Solution

```typescript
// In generateItinerary function, add BEFORE tier check:
export async function generateItinerary(
  input: z.infer<typeof generateItinerarySchema>,
): Promise<ActionResult<SavedItinerary>> {
  try {
    // 1. Validate input
    const validated = generateItinerarySchema.parse(input);

    // 2. Check rate limits FIRST (for all users)
    const rateLimitCheck = await checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.',
      };
    }

    // 3. Check if user is authenticated and can generate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    // ... rest of function
```

#### Implementation Steps

1. Add rate limit check to `generateItinerary`
2. Add rate limit check to any other AI endpoints
3. Add client-side feedback for rate limits
4. Test rate limiting

#### Status: ⬜ Not Started

---

### HIGH-3: Insufficient Input Validation

**Severity:** 🟠 HIGH  
**Effort:** 2 hours  
**Location:** `src/lib/actions/ai-actions.ts:23-46`

#### Problem

Input validation is incomplete:
- No max length on `notes` or `destination` (DoS risk)
- No XSS sanitization
- No validation that `childAges` matches `children` count
- No date order validation

#### Solution

```typescript
import { z } from 'zod';

const generateItinerarySchema = z
  .object({
    destination: z
      .string()
      .min(1, 'Destination is required')
      .max(100, 'Destination must be less than 100 characters')
      .regex(
        /^[a-zA-Z0-9\s,.\-()]+$/,
        'Destination contains invalid characters'
      )
      .trim(),
    
    days: z.number().int().positive().min(1).max(30),
    
    travelers: z.number().int().positive().min(1).max(20),
    
    startDate: z.date().optional(),
    
    endDate: z.date().optional(),
    
    children: z.number().int().min(0).max(10).optional(),
    
    childAges: z
      .array(z.number().int().min(0).max(17))
      .max(10)
      .optional(),
    
    hasAccessibilityNeeds: z.boolean().optional(),
    
    notes: z
      .string()
      .max(2000, 'Notes must be less than 2000 characters')
      .optional()
      .transform(val => val?.trim()),
    
    keepExistingPhoto: z.boolean().optional(),
    
    existingPhotoData: z
      .object({
        image_url: z.string().url().nullable().optional(),
        image_photographer: z.string().max(100).nullable().optional(),
        image_photographer_url: z.string().url().nullable().optional(),
      })
      .optional(),
    
    model: z.enum(OPENROUTER_MODEL_VALUES).default(DEFAULT_OPENROUTER_MODEL),
    
    turnstileToken: z.string().optional(),
    
    existingItineraryId: z.string().uuid().optional(),
    
    operation: z.enum(['create', 'edit', 'regenerate']).default('create'),
  })
  // Cross-field validations
  .refine(
    data => {
      // Validate childAges matches children count
      if (data.children && data.childAges) {
        return data.childAges.length === data.children;
      }
      return true;
    },
    {
      message: 'Number of child ages must match number of children',
      path: ['childAges'],
    }
  )
  .refine(
    data => {
      // Validate date order
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  )
  .refine(
    data => {
      // Validate days matches date range
      if (data.startDate && data.endDate) {
        const daysDiff = Math.ceil(
          (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return Math.abs(daysDiff - data.days) <= 1; // Allow 1 day tolerance
      }
      return true;
    },
    {
      message: 'Number of days must match the date range',
      path: ['days'],
    }
  );
```

#### Implementation Steps

1. **Update Schema** in `src/lib/actions/ai-actions.ts`
2. **Add Sanitization** for user-facing text (prevent XSS)
3. **Update Frontend** validation to match
4. **Add Tests** for edge cases

#### Status: ⬜ Not Started

---

## Medium Priority Issues

### MED-1: Missing Authorization Checks

**Severity:** 🟡 MEDIUM  
**Effort:** 2 hours  
**Location:** Various update functions in `src/lib/actions/itinerary-actions.ts`

#### Problem

While RLS provides some protection, explicit authorization checks should verify ownership before attempting updates.

#### Solution

Add explicit ownership verification:

```typescript
export async function updateItinerary(
  id: string,
  updates: {
    destination?: string;
    notes?: string;
  }
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Explicit ownership check
    const { data: itinerary, error: fetchError } = await supabase
      .from('itineraries')
      .select('id, user_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !itinerary) {
      return { success: false, error: 'Itinerary not found' };
    }
    
    if (itinerary.user_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Now perform update
    const { error } = await supabase
      .from('itineraries')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating itinerary:', error);
      return { success: false, error: 'Failed to update itinerary' };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateItinerary:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

#### Implementation Steps

1. Add explicit checks to all update/delete functions
2. Add tests for unauthorized access attempts
3. Add audit logging for failed authorization attempts

#### Status: ⬜ Not Started

---

### MED-2: Fragile AI Model Mapping

**Severity:** 🟡 MEDIUM  
**Effort:** 3 hours  
**Location:** `src/lib/actions/ai-actions.ts:76-89`

#### Problem

Hardcoded model mapping can get out of sync with database and pricing.

#### Solution

Move to database-driven configuration:

```sql
-- Create AI model configuration table
CREATE TABLE ai_model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  openrouter_id text NOT NULL UNIQUE,
  pricing_key text NOT NULL,
  display_name text NOT NULL,
  cost numeric NOT NULL,
  tier text NOT NULL CHECK (tier IN ('economy', 'premium')),
  is_active boolean NOT NULL DEFAULT true,
  max_tokens integer,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Insert current models
INSERT INTO ai_model_config (openrouter_id, pricing_key, display_name, cost, tier, max_tokens) VALUES
  ('google/gemini-2.0-flash-lite-001', 'gemini-flash', 'Gemini Flash', 0.5, 'economy', 8000),
  ('openai/gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o Mini', 0.5, 'economy', 4000),
  ('anthropic/claude-3-haiku', 'claude-haiku', 'Claude Haiku', 1.0, 'premium', 8000),
  ('google/gemini-2.5-pro', 'gemini-pro', 'Gemini Pro', 1.5, 'premium', 10000),
  ('google/gemini-2.5-flash', 'gemini-flash-plus', 'Gemini Flash Plus', 0.8, 'economy', 8000);

-- Enable RLS
ALTER TABLE ai_model_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anonymous users
CREATE POLICY "allow_read_active_models"
  ON ai_model_config FOR SELECT
  TO authenticated, anon
  USING (is_active = true);
```

Then update the mapping function:

```typescript
async function mapOpenRouterModelToKey(
  openRouterModel: string
): Promise<ModelKey> {
  const supabase = await createClient();
  
  const { data: modelConfig, error } = await supabase
    .from('ai_model_config')
    .select('pricing_key, cost, tier')
    .eq('openrouter_id', openRouterModel)
    .eq('is_active', true)
    .single();
  
  if (error || !modelConfig) {
    console.error(`Unknown or inactive AI model: ${openRouterModel}`);
    throw new Error('Invalid AI model selected');
  }
  
  return modelConfig.pricing_key as ModelKey;
}
```

#### Implementation Steps

1. Create database table
2. Migrate existing models
3. Update code to use database
4. Add admin interface for model management

#### Status: ⬜ Not Started

---

### MED-3: Missing API Key Validation

**Severity:** 🟡 MEDIUM  
**Effort:** 1 hour  
**Location:** Various environment variable usages

#### Problem

Environment variables are only checked at runtime, not at startup.

#### Solution

Create startup validation:

```typescript
// src/lib/config/env.ts
/**
 * Environment variable validation
 * Validates all required environment variables at startup
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
] as const;

// Validate on import (startup)
const missingVars: string[] = [];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
    'Please check your .env.local file.'
  );
}

// Validate formats
if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
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
  
  // Cloudflare
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY!,
  
  // Optional
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
} as const;

console.log('✅ Environment variables validated successfully');
```

Then import in layout or config files:

```typescript
// src/app/layout.tsx or instrumentation.ts
import '@/lib/config/env'; // Validates on import
```

#### Implementation Steps

1. Create `src/lib/config/env.ts`
2. Import in root layout
3. Update all code to use `ENV` constant
4. Add development environment example

#### Status: ⬜ Not Started

---

## Implementation Checklist

### Day 1: Critical Security (4-6 hours)

- [ ] **CRIT-1:** Fix race condition in like system (1h)
  - [ ] Create database function
  - [ ] Update server action
  - [ ] Test concurrent likes
  
- [ ] **CRIT-2:** Fix credit deduction race condition (3-4h)
  - [ ] Create atomic deduction function
  - [ ] Update recordPlanGeneration
  - [ ] Update AI generation flow
  - [ ] Test concurrent generations
  
- [ ] **CRIT-3:** Fix open redirect vulnerability (30m)
  - [ ] Create validation utilities
  - [ ] Update auth callback
  - [ ] Update auth actions
  - [ ] Test malicious inputs

### Day 2: Critical Security Continued (4-5 hours)

- [ ] **CRIT-4:** Fix SQL injection in ILIKE (15m)
  - [ ] Create escape function
  - [ ] Update search queries
  - [ ] Test pattern injection
  
- [ ] **CRIT-5:** Add webhook replay protection (2h)
  - [ ] Create processed events table
  - [ ] Update webhook handler
  - [ ] Add service role client
  - [ ] Test duplicate events
  
- [ ] **HIGH-1:** Add transaction support (2-3h)
  - [ ] Create transaction functions
  - [ ] Update AI generation
  - [ ] Test rollback scenarios

### Day 3: High Priority Issues (4-6 hours)

- [ ] **HIGH-2:** Enforce rate limiting (1h)
  - [ ] Add rate limit check to AI generation
  - [ ] Add client-side feedback
  - [ ] Test rate limits
  
- [ ] **HIGH-3:** Improve input validation (2h)
  - [ ] Update schemas with max lengths
  - [ ] Add cross-field validation
  - [ ] Add XSS sanitization
  - [ ] Test edge cases
  
- [ ] **MED-1:** Add explicit authorization checks (2h)
  - [ ] Update all update/delete functions
  - [ ] Add tests for unauthorized access
  - [ ] Add audit logging

### Day 4: Medium Priority & Testing (4-6 hours)

- [ ] **MED-2:** Move model mapping to database (3h)
  - [ ] Create model config table
  - [ ] Migrate existing models
  - [ ] Update code
  - [ ] Add admin interface
  
- [ ] **MED-3:** Add startup validation (1h)
  - [ ] Create env validation module
  - [ ] Update imports
  - [ ] Test missing variables
  
- [ ] **Integration Testing** (2h)
  - [ ] Test critical paths end-to-end
  - [ ] Test error scenarios
  - [ ] Load testing

### Day 5: Documentation & Monitoring (2-3 hours)

- [ ] Update README with security practices
- [ ] Document new database functions
- [ ] Add monitoring for critical errors
- [ ] Create runbook for common issues
- [ ] Final review and deployment

---

## Testing Strategy

### Unit Tests

Create tests for each fix:

```typescript
// tests/security/race-conditions.test.ts
describe('Race Condition Fixes', () => {
  describe('Like System', () => {
    it('should handle concurrent likes correctly', async () => {
      // Test implementation
    });
  });
  
  describe('Credit Deduction', () => {
    it('should prevent over-spending with concurrent requests', async () => {
      // Test implementation
    });
  });
});

// tests/security/validation.test.ts
describe('Input Validation', () => {
  describe('UUID Validation', () => {
    it('should reject invalid UUIDs', () => {
      // Test implementation
    });
  });
  
  describe('LIKE Pattern Escaping', () => {
    it('should escape special characters', () => {
      // Test implementation
    });
  });
});

// tests/security/webhooks.test.ts
describe('Webhook Security', () => {
  describe('Idempotency', () => {
    it('should not process duplicate events', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

Test critical user flows:

```typescript
// tests/integration/payment-flow.test.ts
describe('Payment Flow Integration', () => {
  it('should handle complete payment flow correctly', async () => {
    // 1. User adds credits
    // 2. Webhook processes payment
    // 3. Credits are added exactly once
    // 4. User generates plan
    // 5. Credits are deducted correctly
  });
});

// tests/integration/ai-generation.test.ts
describe('AI Generation Integration', () => {
  it('should handle generation with all validations', async () => {
    // Test full generation flow with:
    // - Rate limiting
    // - Credit checks
    // - Input validation
    // - Transaction atomicity
  });
});
```

### Load Tests

Test concurrent scenarios:

```bash
# Using artillery or k6
artillery quick --count 50 --num 10 https://your-app.com/api/generate
```

### Security Tests

```typescript
// tests/security/penetration.test.ts
describe('Security Penetration Tests', () => {
  it('should prevent SQL injection attempts', async () => {
    // Test various injection patterns
  });
  
  it('should prevent race condition exploits', async () => {
    // Test concurrent abuse scenarios
  });
  
  it('should prevent XSS attacks', async () => {
    // Test script injection
  });
});
```

---

## Additional Recommendations

### 1. Add Request Logging

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Log all requests with timing
  const start = Date.now();
  
  // Continue request
  const response = NextResponse.next();
  
  const duration = Date.now() - start;
  console.log({
    method: request.method,
    url: request.url,
    duration,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip,
  });
  
  return response;
}
```

### 2. Add Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 3. Add Rate Limiting at Edge Level

Consider using Vercel Edge Config or Cloudflare Workers for distributed rate limiting.

### 4. Add Monitoring & Alerts

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Authorization;
    }
    return event;
  },
});

// Custom alert for security events
export function logSecurityEvent(event: {
  type: 'rate_limit' | 'auth_failure' | 'injection_attempt';
  userId?: string;
  details: string;
}) {
  Sentry.captureMessage(`Security Event: ${event.type}`, {
    level: 'warning',
    extra: event,
  });
}
```

### 5. Database Connection Pooling

Ensure proper connection limits:

```typescript
// lib/supabase/server.ts
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-connection-timeout': '30' },
  },
});
```

---

## Post-Implementation Verification

After implementing all fixes, verify:

- [ ] All critical vulnerabilities are patched
- [ ] All tests pass (unit, integration, security)
- [ ] Performance is not significantly degraded
- [ ] Monitoring is in place
- [ ] Documentation is updated
- [ ] Team is briefed on changes
- [ ] Staged rollout plan is ready
- [ ] Rollback plan is documented

---

## Support & Questions

If you encounter issues during implementation:

1. Check the Supabase logs for database errors
2. Check the Next.js server logs for application errors
3. Test in staging environment first
4. Review the test suite for examples
5. Consult the security best practices documentation

---

**Last Updated:** 2025-01-07  
**Next Review:** After implementation (estimated 2025-01-14)

