# Security Fix: Enable RLS on deleted_users Table

## ⚠️ Issue Summary

The `deleted_users` table in your Supabase database contains **sensitive personal information** (emails, names, subscription data) but currently has **no Row-Level Security (RLS)** protection.

**Risk Level:** High  
**Exposure:** Any authenticated user could potentially query this table via the API

## 🔍 What Data is Exposed

The `deleted_users` table contains:
- User IDs and email addresses
- Full names
- Subscription tiers
- Deletion timestamps
- Usage statistics (itinerary counts, plan counts)

This is **audit trail data** that should only be accessible to administrators.

## ✅ The Fix

I've created migration `022_enable_rls_deleted_users.sql` that:

1. **Enables RLS** on the table (blocks all access by default)
2. **Creates admin-only policies** (only users with `role = 'admin'` can view)
3. **Revokes public access** (removes any default grants)
4. **Adds performance indexes** (for admin queries and analytics)

### What the Migration Does

```sql
-- 1. Enable RLS (blocks all access)
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- 2. Allow only admins to view
CREATE POLICY "Admins can view deleted users"
  ON public.deleted_users FOR SELECT
  USING (user is admin);

-- 3. Allow admins to delete old records (data retention)
CREATE POLICY "Admins can delete old deleted user records"
  ON public.deleted_users FOR DELETE
  USING (user is admin);

-- 4. Remove public access
REVOKE ALL ON public.deleted_users FROM PUBLIC;
```

### Why No INSERT Policy?

The `archive_deleted_user()` trigger function already uses `SECURITY DEFINER`, which bypasses RLS. This is correct and secure because:
- Only the database can insert records (triggered by user deletion)
- Regular users cannot insert records
- Service role operations bypass RLS automatically

## 🚀 How to Apply the Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/YOUR_PROJECT

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the sidebar
   - Click **New query**

3. **Run the Migration**
   - Open: `travel-planner/supabase/migrations/022_enable_rls_deleted_users.sql`
   - Copy all contents
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl/Cmd + Enter)

4. **Verify Success**
   You should see:
   ```
   Success. No rows returned
   ```

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
cd travel-planner
supabase db push
```

This will apply all pending migrations.

## 🧪 Testing the Fix

After applying the migration, verify it's working:

### 1. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'deleted_users';
```

Expected result:
```
tablename      | rowsecurity
---------------|------------
deleted_users  | t
```

### 2. Test as Admin

Login as an admin user, then:

```sql
SELECT * FROM deleted_users LIMIT 5;
```

✅ Should return results (if any deleted users exist)

### 3. Test as Regular User

Login as a regular user, then:

```sql
SELECT * FROM deleted_users;
```

✅ Should return empty (no access)

### 4. Check Policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'deleted_users';
```

Should show the two policies created.

## 🎯 What This Fixes

| Before | After |
|--------|-------|
| ❌ Any authenticated user could read deleted user data | ✅ Only admins can access |
| ❌ Sensitive PII exposed via API | ✅ PII protected by RLS |
| ❌ Security warning in Supabase Dashboard | ✅ No warnings |
| ❌ Non-compliant with data privacy best practices | ✅ Follows least-privilege principle |

## 📊 Impact on Your Application

### ✅ What Keeps Working

- User deletion flow (unchanged)
- The trigger that populates `deleted_users` (uses SECURITY DEFINER)
- Your admin dashboard (if it queries deleted users)
- All other tables and features

### ⚠️ What Might Break

**If you have any code that queries `deleted_users` as a non-admin user**, those queries will now return empty results.

Check these locations:
- Admin pages/dashboards
- Analytics endpoints
- Support tools

Make sure these are accessed by admin users only.

## 🔐 Best Practices Going Forward

1. **Always enable RLS on new tables** in the public schema
2. **Start with deny-all** (enable RLS first, then add policies)
3. **Use admin checks** for sensitive data:
   ```sql
   USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
   ```
4. **Test with different user roles** before deploying
5. **Add indexes** for columns used in WHERE clauses

## 📝 Additional Notes

### Why the Supabase AI Advice Was Mostly Correct

The Supabase AI's suggestions were good general advice for RLS, but here's what I tailored:

| Supabase AI Suggestion | What I Did | Why |
|------------------------|------------|-----|
| User-owned policies with `user_id` | Admin-only policies | This is an audit table, not user data |
| Allow INSERT for users | No INSERT policy | Trigger handles inserts with SECURITY DEFINER |
| Example tenant isolation | Simplified admin check | You use role-based access, not tenants |

### Service Role Access

The Supabase **service role** (used for admin operations) bypasses RLS entirely. Use it in:
- Server-side API routes
- Edge functions
- Background jobs

Never expose the service role key to the frontend!

## ❓ FAQ

**Q: Will this break user deletion?**  
A: No, the trigger uses `SECURITY DEFINER` which bypasses RLS.

**Q: Can I still query this table from my admin dashboard?**  
A: Yes, as long as the logged-in user has `role = 'admin'` in their profile.

**Q: What if I need to give support staff access?**  
A: Add a `support` role and update the policy:
```sql
WHERE profiles.role IN ('admin', 'support')
```

**Q: Should I enable RLS on other tables?**  
A: Check your Supabase Dashboard security warnings. Most tables likely already have RLS.

**Q: Can I roll this back?**  
A: Yes, but not recommended:
```sql
ALTER TABLE public.deleted_users DISABLE ROW LEVEL SECURITY;
```

## ✅ Checklist

- [ ] Read and understand this document
- [ ] Apply the migration via Supabase Dashboard or CLI
- [ ] Test with admin user (should see data)
- [ ] Test with regular user (should see no data)
- [ ] Verify Supabase Dashboard shows no warnings
- [ ] Check admin dashboard still works
- [ ] Update any documentation about database security

---

**Recommendation:** Apply this fix immediately. It's a security best practice and resolves the Supabase warning.

