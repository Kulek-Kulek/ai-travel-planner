# Debug: Creator Name Not Showing

## Step 1: Check if itineraries have user_id

Run this in Supabase SQL Editor:

```sql
SELECT 
  id,
  destination,
  user_id,
  created_at,
  status
FROM itineraries
WHERE is_private = false
  AND status = 'published'
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**
- If `user_id` is NULL → Those are anonymous itineraries (no name will show)
- If `user_id` has a UUID → Should have a name

---

## Step 2: Check if profiles exist with names

```sql
SELECT 
  id,
  email,
  full_name,
  created_at
FROM profiles
ORDER BY created_at DESC;
```

**What to look for:**
- If `full_name` is NULL → Profile exists but name is empty
- If `full_name` has a value → Should show on cards

---

## Step 3: Test with a new itinerary

1. ✅ Make sure you're logged in
2. ✅ Create a new itinerary
3. ✅ Check if it appears in gallery with "by [YourName]"

---

## Quick Fix: If profile exists but name is empty

Run this to update your profile:

```sql
UPDATE profiles
SET full_name = 'YourNameHere'
WHERE id = auth.uid();
```

---

## Expected Result:

Cards should show:
```
┌─────────────────────────┐
│  Paris                  │
│  📅 7 days              │
│  ─────────────────────  │
│  12/20/2024             │
│  by Kris   View Details→│  ← This line
└─────────────────────────┘
```

If `creator_name` is NULL or user_id is NULL, the "by [name]" line won't appear.


