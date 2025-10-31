# Fix: Admin User Management & Itinerary Gallery Access

## Issues

1. When accessing `/admin/users`:
```
Error fetching users (admin): {}
```

2. When viewing itinerary gallery (as any user):
```
❌ BROWSER: API error: {}
```

## Root Cause

The profiles table has RLS (Row Level Security) policies that only allow users to view their own profile. This blocks:
- Admins from viewing all user profiles for management
- **The itineraries API from fetching creator names** for the public gallery

## Solution

Run the updated migration 021 which:
1. Allows **anyone** (including anonymous users) to view basic profile info (names) - needed for itinerary gallery
2. Allows **admins** to update all profiles - needed for user management

---

## Steps to Fix

### ⚠️ IMPORTANT: If you already ran migration 021 before this update

First, drop the old policies:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this to remove old policies:

```sql
-- Drop old policies from first version of migration 021
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
```

### Now Apply the Updated Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor**
3. Open the migration file: `travel-planner/supabase/migrations/021_add_admin_profile_access.sql`
4. Copy all the SQL code (the UPDATED version)
5. Paste it into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. You should see: "Success. No rows returned"

### Option 2: Using Supabase CLI

```bash
cd travel-planner
npx supabase db push
```

This will apply all pending migrations, including the updated `021_add_admin_profile_access.sql`.

---

## What This Migration Does

The migration adds two new RLS policies to the `profiles` table:

### 1. Admins can view all profiles
```sql
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );
```

This allows admins to SELECT (read) all user profiles.

### 2. Admins can update all profiles
```sql
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (...)
  WITH CHECK (...);
```

This allows admins to UPDATE any profile (needed for changing user roles and tiers).

---

## Verify It Works

1. Run the migration (using one of the options above)
2. Refresh your browser on `/admin/users`
3. You should now see:
   - User statistics cards at the top
   - A table with all users
   - Ability to change roles and tiers

---

## After Migration

The admin user management page will show:

```
┌─────────────────────────────────────────────────────┐
│ Admin Dashboard - User Management                    │
├─────────────────────────────────────────────────────┤
│ Stats:                                               │
│ [Total: X] [Admins: Y] [Users: Z] [Free/Pro/Unl]   │
├─────────────────────────────────────────────────────┤
│ User Table:                                          │
│ Email        | Role ▼    | Tier ▼    | Plans | Date│
│ user@ex.com  | user      | pro       | 5     | ... │
│ admin@ex.com | admin     | unlimited | 12    | ... │
└─────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Still seeing the error after running migration?

1. **Clear your browser cache:** Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Verify migration was applied:**
   - Go to Supabase Dashboard → SQL Editor
   - Run this query:
   ```sql
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'profiles' 
   AND policyname LIKE '%Admins%';
   ```
   - You should see:
     - "Admins can view all profiles"
     - "Admins can update all profiles"

3. **Verify your admin role:**
   ```sql
   SELECT id, email, role 
   FROM profiles 
   WHERE id = auth.uid();
   ```
   - Make sure your role is `'admin'`

4. **Check for conflicting policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
   - Should show 5 policies total:
     - Users can view own profile
     - Users can update own profile
     - Users can insert own profile
     - Admins can view all profiles
     - Admins can update all profiles

---

## Security Notes

✅ **These policies are secure:**
- Only users with `role = 'admin'` can view/edit all profiles
- Regular users can still only view/edit their own profile
- The role field cannot be changed by regular users (only by admins)
- All checks are done server-side at the database level

---

**Once this migration is applied, your admin user management will work perfectly!** 🎉

