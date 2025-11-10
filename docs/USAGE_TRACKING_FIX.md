# Usage Tracking Fix

## Problem Description
Users with free tier accounts could create unlimited itineraries instead of being limited to 2. The `/usage` page incorrectly showed 0/2 plans even after creating multiple itineraries.

## Root Cause
The `generateItinerary` function in `src/lib/actions/ai-actions.ts` was missing two critical steps:

1. **No usage limit enforcement** - Never checked if users could generate before creating itineraries
2. **No usage tracking** - Never recorded the generation after successful creation

## Solution

### Changes Made to `src/lib/actions/ai-actions.ts`

#### 1. Added Required Imports
```typescript
import { 
  canGeneratePlan, 
  recordPlanGeneration 
} from "@/lib/actions/subscription-actions";
import { type ModelKey } from "@/lib/config/pricing-models";
```

#### 2. Added Model Mapping Function
Created `mapOpenRouterModelToKey()` to convert OpenRouter model IDs to pricing model keys:
- `google/gemini-2.5-flash` → `gemini-flash`
- `openai/gpt-4o-mini` → `gpt-4o-mini`
- `anthropic/claude-3-haiku` → `claude-haiku`
- `openai/gpt-5` → `gpt-4o`

#### 3. Added Usage Checking (Before Generation)
```typescript
// Check if user is authenticated and can generate
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const modelKey = mapOpenRouterModelToKey(validated.model);

// Only check limits for authenticated users
if (user?.id) {
  const canGenerate = await canGeneratePlan(modelKey);
  if (!canGenerate.allowed) {
    return {
      success: false,
      error: canGenerate.reason || 'Cannot generate plan at this time',
    };
  }
}
```

#### 4. Added Model Tracking in Database
Updated the insert data to include:
```typescript
ai_model_used: modelKey, // Track which model was used
```

#### 5. Added Usage Recording (After Successful Creation)
```typescript
// Record plan generation for authenticated users (tracks usage and credits)
if (user?.id) {
  const recordResult = await recordPlanGeneration(
    savedItinerary.id,
    modelKey,
    'create'
  );
  
  if (!recordResult.success) {
    console.error('Failed to record plan generation:', recordResult.error);
    // Don't fail the whole operation, but log the error
  }
}
```

## How It Works Now

### Free Tier (2 plans limit)
1. User attempts to create itinerary
2. `canGeneratePlan` checks: `plans_created_count < 2`
3. If allowed → generate and save itinerary
4. `recordPlanGeneration` increments `plans_created_count` in `profiles` table
5. Inserts record into `ai_usage_logs` table
6. Next attempt: if `plans_created_count >= 2` → blocked with upgrade message

### PAYG Tier (credit-based)
1. `canGeneratePlan` checks: `credits_balance >= model_cost`
2. If allowed → generate and save itinerary
3. `recordPlanGeneration` deducts credits
4. Logs usage for analytics

### Pro Tier (monthly limits)
1. `canGeneratePlan` checks monthly limits:
   - Economy: 100/month (then unlimited)
   - Premium: 20/month + rollover (then uses credits)
2. If allowed → generate and save itinerary
3. `recordPlanGeneration` updates appropriate counters
4. Logs usage for analytics

## Testing the Fix

### 1. Create New Free Tier User
```sql
-- Check initial state
SELECT subscription_tier, plans_created_count 
FROM profiles 
WHERE email = 'test@example.com';
-- Expected: subscription_tier='free', plans_created_count=0
```

### 2. Create First Itinerary
- Generate an itinerary through the UI
- Check `/usage` page → should show "1/2"
- Verify database:
```sql
SELECT plans_created_count FROM profiles WHERE email = 'test@example.com';
-- Expected: 1

SELECT COUNT(*) FROM ai_usage_logs WHERE user_id = 'xxx';
-- Expected: 1
```

### 3. Create Second Itinerary
- Generate another itinerary
- Check `/usage` page → should show "2/2"
- Verify database: `plans_created_count = 2`

### 4. Attempt Third Itinerary (Should Fail)
- Try to generate a third itinerary
- Should receive error: "Free tier limit reached (2 plans)"
- `/usage` page should show "2/2" with "Upgrade Now" button
- Database should remain at `plans_created_count = 2`

## Database Schema Impact

### Tables Used
1. **profiles** - Stores `plans_created_count` for free tier users
2. **ai_usage_logs** - Records all AI generation events for analytics
3. **itineraries** - Now includes `ai_model_used` field

### Key Functions
- `can_generate_plan(user_id, model)` - Supabase function that checks limits
- `canGeneratePlan(model)` - Server action that calls the DB function
- `recordPlanGeneration(planId, model, operation)` - Updates counters and logs

## Migration Notes

**For Existing Users:**
If you have existing itineraries created before this fix, their usage may not be accurately tracked. To backfill:

```sql
-- Count existing itineraries for each free tier user
UPDATE profiles p
SET plans_created_count = (
  SELECT COUNT(*) 
  FROM itineraries i 
  WHERE i.user_id = p.id AND i.status = 'published'
)
WHERE subscription_tier = 'free';

-- Optionally backfill ai_usage_logs
INSERT INTO ai_usage_logs (user_id, plan_id, ai_model, operation, estimated_cost, subscription_tier)
SELECT 
  user_id,
  id,
  COALESCE(ai_model_used, 'gemini-flash'),
  'create',
  COALESCE(generation_cost, 0.15),
  'free'
FROM itineraries
WHERE user_id IS NOT NULL
  AND created_at < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM ai_usage_logs WHERE plan_id = itineraries.id
  );
```

## Files Modified
- `travel-planner/src/lib/actions/ai-actions.ts`

## Related Documentation
- Pricing System: `PRICING_IMPLEMENTATION_SUMMARY.md`
- Subscription Actions: `src/lib/actions/subscription-actions.ts`
- Database Migration: `supabase/migrations/015_add_pricing_system.sql`

