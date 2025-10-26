# Quick Guide: Apply Security Fixes

Follow these steps to resolve the 5 Supabase Security Advisor warnings.

## Step 1: Apply Database Migration (Fixes 3 warnings)

### Option A: Via Supabase Dashboard (Easiest)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of: `supabase/migrations/014_fix_function_search_path_security.sql`
5. Click **RUN** (or press Ctrl+Enter)
6. ✅ You should see "Success. No rows returned"

### Option B: Via Supabase CLI
```bash
cd travel-planner
supabase db push
```

---

## Step 2: Enable Leaked Password Protection (Fixes 1 warning)

1. Open Supabase Dashboard
2. Go to **Authentication** → **Settings**
3. Scroll to **"Security and Protection"** section
4. Find **"Leaked Password Protection"**
5. Toggle it **ON**
6. Click **Save**
7. ✅ Done! (Takes 30 seconds)

---

## Step 3: Enable Additional MFA Option (Fixes 1 warning)

1. Open Supabase Dashboard
2. Go to **Authentication** → **Settings**  
3. Scroll to **"Multi-Factor Authentication"** section
4. Enable **WebAuthn**:
   - Toggle **WebAuthn** to ON
   - No additional configuration needed
5. Click **Save**
6. ✅ Done! (Takes 30 seconds)

---

## Step 4: Verify Fixes

1. Go back to **Database** → **Advisors** → **Security Advisor**
2. Click **Refresh**
3. You should now see:
   - ✅ **0 errors**
   - ✅ **0 warnings** (or at most 2 if you skipped MFA)
   - ✅ **0 suggestions**

---

## Troubleshooting

### Migration fails with "function already exists"
This is fine - it means the functions exist. The migration uses `CREATE OR REPLACE` so it should still work.

### "Leaked Password Protection" option not available
- Check your Supabase plan - this feature might require a paid plan
- If on free tier, you can skip this (low impact)

### "WebAuthn" option not available
- Check your Supabase version - update if needed
- Alternative: Enable phone-based MFA (requires SMS provider setup)

---

## Total Time Required

⏱️ **5-10 minutes** to fix all warnings

- Step 1 (Migration): 2 minutes
- Step 2 (Leaked Passwords): 1 minute  
- Step 3 (MFA): 1 minute
- Step 4 (Verify): 1 minute

---

## Need More Details?

See `SUPABASE_SECURITY_FIXES.md` for:
- Detailed explanations of each warning
- Why these fixes matter
- Additional security recommendations
- Testing procedures

