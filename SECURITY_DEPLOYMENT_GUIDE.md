# Security Fixes - Deployment Guide

**Status:** ✅ ALL CODE COMPLETE - Ready for Deployment  
**Branch:** `security/critical-vulnerabilities`  
**Date:** 2025-11-07

---

## Quick Summary

All **5 critical security vulnerabilities** have been implemented in code and are ready for deployment. This guide walks you through the deployment process.

### What's Fixed
1. ✅ **Race condition in like system** - Atomic database operation
2. ✅ **Credit deduction race condition** - Atomic with row-level locking
3. ✅ **Open redirect vulnerability** - UUID validation
4. ✅ **SQL injection in search** - LIKE pattern escaping
5. ✅ **Webhook replay attacks** - Idempotency table

---

## Prerequisites

- [ ] Access to Supabase dashboard
- [ ] Access to production hosting environment (Vercel/Cloudflare)
- [ ] Supabase CLI installed (optional but recommended)

---

## Deployment Steps

### Step 1: Deploy Database Migration (Required) ⚠️

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of `supabase/migrations/001_security_fixes.sql`
5. Click **Run** to execute the migration
6. Verify success (you should see no errors)

**Option B: Using Supabase CLI**
```bash
cd travel-planner
npx supabase db push
```

**What this creates:**
- `increment_likes()` function for atomic like counting
- `deduct_credits_atomic()` function for safe credit deduction
- `processed_webhook_events` table for webhook idempotency
- All necessary indexes and RLS policies

**Verification:**
```sql
-- Run these queries in Supabase SQL Editor to verify:

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('increment_likes', 'deduct_credits_atomic');

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'processed_webhook_events';
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

#### Test 3: UUID Validation (CRIT-3)
1. Try to sign up with URL: `/auth/callback?itineraryId=<script>alert(1)</script>`
2. **Expected:** Script should not execute, itineraryId should be ignored
3. Try with: `/auth/callback?itineraryId=../../etc/passwd`
4. **Expected:** Path traversal attempt should be blocked

#### Test 4: Search Pattern (CRIT-4)
1. Search for destinations with input: `%`
2. **Expected:** Should not return all destinations
3. Search with input: `Paris%`
4. **Expected:** Should treat `%` as literal character, not wildcard

#### Test 5: Webhook Idempotency (CRIT-5)
1. Use Stripe CLI to send a test webhook
2. Send the same webhook again
3. **Expected:** Second webhook should return `already_processed`
4. Check database: `SELECT * FROM processed_webhook_events`
5. **Expected:** Event should appear only once

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

- [ ] Database migration executed successfully
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in all environments
- [ ] Code deployed to production
- [ ] Test 1 (Likes) passed
- [ ] Test 2 (Credits) passed
- [ ] Test 3 (UUID validation) passed
- [ ] Test 4 (Search patterns) passed
- [ ] Test 5 (Webhooks) passed
- [ ] No error rate increase detected
- [ ] No negative credit balances found
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

✅ **What you did:**
- Deployed atomic database operations to prevent race conditions
- Added UUID validation to prevent injection attacks
- Added LIKE pattern escaping to prevent SQL injection
- Added webhook idempotency to prevent duplicate processing

✅ **Why it matters:**
- Users can no longer bypass payment through race conditions
- Auth system is protected from malicious redirects
- Search is protected from pattern injection
- Payment webhooks are protected from duplicate processing

✅ **What's next:**
- Monitor the system for 24-48 hours
- Address remaining HIGH priority items (see SECURITY_IMPROVEMENTS.md)
- Implement comprehensive integration tests

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Verified By:** ___________  
**Status:** ___________

