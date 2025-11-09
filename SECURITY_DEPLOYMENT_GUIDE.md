# Security Fixes - Deployment Guide

**Status:** ✅ ALL CODE COMPLETE - Ready for Deployment  
**Branch:** `security/critical-vulnerabilities`  
**Date:** 2025-11-09 (Updated)

---

## Quick Summary

All **13 security enhancements** (7 Critical, 3 High, 3 Low) have been implemented in code and are ready for deployment. This guide walks you through the deployment process.

### What's Fixed

#### Critical Issues (7)
1. ✅ **CRIT-1: Race condition in like system** - Atomic database operation
2. ✅ **CRIT-2: Credit deduction race condition** - Atomic with row-level locking
3. ✅ **CRIT-3: Open redirect vulnerability** - UUID validation in auth flows
4. ✅ **CRIT-4: SQL injection in search** - LIKE pattern escaping
5. ✅ **CRIT-5: Webhook replay attacks** - Idempotency table
6. ✅ **NEW-CRIT-6: Turnstile bypass** - Only bypasses in true local dev
7. ✅ **NEW-HIGH-4: Prompt injection** - AI-based defense (from main branch)

#### High Priority Issues (3)
8. ✅ **NEW-HIGH-5: Rate limiting not enforced** - Now called in AI generation
9. ✅ **NEW-MED-4: UUID validation incomplete** - Added to 6 itinerary functions
10. ✅ **NEW-MED-5: Webhook error recovery** - Enhanced error handling

#### Low Priority Enhancements (3)
11. ✅ **LOW-1: Request timeout** - 60s timeout on AI requests
12. ✅ **LOW-2: IP-based rate limiting** - Combined with user-based limits
13. ✅ **LOW-3: Security headers** - HTTP security headers added

---

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Access to production hosting environment (Vercel/Cloudflare)
- [ ] Supabase CLI installed (optional but recommended)

---

## Deployment Steps

### Step 1: Deploy Database Migrations (Required) ⚠️

**TWO migrations need to be run:**

#### Migration 1: Core Security Fixes
**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of `supabase/migrations/001_security_fixes.sql`
5. Click **Run** to execute the migration
6. Verify success (you should see no errors)

**What this creates:**
- `increment_likes()` function for atomic like counting (CRIT-1)
- `deduct_credits_atomic()` function for safe credit deduction (CRIT-2)
- `processed_webhook_events` table for webhook idempotency (CRIT-5)
- All necessary indexes and RLS policies

#### Migration 2: IP Rate Limiting
**Using Supabase Dashboard:**
1. In the same SQL Editor
2. Create another new query
3. Copy and paste the entire contents of `supabase/migrations/002_ip_rate_limiting.sql`
4. Click **Run** to execute the migration
5. Verify success

**What this creates:**
- `ip_rate_limits` table for IP-based rate tracking (LOW-2)
- Indexes for fast IP lookups
- `cleanup_old_ip_rate_limits()` function for maintenance
- RLS policies for security

**Option B: Using Supabase CLI (runs both migrations)**
```bash
cd travel-planner
npx supabase db push
```

**Verification:**
```sql
-- Run these queries in Supabase SQL Editor to verify:

-- Check if all functions exist (should return 3 rows)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'increment_likes', 
  'deduct_credits_atomic',
  'cleanup_old_ip_rate_limits'
);

-- Check if all tables exist (should return 2 rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('processed_webhook_events', 'ip_rate_limits');
```

---

### Step 2: Set Environment Variable (Required) ⚠️

#### Development Environment
1. Create/edit `.env.local` in the `travel-planner` directory
2. Add the following line:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Production Environment (Vercel)
1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (your service role key)
   - **Environment:** Production, Preview, Development

#### Production Environment (Cloudflare Pages)
1. Go to your Cloudflare Pages project
2. Navigate to **Settings** → **Environment Variables**
3. Add variable for Production and Preview environments

**Where to find the key:**
1. Open Supabase Dashboard
2. Go to **Settings** → **API**
3. Find the **`service_role`** key (not the `anon` key!)
4. Click to reveal and copy

⚠️ **SECURITY WARNING:** This key has full database access. Keep it secret!

---

### Step 3: Deploy Code Changes

#### If using Git deployment (Vercel/Cloudflare)
```bash
# From the security/critical-vulnerabilities branch
git add .
git commit -m "feat: implement critical security fixes (CRIT-1 through CRIT-5)"
git push origin security/critical-vulnerabilities

# Then create a Pull Request and merge to main
# Your hosting provider will auto-deploy
```

#### Manual deployment
Follow your hosting provider's deployment process for the updated code.

---

### Step 4: Verify Deployment (Critical!)

After deployment, run these verification tests:

#### Test 1: Like System (CRIT-1)
1. Open any public itinerary
2. Click the like button multiple times quickly
3. Refresh the page
4. **Expected:** Like count should be accurate (not duplicated)

#### Test 2: Credit System (CRIT-2)
1. Set your account to PAYG with 1 credit
2. Try to generate 3 AI itineraries simultaneously
3. **Expected:** Only 2 should succeed (1.0 / 0.5 = 2)
4. Check your credit balance
5. **Expected:** Balance should be exactly 0.00 (never negative)

#### Test 3: UUID Validation (CRIT-3 + NEW-MED-4)
1. Try to sign up with URL: `/auth/callback?itineraryId=<script>alert(1)</script>`
2. **Expected:** Script should not execute, itineraryId should be ignored
3. Try with: `/auth/callback?itineraryId=../../etc/passwd`
4. **Expected:** Path traversal attempt should be blocked
5. Try accessing: `/api/itineraries/not-a-uuid`
6. **Expected:** Should return "Invalid itinerary ID" error

#### Test 4: Search Pattern (CRIT-4)
1. Search for destinations with input: `%`
2. **Expected:** Should not return all destinations
3. Search with input: `Paris%`
4. **Expected:** Should treat `%` as literal character, not wildcard

#### Test 5: Webhook Idempotency (CRIT-5 + NEW-MED-5)
1. Use Stripe CLI to send a test webhook
2. Send the same webhook again
3. **Expected:** Second webhook should return `already_processed`
4. Check database: `SELECT * FROM processed_webhook_events`
5. **Expected:** Event should appear only once

#### Test 6: Turnstile Bypass (NEW-CRIT-6)
1. Deploy to a Vercel preview environment
2. Try to generate an itinerary
3. **Expected:** Should require Turnstile verification (not bypass)
4. On localhost, should still bypass for development

#### Test 7: Rate Limiting (NEW-HIGH-5 + LOW-2)
1. Try to generate 10 AI itineraries rapidly (within 1 minute)
2. **Expected:** Should be rate limited based on your tier
3. From a different IP, try 15 rapid requests
4. **Expected:** IP should be rate limited (10/hour max for anonymous)
5. After 3 violations, IP should be temporarily banned

#### Test 8: Request Timeout (LOW-1)
1. Monitor network tab while generating an itinerary
2. If AI request takes > 60 seconds
3. **Expected:** Should timeout and return error (not hang indefinitely)

#### Test 9: Security Headers (LOW-3)
1. Open DevTools → Network tab
2. Generate an itinerary
3. Check response headers
4. **Expected:** Should see headers like `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, etc.

#### Test 10: Prompt Injection Defense (NEW-HIGH-4)
1. Try to generate an itinerary with destination: "kuchnia w Warszawie" (kitchen in Polish)
2. **Expected:** Should be blocked with security violation message
3. Try with destination: "Paris for brothels"
4. **Expected:** Should be blocked with content policy violation

---

### Step 5: Monitor After Deployment

#### First 24 Hours
Monitor these metrics closely:

1. **Error Rates**
   - Check Vercel/Cloudflare logs for increased error rates
   - Check Supabase logs for database errors
   - Check Sentry/error tracking for new exceptions

2. **Credit Balances**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email, credits_balance 
   FROM profiles 
   WHERE credits_balance < 0
   ORDER BY credits_balance ASC;
   ```
   **Expected:** Should return 0 rows (no negative balances)

3. **Webhook Processing**
   ```sql
   -- Check for duplicate processing attempts
   SELECT stripe_event_id, COUNT(*) as count
   FROM processed_webhook_events
   GROUP BY stripe_event_id
   HAVING COUNT(*) > 1;
   ```
   **Expected:** Should return 0 rows (no duplicates)

4. **Like Counts**
   - Manually verify a few itineraries
   - Like counts should be reasonable (not suddenly doubled)

#### Ongoing Monitoring
- Set up alerts for negative credit balances
- Set up alerts for webhook processing failures
- Monitor auth callback errors

---

## Rollback Plan

If issues are detected after deployment:

### Rollback Code
```bash
# Revert to previous version
git revert HEAD
git push origin main
# Or use your hosting provider's instant rollback feature
```

### Rollback Database (if needed)
⚠️ **Only do this if the new functions are causing issues**

```sql
-- Remove new functions
DROP FUNCTION IF EXISTS increment_likes(uuid);
DROP FUNCTION IF EXISTS deduct_credits_atomic(uuid, numeric, uuid, text, text);
DROP FUNCTION IF EXISTS cleanup_old_webhook_events();

-- Remove new table
DROP TABLE IF EXISTS processed_webhook_events;
```

**Note:** This will reintroduce the security vulnerabilities. Only rollback if absolutely necessary, then immediately investigate and fix.

---

## Post-Deployment Checklist

### Database & Environment
- [ ] Migration 001_security_fixes.sql executed successfully
- [ ] Migration 002_ip_rate_limiting.sql executed successfully
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in all environments
- [ ] Code deployed to production

### Critical Tests (Must Pass)
- [ ] Test 1 (Likes - CRIT-1) passed
- [ ] Test 2 (Credits - CRIT-2) passed
- [ ] Test 3 (UUID validation - CRIT-3 + MED-4) passed
- [ ] Test 4 (Search patterns - CRIT-4) passed
- [ ] Test 5 (Webhooks - CRIT-5 + MED-5) passed
- [ ] Test 6 (Turnstile - NEW-CRIT-6) passed
- [ ] Test 7 (Rate limiting - HIGH-5 + LOW-2) passed
- [ ] Test 8 (Timeout - LOW-1) passed
- [ ] Test 9 (Security headers - LOW-3) passed
- [ ] Test 10 (Prompt injection - HIGH-4) passed

### Monitoring
- [ ] No error rate increase detected
- [ ] No negative credit balances found
- [ ] No IP bans on legitimate users
- [ ] Webhook processing working correctly
- [ ] Security headers delivering on all routes
- [ ] Monitoring alerts configured
- [ ] Team notified of changes
- [ ] Documentation updated

---

## Troubleshooting

### Error: "function increment_likes does not exist"
**Solution:** The database migration wasn't run. Go to Step 1 and run the migration.

### Error: "SUPABASE_SERVICE_ROLE_KEY is not set"
**Solution:** The environment variable is missing. Go to Step 2 and add it.

### Error: "relation 'processed_webhook_events' does not exist"
**Solution:** The database migration wasn't run completely. Re-run the migration.

### Webhooks are failing
**Solution:** Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in production.

### Credits went negative
**Solution:** 
1. Immediately rollback the code
2. Run this query to identify affected users:
   ```sql
   SELECT id, email, credits_balance FROM profiles WHERE credits_balance < 0;
   ```
3. Contact affected users and add compensation credits
4. Investigate why `deduct_credits_atomic()` failed

---

## Support

If you encounter issues during deployment:
1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Check application logs: Vercel/Cloudflare Dashboard → Logs
3. Check the full documentation: `SECURITY_IMPROVEMENTS.md`
4. Review the test cases in the Testing Strategy section

---

## Summary

✅ **What you did (13 security enhancements):**

**Critical Vulnerabilities Fixed:**
- Deployed atomic database operations to prevent race conditions (CRIT-1, CRIT-2)
- Added UUID validation to prevent injection attacks (CRIT-3, MED-4)
- Added LIKE pattern escaping to prevent SQL injection (CRIT-4)
- Added webhook idempotency to prevent duplicate processing (CRIT-5)
- Fixed Turnstile bypass in preview environments (NEW-CRIT-6)
- Implemented AI-based prompt injection defense (NEW-HIGH-4)

**Security Enhancements:**
- Enforced rate limiting on AI generation (NEW-HIGH-5)
- Enhanced webhook error recovery (NEW-MED-5)
- Added request timeout protection (LOW-1)
- Implemented IP-based rate limiting with progressive bans (LOW-2)
- Added HTTP security headers (LOW-3)

✅ **Why it matters:**
- Users can no longer bypass payment through race conditions
- Bot attacks are prevented with Turnstile + IP rate limiting
- Prompt injection blocked in any language (AI-based detection)
- Auth system protected from malicious redirects
- Search protected from pattern injection
- Payment webhooks protected from duplicate processing
- System resources protected from hanging requests
- Application secured with HTTP security headers

✅ **Security Layers Active:**
1. Bot Protection (Turnstile + IP rate limiting)
2. Prompt Injection Defense (AI-based, multi-language)
3. Payment Protection (atomic operations, webhook idempotency)
4. Race Condition Prevention (database-level locking)
5. Input Validation (UUID, LIKE patterns, Zod schemas)
6. Security Headers (XSS, clickjacking, MIME sniffing)
7. Request Timeout Protection (resource management)

✅ **What's next:**
- Monitor the system for 24-48 hours
- Address remaining optional enhancements (HIGH-1, MED-1, MED-2, MED-3)
- Implement comprehensive integration tests

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Verified By:** ___________  
**Status:** ___________

