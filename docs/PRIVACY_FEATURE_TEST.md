# 🔒 Privacy Feature Testing Guide

## Overview

The privacy system ensures that **private itineraries do NOT appear in the public gallery**, while **public itineraries are visible to everyone**.

---

## ✅ How It Works

### **Default Behavior:**
- ✅ All new itineraries are **PUBLIC by default**
- ✅ Public itineraries appear in the homepage gallery
- ✅ Private itineraries are **ONLY visible to the owner** in "My Plans"

### **Database Level:**
- Row Level Security (RLS) enforces privacy at the database
- Public query: `WHERE is_private = false`
- Only authenticated users can see their own private plans

---

## 🧪 Complete Test Scenario

### **Setup: Create Test Data**

1. **Sign Out** (if signed in)
2. **Generate 2 anonymous itineraries:**
   - Paris, 3 days
   - Rome, 4 days
3. ✅ Both should appear in public gallery (they're public by default)

---

### **Test 1: Sign In and Create Private Plan**

1. **Sign In** to your account
2. **Generate a new itinerary:**
   - London, 5 days
3. ✅ London appears in public gallery (public by default)
4. **Go to "My Plans"**
5. ✅ You see London in your list with "🌍 Public" badge
6. **Click ⋮ → Make Private**
7. ✅ Toast appears:
   ```
   🔒 Itinerary is now private
   This itinerary will NOT appear in the public gallery
   ```
8. ✅ Badge changes to "🔒 Private"
9. **Go back to Homepage**
10. ✅ London is **GONE from the public gallery**
11. ✅ Only Paris and Rome are visible

---

### **Test 2: Make Private Plan Public Again**

1. **Go to "My Plans"**
2. ✅ London still shows with "🔒 Private" badge
3. **Click ⋮ → Make Public**
4. ✅ Toast appears:
   ```
   🌍 Itinerary is now public
   This itinerary will appear in the public gallery for everyone to see
   ```
5. ✅ Badge changes to "🌍 Public"
6. **Go to Homepage**
7. ✅ London is **BACK in the public gallery**
8. ✅ All three itineraries are now visible

---

### **Test 3: Anonymous Users Can't See Private Plans**

1. **Sign Out**
2. **Go to Homepage**
3. ✅ You should see all public itineraries (Paris, Rome, London if public)
4. ✅ You should **NOT see any private itineraries**
5. **Try to access a private itinerary directly:**
   - Get the ID of a private plan
   - Go to: `http://localhost:3001/itinerary/[id]`
   - ✅ Should show "Access denied" or redirect

---

### **Test 4: Other Users Can't See Your Private Plans**

1. **Sign in as User A**
2. **Create itinerary:** Tokyo, 7 days
3. **Make it private** (🔒 Make Private)
4. **Sign Out**
5. **Sign in as User B** (different account)
6. **Go to "My Plans"**
7. ✅ You should **NOT see** User A's Tokyo plan
8. **Go to Homepage**
9. ✅ Tokyo should **NOT appear** in public gallery

---

### **Test 5: Delete Public Plan**

1. **Sign in**
2. **Find a public plan** in "My Plans"
3. **Delete it** (type confirmation)
4. ✅ Toast: "Itinerary deleted successfully"
5. **Go to Homepage**
6. ✅ Deleted plan is **GONE from public gallery**
7. ✅ Gallery updates automatically (no page refresh needed)

---

### **Test 6: Delete Private Plan**

1. **Sign in**
2. **Find a private plan** in "My Plans"
3. **Delete it** (type confirmation)
4. ✅ Toast: "Itinerary deleted successfully"
5. **Go to Homepage**
6. ✅ Gallery remains unchanged (it wasn't there anyway)

---

## 📊 Expected Gallery Behavior

### **Homepage Gallery Shows:**
- ✅ All public itineraries from any user (authenticated or anonymous)
- ✅ Ordered by creation date (newest first)
- ✅ Tagged and filterable
- ❌ NO private itineraries (even from the current user)

### **"My Plans" Shows:**
- ✅ All your itineraries (public AND private)
- ✅ Privacy badge: "🌍 Public" or "🔒 Private"
- ✅ Status badge: "✅ Completed" (if marked done)
- ✅ Full CRUD operations

---

## 🔐 Privacy Matrix

| User Type | Public Plan | Private Plan |
|-----------|-------------|--------------|
| **Owner (signed in)** | ✅ See in My Plans<br>✅ See in Gallery<br>✅ Can edit/delete | ✅ See in My Plans<br>❌ NOT in Gallery<br>✅ Can edit/delete |
| **Other User (signed in)** | ✅ See in Gallery<br>❌ NOT in their My Plans<br>❌ Can't edit/delete | ❌ NOT visible anywhere<br>❌ Can't access |
| **Anonymous User** | ✅ See in Gallery<br>❌ Can't edit/delete | ❌ NOT visible anywhere<br>❌ Can't access |

---

## 🎯 Toast Messages Reference

### **Making Private:**
```
🔒 Itinerary is now private
This itinerary will NOT appear in the public gallery
```

### **Making Public:**
```
🌍 Itinerary is now public
This itinerary will appear in the public gallery for everyone to see
```

---

## 🐛 Common Issues & Solutions

### **Issue: Private plan still shows in gallery**
**Solution:**
- Hard refresh browser (Ctrl + Shift + R)
- Check privacy badge in "My Plans" - should show "🔒 Private"
- Check browser console for errors

### **Issue: Gallery doesn't update after toggling privacy**
**Solution:**
- Should update automatically via TanStack Query invalidation
- If not, refresh the page manually
- Check that QueryProvider is wrapping the app

### **Issue: Can't make plan private**
**Solution:**
- Must be signed in (anonymous users can't have private plans)
- Must own the itinerary
- Check toast for error message

---

## ✨ Auto-Refresh Feature

When you toggle privacy or delete an itinerary, the app automatically:
1. ✅ Updates "My Plans" list
2. ✅ Invalidates public gallery query
3. ✅ Refetches public gallery data
4. ✅ Updates without page refresh!

**Powered by TanStack Query mutations** 🚀

---

## 📝 Technical Details

### **Database Query (Public Gallery):**
```typescript
supabase
  .from('itineraries')
  .select('*')
  .eq('is_private', false)  // Only public itineraries
  .order('created_at', { ascending: false })
```

### **Row Level Security:**
```sql
-- Anyone can view public itineraries
create policy "Anyone can view public itineraries"
  on itineraries for select
  using (is_private = false);

-- Users can view their own private itineraries
create policy "Users can view own itineraries"
  on itineraries for select
  to authenticated
  using (auth.uid() = user_id);
```

---

## 🎉 Summary

**Privacy is enforced at multiple levels:**
1. ✅ Database RLS policies
2. ✅ Query filters (`is_private = false`)
3. ✅ Application logic
4. ✅ Clear user feedback (toast messages)
5. ✅ Auto-refresh on changes

**Private plans are truly private** - they never leak to the public gallery! 🔒

