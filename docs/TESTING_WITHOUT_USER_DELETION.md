# Testing New Features Without Deleting Users

## Problem
Deleting users from Supabase removes all their itineraries, which is destructive and loses valuable data.

## Better Testing Strategies

### Option 1: Reset User Subscription State (Recommended)

Reset a user's subscription data without deleting them:

```sql
-- Reset user to fresh state
UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_status = 'active',
  plans_created_count = 0,
  monthly_economy_used = 0,
  monthly_premium_used = 0,
  premium_rollover = 0,
  credits_balance = 0,
  billing_cycle_start = NULL,
  last_generation_at = NULL
WHERE email = 'your.test@email.com';

-- Optionally: Delete usage logs (keeps itineraries)
DELETE FROM ai_usage_logs 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your.test@email.com');

-- Optionally: Delete rate limit records
DELETE FROM rate_limits 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'your.test@email.com');
```

**Benefits:**
- ✅ Keeps all itineraries
- ✅ Resets subscription state
- ✅ Can test onboarding flow again
- ✅ No data loss

### Option 2: Use Email Aliases (Best for Multiple Tests)

If you use Gmail or Outlook:

```
your.email+free@gmail.com     → Test free tier
your.email+pro@gmail.com      → Test pro tier
your.email+payg@gmail.com     → Test PAYG tier
your.email+test1@gmail.com    → Test scenario 1
your.email+test2@gmail.com    → Test scenario 2
```

All emails arrive at `your.email@gmail.com`, but Supabase treats them as different users!

**Benefits:**
- ✅ No deletion needed
- ✅ Multiple test accounts
- ✅ All confirmation emails in one inbox
- ✅ Easy to track which account is which

### Option 3: Manually Trigger Onboarding Flow

Force the plan selection page to show again:

```typescript
// Just navigate to the page directly
window.location.href = '/choose-plan';

// Or with itinerary:
window.location.href = '/choose-plan?itineraryId=abc123';
```

You can also add a button to your dev/admin panel:

```tsx
<Button onClick={() => router.push('/choose-plan')}>
  Test Plan Selection
</Button>
```

### Option 4: Create Test User Function

Create a helper function for testing:

```sql
-- Function to create/reset test user
CREATE OR REPLACE FUNCTION create_test_user(p_email TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Reset existing user
    UPDATE profiles 
    SET 
      subscription_tier = 'free',
      plans_created_count = 0,
      monthly_economy_used = 0,
      monthly_premium_used = 0,
      credits_balance = 0
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- Usage:
SELECT create_test_user('your.test@email.com');
```

### Option 5: Development-Only User Reset Endpoint

Create an API route for dev environments only:

```typescript
// app/api/dev/reset-user/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const { email } = await request.json();
  const supabase = await createClient();

  // Reset user to fresh state
  const { data, error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      plans_created_count: 0,
      monthly_economy_used: 0,
      monthly_premium_used: 0,
      credits_balance: 0,
    })
    .eq('email', email)
    .select();

  return NextResponse.json({ success: true, data });
}
```

Then use it from your browser console:

```javascript
fetch('/api/dev/reset-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'your.test@email.com' })
});
```

## What the Migration Does

The migration I created (`017_change_user_deletion_behavior.sql`) changes the behavior:

### Before (Current):
```
Delete User → Deletes ALL itineraries 💥
```

### After (With Migration):
```
Delete User → Itineraries kept, user_id set to NULL
              → Creator shows as "Anonymous User"
              → Public itineraries remain accessible
              → User data archived for audit trail
```

### What Gets Preserved:
- ✅ All itineraries (public and private)
- ✅ Likes on itineraries
- ✅ Itinerary metadata
- ✅ Images and tags

### What Gets Removed:
- ❌ User profile data
- ❌ Usage logs (for privacy)
- ❌ Rate limit records
- ❌ Bucket list (personal data)

### Audit Trail:
A `deleted_users` table captures:
- User ID and email
- Deletion timestamp
- Number of itineraries they had
- Subscription tier at deletion

## Running the Migration

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **SQL Editor**
   - Click **New query**

2. **Copy the Migration SQL**
   - Open: `supabase/migrations/017_change_user_deletion_behavior.sql`
   - Copy all contents

3. **Run the Migration**
   - Paste into SQL Editor
   - Click **Run**
   - Verify: Should see "Success. No rows returned"

4. **Test It**
   ```sql
   -- Check the new constraint
   SELECT 
     tc.table_name, 
     tc.constraint_name, 
     rc.update_rule, 
     rc.delete_rule
   FROM information_schema.table_constraints tc
   JOIN information_schema.referential_constraints rc 
     ON tc.constraint_name = rc.constraint_name
   WHERE tc.table_name = 'itineraries' 
     AND tc.constraint_name LIKE '%user_id%';
   
   -- Should show: delete_rule = 'SET NULL'
   ```

## Recommended Testing Workflow

### For Quick Tests:
```bash
1. Use email aliases (your.email+test1@gmail.com)
2. No deletion needed
3. Each test = fresh user
```

### For Iterative Testing (Same User):
```sql
-- Quick reset script
UPDATE profiles 
SET plans_created_count = 0, 
    monthly_economy_used = 0,
    monthly_premium_used = 0
WHERE email = 'your.test@email.com';
```

### For Full Reset:
```sql
-- Nuclear option (keeps itineraries!)
DELETE FROM rate_limits WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@email.com');
DELETE FROM ai_usage_logs WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@email.com');
UPDATE profiles 
SET subscription_tier = 'free',
    plans_created_count = 0,
    monthly_economy_used = 0,
    monthly_premium_used = 0,
    credits_balance = 0
WHERE email = 'test@email.com';

-- Itineraries remain untouched! ✅
```

## Production Benefits

With this migration, your production system is more robust:

1. **Data Preservation**
   - Public itineraries remain accessible
   - Other users' likes/bookmarks still work
   - SEO-indexed content stays live

2. **Privacy Compliance**
   - User personal data is removed (GDPR compliant)
   - Itineraries anonymized
   - Audit trail maintained

3. **Analytics**
   - Can track deletion patterns
   - Understand churn reasons
   - Count itineraries per deleted user

4. **Recovery Options**
   - Can restore user if deletion was accidental
   - Have email/ID from deleted_users table
   - Content still exists

## Summary

**Don't delete users for testing!** Instead:

✅ Use email aliases for multiple test accounts
✅ Reset subscription state with SQL
✅ Navigate directly to `/choose-plan` for testing
✅ Run the migration for better deletion behavior

**For production:**
✅ Run the migration immediately
✅ Preserves valuable content
✅ Better for users and analytics

