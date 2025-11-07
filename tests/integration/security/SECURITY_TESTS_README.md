# Security Integration Tests

**Status:** Manual Testing Required (Database Access Needed)

These tests verify the critical security fixes that involve database operations. Since they require actual database access and concurrent operations, they should be run manually or in a staging environment.

## Test Environment Setup

Before running these tests, ensure:
1. ✅ Database migration `001_security_fixes.sql` has been executed
2. ✅ `SUPABASE_SERVICE_ROLE_KEY` is set in environment
3. ✅ You have access to a test/staging database (not production!)

---

## CRIT-1: Race Condition in Like System

### Test 1.1: Concurrent Likes Don't Duplicate

**What it tests:** Multiple users liking the same itinerary simultaneously should increment the count correctly.

**Manual Test Steps:**

1. Create a test itinerary and note its ID
2. Check initial like count:
   ```sql
   SELECT id, likes FROM itineraries WHERE id = 'your-test-id';
   ```
3. Open 10 browser tabs simultaneously
4. In each tab, click the like button at the same time
5. Verify the like count:
   ```sql
   SELECT id, likes FROM itineraries WHERE id = 'your-test-id';
   ```

**Expected Result:** Like count should be exactly 10 (or initial + 10)

**Failure Scenario (if not fixed):** Like count might be 5-9 due to race conditions

---

### Test 1.2: Database Function Works Correctly

**SQL Test:**
```sql
-- Reset likes to 0
UPDATE itineraries SET likes = 0 WHERE id = 'your-test-id';

-- Call the function multiple times
SELECT increment_likes('your-test-id'); -- Should return 1
SELECT increment_likes('your-test-id'); -- Should return 2
SELECT increment_likes('your-test-id'); -- Should return 3

-- Verify final count
SELECT likes FROM itineraries WHERE id = 'your-test-id';
-- Expected: 3
```

---

## CRIT-2: Credit Deduction Race Condition

### Test 2.1: Concurrent AI Generation Respects Credit Limit

**What it tests:** Multiple simultaneous AI generation requests should not allow over-spending.

**Manual Test Steps:**

1. Set up a test PAYG account with exactly 1.0 credit
   ```sql
   UPDATE profiles 
   SET subscription_tier = 'payg', credits_balance = 1.0 
   WHERE id = 'your-test-user-id';
   ```

2. Try to generate 5 itineraries simultaneously (using model that costs 0.5 credits):
   - Open browser developer tools
   - Run this code in console:
   ```javascript
   // Generate 5 requests simultaneously
   const promises = Array(5).fill(null).map(() => 
     fetch('/api/generate-itinerary', {
       method: 'POST',
       body: JSON.stringify({
         destination: 'Paris',
         days: 3,
         travelers: 2,
         model: 'gemini-flash' // costs 0.5 credits
       })
     })
   );
   
   Promise.all(promises).then(results => 
     Promise.all(results.map(r => r.json()))
   ).then(data => console.log(data));
   ```

3. Check how many succeeded and final balance:
   ```sql
   SELECT credits_balance FROM profiles WHERE id = 'your-test-user-id';
   ```

**Expected Result:** 
- Exactly 2 requests should succeed (1.0 / 0.5 = 2)
- 3 requests should fail with "Insufficient credits"
- Final balance should be exactly 0.00 (never negative!)

**Failure Scenario (if not fixed):** 
- More than 2 might succeed
- Balance might go negative (e.g., -0.5 or -1.0)

---

### Test 2.2: Database Function Enforces Atomicity

**SQL Test:**
```sql
-- Setup test user with 1 credit
UPDATE profiles 
SET subscription_tier = 'payg', credits_balance = 1.0 
WHERE id = 'your-test-user-id';

-- Try to deduct 0.5 credits (should succeed)
SELECT deduct_credits_atomic(
  'your-test-user-id'::uuid,
  0.5,
  'test-plan-id'::uuid,
  'gemini-flash',
  'create'
);
-- Expected: {"success": true}

-- Try to deduct 0.5 credits again (should succeed)
SELECT deduct_credits_atomic(
  'your-test-user-id'::uuid,
  0.5,
  'test-plan-id-2'::uuid,
  'gemini-flash',
  'create'
);
-- Expected: {"success": true}

-- Try to deduct 0.5 credits again (should FAIL - no credits left)
SELECT deduct_credits_atomic(
  'your-test-user-id'::uuid,
  0.5,
  'test-plan-id-3'::uuid,
  'gemini-flash',
  'create'
);
-- Expected: {"success": false, "error": "Insufficient credits"}

-- Verify balance is exactly 0
SELECT credits_balance FROM profiles WHERE id = 'your-test-user-id';
-- Expected: 0.00
```

---

## CRIT-3: Open Redirect Vulnerability

### Test 3.1: Malicious UUID Inputs Are Rejected

**What it tests:** Auth callback should reject malicious itineraryId parameters.

**Manual Test Steps:**

1. Test XSS attempt:
   ```
   https://your-app.com/auth/callback?code=AUTH_CODE&itineraryId=<script>alert(1)</script>
   ```
   **Expected:** Script should not execute, redirect to `/choose-plan` without itineraryId

2. Test path traversal:
   ```
   https://your-app.com/auth/callback?code=AUTH_CODE&itineraryId=../../etc/passwd
   ```
   **Expected:** Redirect to `/choose-plan` without itineraryId

3. Test valid UUID:
   ```
   https://your-app.com/auth/callback?code=AUTH_CODE&itineraryId=550e8400-e29b-41d4-a716-446655440000
   ```
   **Expected:** Redirect to `/choose-plan?itineraryId=550e8400-e29b-41d4-a716-446655440000`

---

### Test 3.2: Auth Actions Validate UUIDs

**Test in Browser Console:**
```javascript
// Test signup with malicious itineraryId
const formData = new FormData();
formData.append('email', 'test@example.com');
formData.append('password', 'password123');
formData.append('itineraryId', '<script>alert(1)</script>');

// Submit signup form
// Expected: No script execution, itineraryId should be ignored
```

---

## CRIT-4: SQL Injection via ILIKE

### Test 4.1: Wildcard Characters Don't Match All

**What it tests:** Search input with `%` shouldn't return all destinations.

**Manual Test Steps:**

1. Create test itineraries with different destinations:
   ```sql
   INSERT INTO itineraries (destination, days, travelers, ai_plan, user_id, is_private)
   VALUES 
   ('Paris', 3, 2, '{"city":"Paris","days":[]}', 'test-user-id', false),
   ('London', 3, 2, '{"city":"London","days":[]}', 'test-user-id', false),
   ('Tokyo', 3, 2, '{"city":"Tokyo","days":[]}', 'test-user-id', false);
   ```

2. Search for `%` in the UI search box
   **Expected:** Should return 0 results (or only destinations that literally contain `%`)
   **Failure:** Would return all 3 destinations

3. Search for `_` in the UI search box
   **Expected:** Should return 0 results
   **Failure:** Would return destinations with any single character

4. Search for `Paris%` in the UI search box
   **Expected:** Should return 0 results (treating `%` as literal)
   **Failure:** Would return Paris, Parisian, etc.

---

### Test 4.2: SQL Function Escapes Correctly

**Test in Browser Developer Tools:**
```javascript
// Test search with wildcard
fetch('/api/search-itineraries?destination=%')
  .then(r => r.json())
  .then(data => {
    console.log('Results:', data.itineraries.length);
    // Expected: 0 (unless you have destinations with literal '%')
    // Failure: Would return all itineraries
  });
```

---

## CRIT-5: Webhook Replay Protection

### Test 5.1: Duplicate Webhooks Are Detected

**What it tests:** Same webhook event sent twice should only process once.

**Manual Test Steps (requires Stripe CLI):**

1. Install Stripe CLI:
   ```bash
   # Windows: choco install stripe
   # Mac: brew install stripe/stripe-cli/stripe
   ```

2. Forward webhooks to localhost:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Trigger a test webhook:
   ```bash
   stripe trigger checkout.session.completed
   ```

4. Note the event ID from the output (e.g., `evt_test_123`)

5. Check database:
   ```sql
   SELECT * FROM processed_webhook_events WHERE stripe_event_id = 'evt_test_123';
   ```
   **Expected:** 1 row exists

6. Try to send the same event again manually (you'll need to replay it)

7. Check database again:
   ```sql
   SELECT COUNT(*) FROM processed_webhook_events WHERE stripe_event_id = 'evt_test_123';
   ```
   **Expected:** Still 1 row (not 2)

8. Check application logs:
   **Expected:** Should see "Webhook evt_test_123 already processed at [timestamp]"

---

### Test 5.2: Credits Are Not Duplicated

**Manual Test Steps:**

1. Set initial balance:
   ```sql
   UPDATE profiles SET credits_balance = 5.0 WHERE email = 'test@example.com';
   ```

2. Use Stripe test mode to purchase $10 worth of credits (should add 10 credits)

3. Note the webhook event ID from logs

4. Check balance:
   ```sql
   SELECT credits_balance FROM profiles WHERE email = 'test@example.com';
   ```
   **Expected:** 15.0 (5 + 10)

5. Manually replay the webhook (simulate Stripe retry)

6. Check balance again:
   ```sql
   SELECT credits_balance FROM profiles WHERE email = 'test@example.com';
   ```
   **Expected:** Still 15.0 (not 25.0!)

---

## Quick Verification Checklist

Run these quick checks after deploying:

```sql
-- ✅ Check all functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('increment_likes', 'deduct_credits_atomic')
AND routine_schema = 'public';
-- Expected: 2 rows

-- ✅ Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'processed_webhook_events'
AND table_schema = 'public';
-- Expected: 1 row

-- ✅ Check no negative balances
SELECT COUNT(*) FROM profiles WHERE credits_balance < 0;
-- Expected: 0

-- ✅ Check webhook table is working
SELECT COUNT(*) FROM processed_webhook_events;
-- Expected: 0 or more (depends on if you've received webhooks)
```

---

## Automated Test Suite (Future)

To fully automate these tests, you would need:

1. **Testing Library:** Vitest + @supabase/supabase-js
2. **Test Database:** Separate Supabase project for testing
3. **Concurrency Testing:** Use `Promise.all()` to simulate concurrent requests
4. **Webhook Mocking:** Mock Stripe webhook events

Example structure:
```typescript
describe('CRIT-1: Race Conditions', () => {
  it('should handle concurrent likes correctly', async () => {
    // Setup test itinerary
    // Send 10 concurrent like requests
    // Verify count is exactly 10
  });
});
```

---

## Test Results Log

Use this section to document your test results:

### Test Date: ___________

#### CRIT-1: Like Race Condition
- [ ] Test 1.1: Concurrent likes - PASS/FAIL
- [ ] Test 1.2: Database function - PASS/FAIL

#### CRIT-2: Credit Race Condition
- [ ] Test 2.1: Concurrent generation - PASS/FAIL
- [ ] Test 2.2: Atomic function - PASS/FAIL

#### CRIT-3: Open Redirect
- [ ] Test 3.1: Malicious UUIDs - PASS/FAIL
- [ ] Test 3.2: Auth actions - PASS/FAIL

#### CRIT-4: SQL Injection
- [ ] Test 4.1: Wildcard search - PASS/FAIL
- [ ] Test 4.2: Escape function - PASS/FAIL

#### CRIT-5: Webhook Replay
- [ ] Test 5.1: Duplicate detection - PASS/FAIL
- [ ] Test 5.2: Credit duplication - PASS/FAIL

**Overall Status:** ___________
**Tested By:** ___________
**Notes:** ___________

