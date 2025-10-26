# Supabase Security Advisor Fixes

This document explains how to resolve the security warnings from Supabase Security Advisor.

## ✅ Fixed via Migration

### 1. Function Search Path Mutable (3 warnings) - FIXED

**Issue:** Database functions `handle_new_user()`, `handle_profiles_updated_at()`, and `handle_itineraries_updated_at()` didn't have a fixed search path, which could lead to search path injection attacks.

**Fix:** Applied migration `014_fix_function_search_path_security.sql` which:
- Added `SECURITY DEFINER` to all trigger functions
- Set fixed `search_path = public` to prevent injection attacks
- Added proper function documentation

**To apply:**
```bash
# In Supabase SQL Editor, run:
# migrations/014_fix_function_search_path_security.sql
```

---

## ⚙️ Requires Dashboard Configuration

### 2. Leaked Password Protection Disabled - AUTH SETTING

**Issue:** Supabase's leaked password protection is currently disabled. This feature checks if users are using passwords that have been exposed in data breaches (from databases like "Have I Been Pwned").

**Impact:** Medium - Users might unknowingly use compromised passwords.

**Fix - Option A (Recommended):** Enable in Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **Authentication** → **Settings** → **Security and Protection**
3. Find **"Leaked Password Protection"**
4. Toggle it **ON**

**Fix - Option B:** Via Supabase CLI (if you have access)
```bash
# Update auth config
supabase auth update --enable-password-leak-protection
```

**Effect:** When enabled, Supabase will:
- Check new passwords against known breach databases
- Reject passwords that have been leaked
- Suggest users choose a different password

---

### 3. Insufficient MFA Options - AUTH SETTING

**Issue:** The project has too few multi-factor authentication (MFA) options enabled.

**Current MFA options:** Likely only TOTP (Time-based One-Time Password)

**Impact:** Low-Medium - More MFA options provide better security and user choice.

**Fix:** Enable additional MFA methods in Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Authentication** → **Settings** → **Multi-Factor Authentication**
3. Enable additional MFA methods:
   - ✅ **TOTP (Authenticator apps)** - Already enabled
   - ☐ **SMS** - Requires phone number provider (Twilio, etc.)
   - ☐ **WebAuthn** - Biometric/hardware keys (recommended)

**Recommended MFA Options:**

#### **WebAuthn (Recommended)**
Best security, no additional cost, works with:
- Face ID / Touch ID (mobile)
- Windows Hello
- Hardware security keys (YubiKey, etc.)

**To enable WebAuthn:**
1. In Supabase Dashboard → Authentication → Settings → MFA
2. Toggle **WebAuthn** to ON
3. No additional configuration needed

#### **SMS (Optional)**
Requires SMS provider setup (costs may apply):
- Twilio
- MessageBird
- AWS SNS

**Note:** SMS MFA has additional costs and is less secure than WebAuthn.

---

## Summary of Actions

| Warning | Severity | Fix Method | Status |
|---------|----------|------------|--------|
| Function Search Path Mutable (×3) | Medium | ✅ Migration | Ready to apply |
| Leaked Password Protection | Medium | ⚙️ Dashboard setting | Requires manual config |
| Insufficient MFA Options | Low-Medium | ⚙️ Dashboard setting | Optional but recommended |

---

## Priority Recommendations

### 🔴 High Priority
1. **Apply migration 014** - Fixes search path security
2. **Enable Leaked Password Protection** - Prevents compromised passwords (5 minutes)

### 🟡 Medium Priority
3. **Enable WebAuthn MFA** - Better security, no cost (5 minutes)

### 🟢 Low Priority
4. **Consider SMS MFA** - Only if users request it (costs apply)

---

## Testing After Implementation

### 1. Verify Migration Applied
In Supabase SQL Editor, run:
```sql
-- Check if functions have SECURITY DEFINER and search_path set
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as settings
FROM pg_proc 
WHERE proname LIKE 'handle_%'
  AND pronamespace = 'public'::regnamespace;
```

Expected result:
- `is_security_definer` should be `true`
- `settings` should include `{search_path=public}`

### 2. Verify Leaked Password Protection
Try signing up with a known leaked password (e.g., "password123") - it should be rejected.

### 3. Verify MFA Options
In your app's auth flow, check that enabled MFA options are available during registration/login.

---

## Questions?

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify your Supabase plan supports the feature (some features require paid plans)
3. Contact Supabase support if needed

---

## Additional Security Recommendations

While fixing these warnings, consider:

1. **Enable Email Confirmation** (if not already enabled)
   - Prevents fake email signups
   - Dashboard → Authentication → Settings → Email Confirmation

2. **Set Strong Password Requirements**
   - Dashboard → Authentication → Settings → Password Requirements
   - Minimum 8 characters (recommended 12+)
   - Require mix of uppercase, lowercase, numbers, symbols

3. **Enable Rate Limiting**
   - Prevents brute force attacks
   - Check Dashboard → Settings → Rate Limiting

4. **Review RLS Policies Regularly**
   - Ensure Row Level Security policies are correctly configured
   - Run security audits periodically

5. **Enable Audit Logging** (Pro plan)
   - Track all database and auth events
   - Useful for compliance and security monitoring

