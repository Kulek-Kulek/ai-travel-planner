# 🧪 Testing Guide - Itinerary Save & Gallery Feature

## ⚠️ **BEFORE YOU START**

### **1. Apply Database Migration**
Go to Supabase Dashboard → SQL Editor and run `supabase/migrations/002_create_itineraries.sql`

✅ You should see: "Success. No rows returned"

### **2. Start Dev Server**
```bash
npm run dev
```

App should be running at: http://localhost:3000

---

## 🎯 **Testing Scenarios**

### **Scenario 1: Anonymous User - Generate & View Itinerary** 👤

**Goal:** Test that anonymous users can generate and save public itineraries

#### Steps:

1. **Open Homepage** (http://localhost:3000)
   - [ ] You should see a hero section: "✈️ AI Travel Planner"
   - [ ] You should see the form on the left
   - [ ] You should see "Your Itinerary" preview on the right
   - [ ] Below, you should see "Explore Itineraries" (empty if first time)

2. **Generate Your First Itinerary**
   - [ ] Fill in the form:
     - Destination: `Paris`
     - Days: `3`
     - Travelers: `2`
     - Notes: `We love art museums and romantic cafes`
   - [ ] Click "✨ Generate Itinerary"
   - [ ] You should see a loading toast: "AI is generating your itinerary..."
   - [ ] Wait 10-20 seconds (AI is working!)

3. **Check the Results**
   - [ ] Success toast appears: "Itinerary generated and saved!"
   - [ ] Preview shows on the right side
   - [ ] You see: Paris itinerary with first 2 days
   - [ ] Tags appear below (e.g., "paris", "france", "3-5 days", "couple", "art", "romantic")
   - [ ] Green box says: "✅ Itinerary saved!"
   - [ ] "View Full Itinerary →" link is visible

4. **View Full Itinerary**
   - [ ] Click "View Full Itinerary →"
   - [ ] You're redirected to `/itinerary/[id]`
   - [ ] Full itinerary displays all 3 days
   - [ ] Each day shows multiple places with descriptions and times
   - [ ] Tags are displayed at the top
   - [ ] Notes section shows your input

5. **Check Public Gallery**
   - [ ] Click "← Back to Home"
   - [ ] Scroll down to "Explore Itineraries"
   - [ ] Your Paris itinerary appears as a card
   - [ ] Card shows: destination, days, travelers, preview text, tags
   - [ ] Click the card → goes to detail page

---

### **Scenario 2: Tag Filtering** 🏷️

**Goal:** Test tag-based filtering

#### Steps:

1. **Generate Multiple Itineraries** (while still anonymous)
   - [ ] Generate: Rome, 5 days, 1 traveler, "I'm traveling solo and love history"
   - [ ] Generate: Tokyo, 7 days, 4 travelers, "Family trip with kids"
   - [ ] Generate: Barcelona, 2 days, 2 travelers, "Weekend getaway, beach and food"

2. **Check Tag Filter UI**
   - [ ] Scroll to gallery section
   - [ ] You should see a "Filter by Tags" section
   - [ ] Top 15 most common tags appear as clickable buttons
   - [ ] Tags might include: paris, rome, tokyo, barcelona, solo, couple, family, weekend, 3-5 days, history, art, food, etc.

3. **Test Filtering**
   - [ ] Click on "solo" tag
   - [ ] Gallery should filter to show only Rome itinerary
   - [ ] "Filtered Itineraries (1)" appears
   - [ ] "Clear (1)" button appears
   - [ ] Click another tag (e.g., "3-5 days")
   - [ ] Gallery shows Rome + Paris (if both match)
   - [ ] Click "Clear" → all itineraries reappear

4. **Test Multiple Tags**
   - [ ] Click "couple" tag
   - [ ] Click "weekend" tag
   - [ ] Gallery shows only itineraries matching BOTH tags
   - [ ] Selected tags are highlighted in blue

---

### **Scenario 3: Authentication & My Plans** 🔐

**Goal:** Test authenticated user features

#### Steps:

1. **Sign Up**
   - [ ] Click "Sign Up" in navigation
   - [ ] Fill form:
     - Full Name: `Test User`
     - Email: `test@example.com`
     - Password: `password123`
   - [ ] Click "Sign Up"
   - [ ] You're redirected to homepage
   - [ ] Navigation shows: "test@example.com" and "Sign Out"
   - [ ] "My Plans" link appears in nav

2. **Generate Itinerary as Authenticated User**
   - [ ] Generate a new itinerary (e.g., London, 4 days)
   - [ ] Itinerary is saved (toast confirmation)
   - [ ] This itinerary is now linked to your account

3. **Access "My Plans" Dashboard**
   - [ ] Click "My Plans" in navigation
   - [ ] You're redirected to `/my-plans`
   - [ ] You see all YOUR itineraries (including the London one you just created)
   - [ ] Anonymous itineraries you created earlier are NOT here (they don't belong to your account)

4. **Test Privacy Toggle**
   - [ ] Find your London itinerary card
   - [ ] You should see badge: "🌍 Public"
   - [ ] Click the "🌍" button (privacy toggle)
   - [ ] Badge changes to "🔒 Private"
   - [ ] Toast appears: "Itinerary is now private"
   - [ ] Go back to homepage (click logo)
   - [ ] Scroll to gallery
   - [ ] Your London itinerary should NOT appear in public gallery anymore
   - [ ] Go back to "My Plans"
   - [ ] London itinerary is still there (visible to you only)

5. **Toggle Back to Public**
   - [ ] Click the "🔒" button
   - [ ] Badge changes to "🌍 Public"
   - [ ] Toast: "Itinerary is now public"
   - [ ] Check homepage gallery → London reappears

6. **Test Delete**
   - [ ] In "My Plans", click the "🗑️" (delete) button
   - [ ] Confirmation dialog appears: "Are you sure you want to delete..."
   - [ ] Click "OK"
   - [ ] Toast: "Itinerary deleted"
   - [ ] Itinerary disappears from list
   - [ ] Check homepage gallery → it's gone from there too

---

### **Scenario 4: Protected Routes** 🚧

**Goal:** Test that `/my-plans` is protected

#### Steps:

1. **Sign Out**
   - [ ] Click "Sign Out" button
   - [ ] You're signed out

2. **Try to Access My Plans**
   - [ ] Manually go to: http://localhost:3000/my-plans
   - [ ] You should be redirected to `/sign-in`
   - [ ] Middleware is working correctly!

3. **Sign In**
   - [ ] Sign in with your test credentials
   - [ ] You're redirected back
   - [ ] "My Plans" link is accessible again

---

### **Scenario 5: AI Tagging Accuracy** 🤖

**Goal:** Test that AI generates relevant tags

#### Steps:

1. **Generate with Specific Keywords**
   - [ ] Create itinerary with notes: "Budget travel, backpacking, hostels, street food"
   - [ ] Check tags → should include: "budget", "solo" (if 1 traveler), "food"
   
2. **Generate Family Trip**
   - [ ] Create itinerary with notes: "Family trip with 2 kids, child-friendly activities"
   - [ ] Check tags → should include: "family", "family-friendly"

3. **Generate Luxury Trip**
   - [ ] Create itinerary with notes: "Luxury hotels, fine dining, spa"
   - [ ] Check tags → should include: "luxury", "food"

4. **Generate Adventure Trip**
   - [ ] Create itinerary with notes: "Hiking, outdoor activities, nature"
   - [ ] Check tags → should include: "adventure", "nature"

---

### **Scenario 6: Edge Cases** ⚠️

**Goal:** Test error handling and edge cases

#### Steps:

1. **Test Empty Gallery**
   - [ ] If gallery is empty, you should see:
     - "🗺️" icon
     - "No itineraries found"
     - "Be the first to create an itinerary!"

2. **Test Filtered Empty State**
   - [ ] Select a tag that has no matches
   - [ ] You should see:
     - "No itineraries found"
     - "Try adjusting your filters..."
     - "Clear Filters" button

3. **Test Invalid Itinerary ID**
   - [ ] Go to: http://localhost:3000/itinerary/invalid-id-123
   - [ ] You should see a 404 page (Next.js default)

4. **Test Form Validation**
   - [ ] Try to submit empty form → validation errors
   - [ ] Try 0 days → "Must be at least 1 day"
   - [ ] Try 100 days → "Cannot exceed 30 days"

---

## ✅ **Testing Checklist Summary**

### Anonymous User:
- [x] Generate itinerary
- [x] View full itinerary
- [x] See itinerary in public gallery
- [x] Filter gallery by tags
- [x] Multiple tag filtering

### Authenticated User:
- [x] Sign up
- [x] Generate itinerary (saved to account)
- [x] Access "My Plans"
- [x] Toggle privacy (public ↔ private)
- [x] Delete itinerary
- [x] Private itineraries don't show in public gallery

### AI Tagging:
- [x] Tags generated automatically
- [x] Tags are relevant to content
- [x] Fallback tagging works (if AI fails)

### Security:
- [x] `/my-plans` is protected (redirects to sign-in)
- [x] Can't edit/delete other users' itineraries
- [x] Private itineraries are only visible to owner

### UI/UX:
- [x] Loading states work
- [x] Toasts appear for all actions
- [x] Empty states display correctly
- [x] Form validation works
- [x] Responsive design (test on mobile view)

---

## 🐛 **Found a Bug?**

If you encounter any issues:

1. **Check Console** (F12 → Console tab)
   - Look for errors (red text)
   - Copy error message

2. **Check Network Tab** (F12 → Network tab)
   - Look for failed requests (red)
   - Check status codes

3. **Common Issues:**
   - **"Failed to save"** → Did you run the migration?
   - **"Not authenticated"** → Sign in first
   - **Tags not showing** → Check browser console for AI errors
   - **Gallery empty** → Generate at least one itinerary first

---

## 🎉 **When Testing is Complete**

If everything works:
1. ✅ Features are ready for code review
2. ✅ You can merge the PR
3. ✅ Deploy to production!

If you find bugs:
1. Note what doesn't work
2. Check error messages
3. Let me know - I'll help fix them!

---

**Happy Testing! 🚀**

