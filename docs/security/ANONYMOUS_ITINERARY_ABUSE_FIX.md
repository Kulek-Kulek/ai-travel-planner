# CRITICAL SECURITY FIX: Anonymous Itinerary Abuse Prevention

**Branch:** `security/anonymous-itinerary-abuse`  
**Priority:** 🔴 **CRITICAL**  
**Status:** ✅ **IMPLEMENTED - Ready for Deployment**  
**Date:** 2025-11-11

---

## 📋 Executive Summary

### The Vulnerability

Anonymous users could bypass frontend rate limiting and create **unlimited draft itineraries**, each costing real money via OpenRouter AI API calls, by simply:

1. Creating a draft itinerary (costs $$ via AI API)
2. Refreshing the browser OR clearing `sessionStorage`
3. Creating another draft (repeat indefinitely)
4. Using VPN/proxy to bypass IP limits after hitting the 10/hour cap

**Cost Impact:** With the previous limit of 10 requests/hour per IP, a single attacker could:
- Generate 10 AI itineraries per hour = ~$0.50-$5.00 per hour (depending on model)
- Use 5 different IPs (VPNs) = $2.50-$25.00 per hour
- Run 24/7 = **$60-$600 per day in API costs**

### The Fix

Multi-layer defense-in-depth approach:

1. ✅ **Stricter IP Rate Limits:** 2/hour (was 10/hour), 3/day (was 20/day)
2. ✅ **Server-Side Session Tracking:** Database-backed anonymous sessions
3. ✅ **Session-Level Limits:** Only 2 itineraries per week per anonymous session
4. ✅ **Browser Fingerprinting:** Additional tracking layer
5. ✅ **Fresh Turnstile Required:** Every request requires new verification
6. ✅ **Atomic Transaction Validation:** Session check integrated into DB operation

**New Protection:** Even if an attacker:
- Refreshes the page 100 times → Still limited to 2 itineraries per week
- Clears storage → Server remembers via httpOnly cookie + database
- Changes IP → Session cookie still tracks them
- Clears cookies → New session but still limited to 2/hour per IP + 2/week
- Uses VPN → Each new IP still limited to 2/hour + 3/day

**Claimed Itinerary Handling:** When an anonymous user signs in and claims their draft:
- The itinerary is transferred to their account
- The anonymous session counter is **decremented**
- The claimed itinerary does NOT count against the 2/week anonymous limit
- This encourages sign-ups while preventing abuse

---

## 🔍 Technical Details

### Architecture Changes

#### 1. Database Layer

**New Table: `anonymous_sessions`**
```sql
CREATE TABLE anonymous_sessions (
  id UUID PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,      -- Server-generated, httpOnly cookie
  ip_address INET NOT NULL,                -- First defense layer
  browser_fingerprint TEXT,                -- Second defense layer
  itineraries_created INTEGER DEFAULT 0,   -- LIMIT: Max 2 per week
  week_start TIMESTAMPTZ,                   -- Week tracking for rate limits
  last_itinerary_created_at TIMESTAMPTZ,
  refresh_attempts INTEGER DEFAULT 0,      -- Detect suspicious behavior
  turnstile_verifications INTEGER DEFAULT 0,
  blocked_until TIMESTAMPTZ,               -- Temporary blocks
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);
```

**New Function: `create_anonymous_itinerary_with_session_check()`**
- Validates session exists and is not blocked
- Enforces 2-itineraries-per-week limit
- Returns specific error codes (INVALID_SESSION, LIMIT_EXCEEDED, etc.)
- Atomically creates itinerary + updates session counter

**New Function: `claim_anonymous_itinerary()`**
- Claims draft itinerary when user signs in
- Transfers ownership to authenticated user
- **Decrements** anonymous session counter
- Claimed itinerary doesn't count against anonymous limit

**Updated Table: `itineraries`**
- Added `anonymous_session_id` column to link itineraries to sessions
- Enables tracking and cleanup of anonymous itineraries

#### 2. Application Layer

**New Module: `lib/utils/anonymous-session.ts`**

Key functions:
- `generateSessionToken()` - Cryptographically secure token generation
- `generateBrowserFingerprint()` - Hash of browser characteristics
- `getOrCreateAnonymousSession()` - Session lifecycle management
- `validateAnonymousSession()` - Pre-request validation
- `trackRefreshAttempt()` - Detect suspicious refresh patterns
- `trackTurnstileVerification()` - Analytics and abuse detection

**Updated: `lib/actions/ai-actions.ts`**

Enhanced `generateItinerary()` with:
1. **Anonymous session validation** before AI request
2. **Fresh Turnstile token** requirement for every request
3. **Session-validated database function** for saving
4. **Specific error handling** for session-related errors

#### 3. Rate Limiting Updates

**IP Rate Limits (Updated in `subscription-actions.ts`):**
```typescript
const IP_HOURLY_LIMIT = 2;  // Reduced from 10
const IP_DAILY_LIMIT = 3;   // Reduced from 20
```

**Combined Rate Limiting (Defense-in-Depth):**
1. **IP Layer:** 2/hour, 3/day (all anonymous users from same IP)
2. **Session Layer:** 1 per 24-hour session (per browser)
3. **Turnstile Layer:** Fresh verification for each request
4. **User Layer:** Tier-based limits (authenticated users only)

---

## 🚀 Deployment Steps

### Prerequisites

- ✅ Phase 1 & Phase 2 security fixes already deployed
- ✅ Access to Supabase dashboard
- ✅ Access to production environment variables

### Step 1: Run Database Migration

```bash
cd travel-planner

# Option A: Supabase CLI (Recommended)
npx supabase db push

# Option B: Supabase Dashboard SQL Editor
# Run: supabase/migrations/016_anonymous_abuse_prevention.sql
```

### Step 2: Verify Migration

```sql
-- Should return 2 new functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'create_anonymous_itinerary_with_session_check',
  'get_or_create_anonymous_session',
  'cleanup_expired_anonymous_sessions'
);

-- Should return 1 new table
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'anonymous_sessions';

-- Should show new column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'itineraries' 
  AND column_name = 'anonymous_session_id';
```

### Step 3: No New Environment Variables Required ✅

This fix uses existing infrastructure (Supabase, Turnstile).

### Step 4: Deploy Code

```bash
git checkout security/anonymous-itinerary-abuse
git push origin security/anonymous-itinerary-abuse
# Create PR and merge to main
```

### Step 5: Verify Deployment

See [Verification Tests](#-verification-tests) section below.

---

## 🧪 Verification Tests

### Test 1: Single Anonymous Itinerary (Expected: Success)

1. Open incognito/private browser window
2. Navigate to app homepage
3. Create an itinerary
4. **Expected:** Itinerary created successfully
5. **Expected:** UI shows "Sign in to create more plans"

### Test 2: Second Itinerary (Expected: Success)

1. After Test 1, refresh the page
2. Try to create another itinerary
3. **Expected:** Second itinerary created successfully
4. **Expected:** UI shows "1 more free itinerary remaining this week"

### Test 3: Third Itinerary - Weekly Limit (Expected: Blocked)

1. After Test 2, try to create a third itinerary
2. **Expected:** Error: "You have reached your limit of 2 free itineraries this week. Please sign in to create unlimited travel plans."
4. **Expected:** `requireAuth: true` flag in response

### Test 4: Clear Storage Bypass Attempt (Expected: Blocked)

1. After Test 1, open DevTools → Application → Storage
2. Clear all sessionStorage and localStorage
3. Try to create another itinerary
4. **Expected:** Same error as Test 2
5. **Expected:** Server still remembers via httpOnly cookie + database

### Test 5: Claimed Itinerary Doesn't Count (Expected: Counter Decrements)

1. Anonymous user creates 1 itinerary
2. User signs in and claims the itinerary
3. **Expected:** Itinerary transferred to user account
4. Check database: `SELECT itineraries_created FROM anonymous_sessions WHERE...`
5. **Expected:** `itineraries_created = 0` (decremented from 1 to 0)
6. User can create 2 more anonymous itineraries this week (if they log out)

### Test 6: Clear Cookies Bypass Attempt (Expected: Blocked by IP Limit)

1. After Test 1, clear all cookies
2. Try to create itinerary
3. **Expected:** Can create 1 more (new session)
4. Try to create another
5. **Expected:** IP rate limit blocks: "IP rate limit exceeded (2/hour)"

### Test 5: VPN/IP Change (Expected: New Session, But Still Limited)

1. Complete Test 1 & Test 2
2. Change IP (VPN or different network)
3. **Expected:** Can create 1 itinerary on new IP
4. Try to create another
5. **Expected:** Blocked by new session limit

### Test 6: Multiple Rapid Requests (Expected: IP Limit)

1. Open incognito window
2. Try to create 3 itineraries rapidly
3. **Expected:** 
   - 1st request: Success
   - 2nd request: Blocked by session limit
   - 3rd request: Blocked by session limit or IP limit

### Test 7: Session Expiry (Expected: New Session After 24h)

```sql
-- Manually expire a session for testing
UPDATE anonymous_sessions 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE session_token = 'YOUR_SESSION_TOKEN';
```

1. Try to create itinerary with expired session
2. **Expected:** "Your session has expired. Please refresh the page."
3. Refresh page
4. **Expected:** New session created, can create 1 itinerary

### Test 8: Database Session Tracking

```sql
-- Check active anonymous sessions
SELECT 
  id,
  ip_address,
  itineraries_created,
  refresh_attempts,
  turnstile_verifications,
  created_at,
  expires_at
FROM anonymous_sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 10;

-- Check session blocks
SELECT * FROM anonymous_sessions
WHERE blocked_until IS NOT NULL
  AND blocked_until > NOW();

-- Check itineraries linked to sessions
SELECT 
  i.id,
  i.destination,
  i.created_at,
  s.ip_address,
  s.itineraries_created
FROM itineraries i
JOIN anonymous_sessions s ON i.anonymous_session_id = s.id
WHERE i.user_id IS NULL
ORDER BY i.created_at DESC
LIMIT 10;
```

---

## 📊 Monitoring After Deployment

### First 24 Hours - Critical Metrics

#### 1. Anonymous Session Creation Rate

```sql
-- Sessions created in last 24 hours
SELECT COUNT(*) as new_sessions,
       COUNT(DISTINCT ip_address) as unique_ips
FROM anonymous_sessions
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Alert if:** New sessions > 1000 per hour (potential bot attack)

#### 2. Session Limit Violations

```sql
-- Sessions attempting to create >1 itinerary
SELECT COUNT(*) as violation_attempts
FROM anonymous_sessions
WHERE itineraries_created >= 1
  AND last_activity_at > NOW() - INTERVAL '1 hour';
```

**Alert if:** Violation attempts > 50 per hour

#### 3. Blocked Sessions

```sql
-- Currently blocked sessions
SELECT COUNT(*) as blocked_sessions,
       COUNT(DISTINCT ip_address) as blocked_ips
FROM anonymous_sessions
WHERE blocked_until > NOW();
```

**Alert if:** Blocked sessions > 100 (mass attack)

#### 4. IP Rate Limit Hits

```sql
-- IPs hitting rate limits
SELECT COUNT(*) as rate_limited_ips
FROM ip_rate_limits
WHERE generations_last_hour >= 2
   OR generations_today >= 3;
```

**Alert if:** Rate limited IPs > 50 (coordinated attack)

#### 5. Cost Protection Verification

```sql
-- Anonymous itineraries created today
SELECT COUNT(*) as anon_itineraries_today,
       COUNT(DISTINCT anonymous_session_id) as unique_sessions
FROM itineraries
WHERE user_id IS NULL
  AND created_at > CURRENT_DATE;

-- Expected: count ≈ unique_sessions (1:1 ratio)
-- If count >> unique_sessions, the fix isn't working
```

**Alert if:** `count / unique_sessions > 1.5` (indicates bypass)

#### 6. Error Rate Monitoring

Monitor application logs for:
- `❌ Anonymous session validation failed`
- `LIMIT_EXCEEDED` errors
- `SESSION_BLOCKED` errors

**Alert if:** Error spike > 100/min (potential issue with session system)

### Ongoing Monitoring (Weekly)

#### Cleanup Old Sessions

```sql
-- Run weekly (or set up cron job)
SELECT cleanup_expired_anonymous_sessions();

-- Verify cleanup
SELECT COUNT(*) as old_sessions
FROM anonymous_sessions
WHERE created_at < NOW() - INTERVAL '7 days';
-- Expected: 0
```

#### Anonymous vs Authenticated Ratio

```sql
-- Itineraries by auth status (last 7 days)
SELECT 
  CASE WHEN user_id IS NULL THEN 'anonymous' ELSE 'authenticated' END as auth_status,
  COUNT(*) as count
FROM itineraries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY auth_status;
```

**Healthy ratio:** 10-30% anonymous, 70-90% authenticated
**Alert if:** Anonymous > 50% (sign-up friction may be too high)

#### Cost Savings Estimate

```sql
-- Prevented anonymous abuse attempts
SELECT 
  SUM(refresh_attempts) as refresh_blocks,
  COUNT(CASE WHEN itineraries_created = 0 THEN 1 END) as session_blocks
FROM anonymous_sessions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Estimate: Each blocked attempt saved $0.05-$0.50 in API costs
```

---

## 🔄 Rollback Plan

### If Critical Issues Arise

#### Rollback Code Only (Keep Migration)

```bash
git revert HEAD
git push origin security/anonymous-itinerary-abuse --force
```

**Note:** Old code will still work with new database schema. The `create_anonymous_itinerary_with_transaction` function still exists.

#### Rollback Database (If Necessary)

⚠️ **Only if new functions causing critical database issues**

```sql
-- Remove new functions
DROP FUNCTION IF EXISTS create_anonymous_itinerary_with_session_check;
DROP FUNCTION IF EXISTS get_or_create_anonymous_session;
DROP FUNCTION IF EXISTS cleanup_expired_anonymous_sessions;

-- Remove new table (⚠️ loses session tracking data)
DROP TABLE IF EXISTS anonymous_sessions;

-- Remove new column from itineraries (safe - nullable)
ALTER TABLE itineraries DROP COLUMN IF EXISTS anonymous_session_id;
```

**Note:** This rollback **reintroduces the vulnerability**. Only rollback if absolutely critical, then immediately investigate and fix.

---

## 💡 Additional Improvements (Future Enhancements)

### Short Term (Next Sprint)

1. **Admin Dashboard:**
   - View active anonymous sessions
   - Manually block suspicious IPs/sessions
   - View abuse attempt metrics

2. **Automated Alerting:**
   - Slack/email notifications for mass attacks
   - Daily summary of anonymous activity
   - Cost protection metrics

3. **Enhanced Fingerprinting:**
   - Client-side JavaScript fingerprinting (FingerprintJS)
   - Canvas fingerprinting
   - WebGL fingerprinting

### Medium Term (1-3 Months)

4. **Machine Learning Abuse Detection:**
   - Train model on legitimate vs abuse patterns
   - Automated blocking of suspicious behavior
   - Confidence scores for manual review

5. **Progressive Restrictions:**
   - Lower quality AI models for anonymous users
   - Shorter itineraries (3 days max)
   - Limited features (no regenerate, no edit)

6. **Conversion Optimization:**
   - Show value proposition after anonymous itinerary
   - One-click sign-up with draft preservation
   - Email capture before AI generation

### Long Term (3-6 Months)

7. **Micropayment System:**
   - Anonymous users pay $0.10 per itinerary
   - Stripe instant checkout (no account needed)
   - Eliminates abuse while monetizing anonymous users

8. **Federated Session Tracking:**
   - Share anonymous abuse data across similar platforms
   - Block known abuse IPs/fingerprints
   - Industry consortium for AI API abuse prevention

---

## 📈 Expected Impact

### Security Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Anonymous itineraries per IP (hourly) | 10 | 2 | **80% reduction** |
| Anonymous itineraries per session | Unlimited | 1 | **∞ → 1 reduction** |
| Bypass via refresh | ✅ Possible | ❌ Blocked | **100% prevention** |
| Bypass via storage clear | ✅ Possible | ❌ Blocked | **100% prevention** |
| Bypass via cookie clear + refresh | ✅ Possible (10x) | ⚠️ Limited (2x) | **80% prevention** |
| Cost exposure per attacker per day | $60-$600 | $0.30-$3.00 | **99% reduction** |

### Cost Savings

**Conservative Estimate:**
- Assume 10 attempted abuses per day (refresh/clear storage)
- Average API cost per itinerary: $0.10
- Previous exposure: 10 attempts × 10 iterations = 100 itineraries/day = $10/day
- New exposure: 10 attempts × 1 iteration = 10 itineraries/day = $1/day
- **Savings: $9/day = $270/month = $3,240/year**

**Aggressive Attack Scenario:**
- Coordinated abuse: 100 attempts/day × 10 IPs
- Previous exposure: 10,000 itineraries/day = $1,000/day
- New exposure: 200 itineraries/day = $20/day
- **Savings: $980/day = $29,400/month = $352,800/year**

---

## ✅ Post-Deployment Checklist

### Immediate (Within 1 Hour)
- [ ] Migration executed successfully
- [ ] All 3 new database functions exist
- [ ] `anonymous_sessions` table created
- [ ] `itineraries.anonymous_session_id` column added
- [ ] Code deployed to production
- [ ] Test 1-6 passed (see Verification Tests)

### First 24 Hours
- [ ] No error rate increase detected
- [ ] Anonymous session creation looks normal
- [ ] Session limit violations being tracked
- [ ] IP rate limits working correctly
- [ ] No bypass attempts succeeding
- [ ] Cost metrics stable or reduced

### First Week
- [ ] Weekly cleanup job scheduled
- [ ] Monitoring alerts configured
- [ ] Admin dashboard for session management (optional)
- [ ] Cost savings documented
- [ ] Team trained on new system
- [ ] Documentation updated

---

## 🔗 Related Documentation

- **Phase 1 Security Fixes:** `SECURITY_IMPROVEMENTS.md`
- **Phase 2 Security Fixes:** `SECURITY_PHASE_2_IMPLEMENTATION.md`
- **Deployment Guide:** `SECURITY_DEPLOYMENT_GUIDE.md`
- **Security Summary:** `SECURITY_SUMMARY.md`
- **Architectural Review:** `ARCHITECTURAL_REVIEW_2025-11-09.md`

---

## 📞 Support & Questions

If you encounter issues during deployment:

1. Check migration status: `SELECT * FROM anonymous_sessions LIMIT 1;`
2. Check function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%anonymous%';`
3. Check application logs for specific errors
4. Review rollback plan if critical issue
5. Contact devops/security team

---

**Last Updated:** 2025-11-11  
**Implementation Status:** ✅ Complete  
**Deployment Status:** ⏳ Pending  
**Priority:** 🔴 CRITICAL - Deploy ASAP

**Deployed By:** ___________  
**Deployment Date:** ___________  
**Verified By:** ___________  
**Status:** ___________

