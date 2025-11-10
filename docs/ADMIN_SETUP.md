# 🛡️ Admin Role Setup Guide

## Overview

The admin system allows designated users to manage ALL itineraries (public and private) across the entire platform.

---

## 🚀 Setup Instructions

### **Step 1: Run Database Migration**

Run the migration to add admin role support:

**Option A: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Open `travel-planner/supabase/migrations/005_add_admin_role.sql`
3. Copy all SQL code
4. Paste into SQL Editor
5. Click "Run"

**Option B: Using CLI**
```bash
cd travel-planner
npx supabase db push
```

---

### **Step 2: Make a User Admin**

You need to manually set a user's role to 'admin' in the database.

**Method 1: Supabase Dashboard (Easiest)**

1. Go to: https://supabase.com/dashboard → Your Project → **Table Editor**
2. Select the **`profiles`** table
3. Find your user (search by email)
4. Click on the **`role`** column for that user
5. Change from `user` to `admin`
6. Save

**Method 2: SQL Query**

Run this in Supabase SQL Editor (replace with your email):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

**Method 3: Using User ID**

If you know your user ID:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id-here';
```

---

## ✅ Verify Admin Access

1. **Sign in** with the admin account
2. **Check the navigation bar** - you should see a **"🛡️ Admin"** link in red
3. **Click "Admin"** to access the admin dashboard
4. ✅ You should see all itineraries across the platform

---

## 🎯 Admin Capabilities

### **Full Access to All Itineraries:**
- ✅ View ALL itineraries (public + private + anonymous)
- ✅ Delete ANY itinerary
- ✅ Change privacy (make public ↔ private)
- ✅ View user information
- ✅ See dashboard statistics

### **Admin Dashboard Features:**

#### **Statistics Cards:**
- Total Itineraries
- Public Itineraries
- Private Itineraries
- Anonymous Itineraries
- Total Users

#### **Filters:**
- All
- Public only
- Private only
- Anonymous only

#### **Actions per Itinerary:**
- View (opens itinerary detail page)
- Make Public / Make Private (toggle)
- Delete (with confirmation)

---

## 🔐 Security Features

### **Database Level:**
- ✅ RLS policies check admin role on every query
- ✅ Admin status verified server-side
- ✅ Role stored in profiles table
- ✅ Cannot be bypassed via client

### **Application Level:**
- ✅ `requireAdmin()` function checks every admin action
- ✅ Protected routes redirect non-admins
- ✅ Admin links only visible to admins

### **Admin Functions:**
```typescript
// Check if user is admin
await isAdmin() // returns boolean

// Get user role
await getUserRole() // returns 'user' | 'admin' | null

// Require admin (throws if not admin)
await requireAdmin() // throws error if not admin
```

---

## 📊 Admin Dashboard

### **URL:**
http://localhost:3000/admin/itineraries

### **What You'll See:**

```
┌─────────────────────────────────────────────────────┐
│  🛡️ Admin Dashboard                                 │
│  Manage all itineraries across the platform         │
├─────────────────────────────────────────────────────┤
│  Stats Cards:                                        │
│  [Total: 150] [Public: 120] [Private: 20]          │
│  [Anonymous: 10] [Users: 45]                        │
├─────────────────────────────────────────────────────┤
│  Filters: [All] [Public] [Private] [Anonymous]     │
├─────────────────────────────────────────────────────┤
│  Itineraries Table:                                 │
│  Destination | Days | User | Privacy | Actions     │
│  Rome        | 3    | john | Public  | [Toggle][Del]│
│  Paris       | 5    | jane | Private | [Toggle][Del]│
│  ...                                                 │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Admin Access

### **Test 1: Admin Can View Private Plans**
1. **Sign in as regular user**
2. Create a **private** itinerary
3. **Sign out**
4. **Sign in as admin**
5. Go to **Admin Dashboard**
6. Filter by **"Private"**
7. ✅ You should see the private itinerary

### **Test 2: Admin Can Delete Any Plan**
1. **Go to Admin Dashboard**
2. Find any itinerary
3. **Click "Delete"**
4. Confirm by typing destination
5. ✅ Itinerary deleted
6. ✅ Regular user can no longer see it

### **Test 3: Admin Can Toggle Privacy**
1. **Go to Admin Dashboard**
2. Find a **public** itinerary
3. **Click "Make Private"**
4. ✅ Itinerary becomes private
5. ✅ No longer appears in public gallery
6. **Click "Make Public"** to revert

### **Test 4: Non-Admin Cannot Access**
1. **Sign in as regular user** (not admin)
2. Try to access: `/admin/itineraries`
3. ✅ Should redirect or show "Access Denied"
4. ✅ Admin link not visible in navigation

---

## 🔄 Removing Admin Access

To revoke admin access from a user:

```sql
UPDATE profiles 
SET role = 'user' 
WHERE email = 'user-email@example.com';
```

Or via Supabase Dashboard → profiles table → change role back to `user`.

---

## 📝 Database Schema

### **profiles table:**
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  ...
);
```

### **RLS Policies Added:**
```sql
-- Admins can view ALL itineraries
CREATE POLICY "Admins can view all itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Admins can update ALL itineraries
CREATE POLICY "Admins can update all itineraries" ...

-- Admins can delete ALL itineraries
CREATE POLICY "Admins can delete all itineraries" ...
```

---

## 🎨 UI Indicators

### **Navigation:**
- Regular users see: "My Plans" | "Profile"
- Admin users see: "My Plans" | "Profile" | **"🛡️ Admin"** (in red)

### **Dashboard:**
- Clean table view
- Color-coded privacy badges
- Quick action buttons
- Real-time stats

---

## 🐛 Troubleshooting

### **Admin link not showing:**
- ✅ Check: Is user role set to 'admin' in profiles table?
- ✅ Sign out and sign in again
- ✅ Hard refresh browser (Ctrl+Shift+R)

### **Cannot access admin dashboard:**
- ✅ Verify role in database: `SELECT role FROM profiles WHERE email = 'your-email';`
- ✅ Check migration ran successfully
- ✅ Clear browser cache

### **Admin actions failing:**
- ✅ Check browser console for errors
- ✅ Verify RLS policies are in place
- ✅ Check server logs

---

## ⚠️ Important Notes

1. **First Admin:** You must manually set the first admin via database
2. **Security:** Keep admin credentials secure
3. **Backups:** Always backup database before bulk deleting
4. **Logging:** Consider adding audit logs for admin actions (future feature)
5. **Multiple Admins:** You can have multiple admin users

---

## 🚀 Quick Start Checklist

- [ ] Run migration `005_add_admin_role.sql`
- [ ] Update your user role to 'admin' in database
- [ ] Sign out and sign in
- [ ] Check for "🛡️ Admin" link in navigation
- [ ] Access admin dashboard
- [ ] Test viewing all itineraries
- [ ] Test deleting/editing capabilities

---

**Your admin panel is ready! You now have full control over all itineraries on the platform.** 🛡️

